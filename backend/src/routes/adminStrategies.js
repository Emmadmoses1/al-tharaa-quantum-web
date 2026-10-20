import { Router } from 'express'
import Joi from 'joi'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'

const router = Router()
router.use(requireAdmin)
const ROLES = ['admin', 'super_admin', 'trading_admin']
const deny = res => res.status(403).json({ success: false, error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } })

const patchSchema = Joi.object({
  is_enabled: Joi.boolean(),
  max_position_size_percent: Joi.number().min(0.1).max(100),
  max_daily_loss_percent: Joi.number().min(0.1).max(100),
  max_open_positions: Joi.number().integer().min(1).max(50),
  stop_loss_percent: Joi.number().min(0.1).max(90),
  take_profit_percent: Joi.number().min(0.1).max(500),
}).min(1)

router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('strategies').select('*').order('name')
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

router.patch('/:id', async (req, res, next) => {
  try {
    if (!ROLES.includes(req.userRole)) return deny(res)
    const { value, error: ve } = patchSchema.validate(req.body)
    if (ve) return res.status(400).json({ success: false, error: { message: ve.message, code: 'BAD_REQUEST' } })
    const { data, error } = await supabase.from('strategies').update({ ...value, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single()
    if (error || !data) return res.status(404).json({ success: false, error: { message: 'Strategy not found', code: 'NOT_FOUND' } })
    if (value.is_enabled === false) await supabase.from('ai_signals').update({ is_active: false }).eq('strategy_id', data.id).eq('is_active', true)
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'STRATEGY_UPDATED', entity: 'strategies', entity_id: data.id, metadata: value })
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

router.post('/disable-all', async (req, res, next) => {
  try {
    if (!ROLES.includes(req.userRole)) return deny(res)
    const { error } = await supabase.from('strategies').update({ is_enabled: false, updated_at: new Date().toISOString() }).eq('is_enabled', true)
    if (error) throw error
    await supabase.from('ai_signals').update({ is_active: false }).eq('is_active', true)
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'STRATEGIES_DISABLED_ALL', entity: 'strategies' })
    res.json({ success: true, data: { disabled: true } })
  } catch (err) { next(err) }
})

export default router
