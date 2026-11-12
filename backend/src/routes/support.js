import { Router } from 'express'
import Joi from 'joi'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'
import { sendMail, esc } from '../lib/mailer.js'

// A signed-in user writes to support and sees the replies. Admins are emailed when a new ticket arrives.
const router = Router()
router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('support_tickets')
      .select('id, subject, message, status, admin_reply, replied_at, created_at')
      .eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(30)
    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (err) { next(err) }
})

const schema = Joi.object({
  subject: Joi.string().trim().min(3).max(120).required(),
  message: Joi.string().trim().min(10).max(2000).required(),
})

router.post('/', async (req, res, next) => {
  try {
    const { value: v, error: ve } = schema.validate(req.body)
    if (ve) return res.status(400).json({ success: false, error: { message: ve.message, code: 'BAD_REQUEST' } })
    const since = new Date(Date.now() - 3600000).toISOString()
    const { count } = await supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('user_id', req.user.id).gte('created_at', since)
    if ((count || 0) >= 5) return res.status(429).json({ success: false, error: { message: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' } })
    const { data, error } = await supabase.from('support_tickets').insert({ user_id: req.user.id, subject: v.subject, message: v.message }).select('id').single()
    if (error) throw error
    // Tell the admins (best effort: a mail failure never blocks the ticket).
    try {
      const { data: me } = await supabase.from('profiles').select('email, full_name').eq('id', req.user.id).single()
      const { data: admins } = await supabase.from('profiles').select('email').in('role', ['admin', 'super_admin'])
      const to = [...new Set((admins || []).map(a => a.email).filter(Boolean))]
      const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#0B0B0B;color:#fff;padding:24px;border-radius:14px;border:1px solid #2a2a2a">
        <h2 style="color:#D4AF37;margin:0 0 10px">New support ticket #${data.id}</h2>
        <p style="color:#bbb;margin:0 0 8px">${esc(me?.full_name || '')} &lt;${esc(me?.email || '')}&gt;</p>
        <p style="margin:0 0 6px"><b>${esc(v.subject)}</b></p>
        <p style="line-height:1.8;margin:0;white-space:pre-wrap">${esc(v.message)}</p>
        <p style="color:#888;font-size:12px;margin:12px 0 0">Reply in Admin → Support.</p></div>`
      for (const a of to) await sendMail({ to: a, subject: `Support ticket #${data.id}: ${v.subject}`.slice(0, 120), html })
    } catch (e) { console.error('[support] admin mail failed:', e.message) }
    res.status(201).json({ success: true, data: { id: data.id } })
  } catch (err) { next(err) }
})

export default router
