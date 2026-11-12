import { Router } from 'express'
import Joi from 'joi'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'
import { sendMail, esc } from '../lib/mailer.js'

// Admin: see all tickets, reply (the user is emailed and sees it in their account) and close them.
const router = Router()
router.use(requireAdmin)
const fail = (res, status, message, code = 'BAD_REQUEST') => res.status(status).json({ success: false, error: { message, code } })

router.get('/', async (req, res, next) => {
  try {
    const status = String(req.query.status || '')
    let q = supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(100)
    if (['open', 'answered', 'closed'].includes(status)) q = q.eq('status', status)
    const { data, error } = await q
    if (error) throw error
    const ids = [...new Set((data || []).map(t => t.user_id))]
    const who = {}
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id, email, full_name').in('id', ids)
      for (const p of ps || []) who[p.id] = p
    }
    res.json({ success: true, data: (data || []).map(t => ({ ...t, email: who[t.user_id]?.email || '', name: who[t.user_id]?.full_name || '' })) })
  } catch (err) { next(err) }
})

router.post('/:id/reply', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const { value: v, error: ve } = Joi.object({ reply: Joi.string().trim().min(2).max(3000).required() }).validate(req.body)
    if (!Number.isInteger(id) || ve) return fail(res, 400, ve ? ve.message : 'Bad id')
    const { data: t } = await supabase.from('support_tickets').select('id, user_id, subject').eq('id', id).single()
    if (!t) return fail(res, 404, 'Not found', 'NOT_FOUND')
    const now = new Date().toISOString()
    const { error } = await supabase.from('support_tickets').update({ admin_reply: v.reply, status: 'answered', replied_by: req.user.id, replied_at: now, updated_at: now }).eq('id', id)
    if (error) throw error
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'SUPPORT_REPLY', entity: 'support_tickets', metadata: { ticket: id } })
    try {
      const { data: u } = await supabase.from('profiles').select('email, full_name').eq('id', t.user_id).single()
      if (u?.email) await sendMail({ to: u.email, subject: `رد الدعم على: ${t.subject}`.slice(0, 120), html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#0B0B0B;color:#fff;padding:26px;border-radius:14px;border:1px solid #2a2a2a">
        <h2 style="color:#D4AF37;margin:0 0 10px" dir="rtl">مرحباً ${esc(u.full_name || '')}</h2>
        <p dir="rtl" style="color:#bbb;margin:0 0 8px">ردّ فريق الدعم على رسالتك: <b>${esc(t.subject)}</b></p>
        <p dir="rtl" style="line-height:1.9;margin:0;white-space:pre-wrap;background:#141414;padding:12px;border-radius:8px">${esc(v.reply)}</p>
        <p dir="rtl" style="color:#888;font-size:12px;margin:12px 0 0">يمكنك أيضاً رؤية الرد داخل حسابك في صفحة الدعم.</p></div>` })
    } catch (e) { console.error('[support] user mail failed:', e.message) }
    res.json({ success: true, data: { ok: true } })
  } catch (err) { next(err) }
})

router.post('/:id/close', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return fail(res, 400, 'Bad id')
    const { error } = await supabase.from('support_tickets').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
    res.json({ success: true, data: { ok: true } })
  } catch (err) { next(err) }
})

export default router
