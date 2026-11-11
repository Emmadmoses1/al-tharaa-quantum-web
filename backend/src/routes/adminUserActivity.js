import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'
import { logEvent } from '../lib/client.js'
import { sendMail, esc } from '../lib/mailer.js'

const router = Router()
router.use(requireAdmin)
const bad = (res, s, m) => res.status(s).json({ success: false, error: { message: m, code: 'BAD_REQUEST' } })
const UUID = /^[0-9a-f-]{36}$/i

function canModerate(req, res) {
  if (!['admin', 'super_admin'].includes(req.userRole)) { res.status(403).json({ success: false, error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } }); return false }
  return true
}

// Selfies waiting for review, oldest first.
router.get('/face-queue', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('profiles').select('id, email, full_name, avatar_url, face_submitted_at')
      .eq('face_status', 'pending').order('face_submitted_at', { ascending: true }).limit(50)
    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (err) { next(err) }
})

// Everything an admin needs to review one user: profile, selfie, devices, linked accounts and a merged activity timeline.
router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id
    if (!UUID.test(id)) return bad(res, 400, 'Bad id')
    const { data: profile } = await supabase.from('profiles')
      .select('id, email, full_name, phone, role, kyc_status, avatar_url, country, signup_ip, account_status, suspended_reason, suspended_at, flagged, flag_reason, created_at, last_seen_at, face_status, face_path, face_challenge, face_submitted_at, face_reject_reason, face_required').eq('id', id).single()
    if (!profile) return res.status(404).json({ success: false, error: { message: 'User not found', code: 'NOT_FOUND' } })

    // Selfies are private: the admin gets a link that stops working after 5 minutes.
    let face_url = null
    if (profile.face_path) {
      const { data: s } = await supabase.storage.from('face-verifications').createSignedUrl(profile.face_path, 300)
      face_url = s?.signedUrl || null
    }
    const { face_path: _fp, ...publicProfile } = profile

    const [ev, dep, wd, tr, dev] = await Promise.all([
      supabase.from('user_events').select('type, ip, country, meta, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(40),
      supabase.from('deposits').select('asset, network, amount, status, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('withdrawals').select('asset, network, amount, status, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('trades').select('asset, side, amount_usdt, status, realized_pnl, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('device_accounts').select('device_id, ip, first_seen, last_seen').eq('user_id', id),
    ])
    const devIds = (dev.data || []).map(d => d.device_id)
    let linked = []
    if (devIds.length) {
      const { data: same } = await supabase.from('device_accounts').select('user_id').in('device_id', devIds).neq('user_id', id)
      const ids = [...new Set((same || []).map(s => s.user_id))]
      if (ids.length) linked = (await supabase.from('profiles').select('id, email, full_name, account_status').in('id', ids)).data || []
    }
    const timeline = [
      ...(ev.data || []).map(e => ({ kind: 'event', title: e.type, detail: [e.country, e.ip].filter(Boolean).join(' · '), at: e.created_at })),
      ...(dep.data || []).map(d => ({ kind: 'deposit', title: `Deposit ${d.asset} (${d.network})`, detail: `${d.amount ?? '—'} · ${d.status}`, at: d.created_at })),
      ...(wd.data || []).map(w => ({ kind: 'withdrawal', title: `Withdrawal ${w.asset} (${w.network})`, detail: `${w.amount} · ${w.status}`, at: w.created_at })),
      ...(tr.data || []).map(t => ({ kind: 'trade', title: `Trade ${t.asset} ${String(t.side).toUpperCase()}`, detail: `${t.amount_usdt} USDT · ${t.status}${t.status === 'closed' ? ` · PnL ${Number(t.realized_pnl || 0).toFixed(2)}` : ''}`, at: t.created_at })),
    ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 60)
    res.json({ success: true, data: { profile: { ...publicProfile, face_url }, devices: dev.data || [], linked, timeline } })
  } catch (err) { next(err) }
})

// Approve or reject a user's selfie. The user is told by email.
router.post('/:id/face', async (req, res, next) => {
  try {
    if (!canModerate(req, res)) return
    const id = req.params.id
    if (!UUID.test(id)) return bad(res, 400, 'Bad id')
    const decision = req.body?.decision
    if (!['approve', 'reject'].includes(decision)) return bad(res, 400, 'Bad decision')
    const reason = String(req.body?.reason || '').trim().slice(0, 200) || 'The photo was not clear enough.'
    const { data: p } = await supabase.from('profiles').select('email, full_name, face_status').eq('id', id).single()
    if (!p) return res.status(404).json({ success: false, error: { message: 'User not found', code: 'NOT_FOUND' } })
    if (p.face_status === 'none') return bad(res, 400, 'This user has not submitted a selfie')

    const approved = decision === 'approve'
    await supabase.from('profiles').update({
      face_status: approved ? 'approved' : 'rejected', face_reviewed_at: new Date().toISOString(), face_reject_reason: approved ? null : reason,
    }).eq('id', id)
    await logEvent(supabase, id, approved ? 'face_approved' : 'face_rejected', req, { by: req.user.id, reason: approved ? undefined : reason })

    sendMail({
      to: p.email, subject: approved ? 'تم التحقق من وجهك | Face verified' : 'يرجى إعادة التقاط صورتك | Please retake your selfie',
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#0B0B0B;color:#fff;padding:26px;border-radius:14px;border:1px solid #2a2a2a">
        <h2 style="color:#D4AF37;margin:0 0 10px" dir="rtl">مرحباً ${esc(p.full_name || '')}</h2>
        ${approved
          ? '<p dir="rtl" style="line-height:1.9">تم قبول التحقق من وجهك. يمكنك الآن استخدام جميع خدمات الحساب بما فيها السحب.</p><p dir="ltr" style="color:#999;font-size:12px">Your face verification was approved. You can now use every feature, including withdrawals.</p>'
          : `<p dir="rtl" style="line-height:1.9">لم نتمكن من قبول صورتك. السبب: ${esc(reason)}<br>افتح حسابك واختر «التحقق من الوجه» لإعادة المحاولة.</p><p dir="ltr" style="color:#999;font-size:12px">We could not accept your selfie. Reason: ${esc(reason)}. Open your account and choose “Verify your face” to try again.</p>`}
      </div>`,
    }).catch(() => {})

    res.json({ success: true, data: { ok: true } })
  } catch (err) { next(err) }
})

router.post('/:id/suspend', async (req, res, next) => {
  try {
    if (!canModerate(req, res)) return
    const id = req.params.id
    if (!UUID.test(id) || id === req.user.id) return bad(res, 400, 'Not allowed')
    const { data: t } = await supabase.from('profiles').select('role').eq('id', id).single()
    if (!t) return res.status(404).json({ success: false, error: { message: 'User not found', code: 'NOT_FOUND' } })
    if (t.role !== 'user') return bad(res, 400, 'Only regular user accounts can be suspended')
    const reason = String(req.body?.reason || 'Suspended by admin').slice(0, 200)
    await supabase.from('profiles').update({ account_status: 'suspended', suspended_reason: reason, suspended_at: new Date().toISOString() }).eq('id', id)
    await supabase.auth.admin.updateUserById(id, { ban_duration: '876000h' })
    await logEvent(supabase, id, 'suspended', req, { by: req.user.id, reason })
    res.json({ success: true, data: { ok: true } })
  } catch (err) { next(err) }
})

router.post('/:id/unsuspend', async (req, res, next) => {
  try {
    if (!canModerate(req, res)) return
    const id = req.params.id
    if (!UUID.test(id)) return bad(res, 400, 'Bad id')
    await supabase.from('profiles').update({ account_status: 'active', suspended_reason: null, suspended_at: null, flagged: false, flag_reason: null }).eq('id', id)
    await supabase.auth.admin.updateUserById(id, { ban_duration: 'none' })
    await logEvent(supabase, id, 'unsuspended', req, { by: req.user.id })
    res.json({ success: true, data: { ok: true } })
  } catch (err) { next(err) }
})

export default router
