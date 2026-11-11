import { Router } from 'express'
import Joi from 'joi'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'

const router = Router()
router.use(requireAuth)
const MAX_ACTIVE = 10
const fail = (res, status, message, code) => res.status(status).json({ success: false, error: { message, code } })

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('price_alerts').select('id, asset, direction, target, active, created_at, triggered_at')
      .eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(30)
    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (err) { next(err) }
})

const schema = Joi.object({
  asset: Joi.string().valid('BTC', 'ETH').required(),
  direction: Joi.string().valid('above', 'below').required(),
  target: Joi.number().positive().max(100000000).required(),
})

router.post('/', async (req, res, next) => {
  try {
    const { value, error: ve } = schema.validate(req.body)
    if (ve) return fail(res, 400, 'Invalid alert', 'BAD_REQUEST')
    const { count } = await supabase.from('price_alerts').select('id', { count: 'exact', head: true }).eq('user_id', req.user.id).eq('active', true)
    if ((count || 0) >= MAX_ACTIVE) return fail(res, 400, `You can have up to ${MAX_ACTIVE} active alerts.`, 'LIMIT')
    const { data, error } = await supabase.from('price_alerts').insert({ user_id: req.user.id, ...value }).select('id').single()
    if (error) throw error
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
})

router.post('/:id/delete', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return fail(res, 400, 'Bad id', 'BAD_REQUEST')
    await supabase.from('price_alerts').update({ active: false }).eq('id', id).eq('user_id', req.user.id)
    res.json({ success: true, data: { ok: true } })
  } catch (err) { next(err) }
})

export default router
