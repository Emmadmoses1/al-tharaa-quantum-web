import { Router } from 'express'
import Joi from 'joi'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'
import { vapid, sendPush } from '../lib/push.js'

const router = Router()
router.use(requireAuth)
const bad = (res, m) => res.status(400).json({ success: false, error: { message: m, code: 'BAD_REQUEST' } })

router.get('/key', async (_req, res, next) => {
  try { const v = await vapid(); res.json({ success: true, data: { key: v?.pub || null } }) } catch (e) { next(e) }
})

router.post('/subscribe', async (req, res, next) => {
  try {
    const { value, error } = Joi.object({
      endpoint: Joi.string().uri().max(1000).required(),
      keys: Joi.object({ p256dh: Joi.string().max(300).required(), auth: Joi.string().max(100).required() }).required(),
    }).validate(req.body)
    if (error) return bad(res, error.message)
    const { error: e } = await supabase.from('push_subscriptions').upsert({
      user_id: req.user.id, endpoint: value.endpoint, p256dh: value.keys.p256dh, auth: value.keys.auth,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 200),
    }, { onConflict: 'endpoint' })
    if (e) throw e
    await supabase.from('profiles').update({ notify_push: true }).eq('id', req.user.id)
    res.json({ success: true })
  } catch (e) { next(e) }
})

router.post('/unsubscribe', async (req, res, next) => {
  try {
    const endpoint = String(req.body?.endpoint || '')
    if (endpoint) await supabase.from('push_subscriptions').delete().eq('user_id', req.user.id).eq('endpoint', endpoint)
    res.json({ success: true })
  } catch (e) { next(e) }
})

router.post('/test', async (req, res, next) => {
  try {
    const sent = await sendPush(req.user.id, { title: 'الثراء كوانتوم', body: 'الإشعارات تعمل على هذا الجهاز ✓', url: '/dashboard', tag: 'test' })
    res.json({ success: true, data: { sent } })
  } catch (e) { next(e) }
})

export default router
