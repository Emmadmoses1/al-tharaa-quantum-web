import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'
import { logEvent } from '../lib/client.js'

const router = Router()
router.use(requireAdmin)
const bad = (res, s, m) => res.status(s).json({ success: false, error: { message: m, code: 'BAD_REQUEST' } })
const UUID = /^[0-9a-f-]{36}$/i

// Everything an admin needs to review one user: profile, devices, linked accounts and a merged activity timeline.
router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id
    if (!UUID.test(id)) return bad(res, 400, 'Bad id')
    const { data: profile } = await supabase.from('profiles')
      .select('id, email, full_name, phone, role, kyc_status, avatar_url, country, signup_ip, account_status, suspended_reason, suspended_at, flagged, flag_reason, created_at, last_seen_at').eq('id', id).single()
    if (!profile) return res.status(404).json({ success: false, error: { message: 'User not found', code: 'NOT_FOUND' } })

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
    res.json({ success: true, data: { profile, devices: dev.data || [], linked, timeline } })
  } catch (err) { next(err) }
})

function canModerate(req, res) {
  if (!['admin', 'super_admin'].includes(req.userRole)) { res.status(403).json({ success: false, error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } }); return false }
  return true
}

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
