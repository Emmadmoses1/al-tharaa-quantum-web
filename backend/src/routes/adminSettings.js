import { Router } from 'express'
import Joi from 'joi'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'
import { DEFAULTS, getSetting, saveSetting } from '../lib/settings.js'

const router = Router()
router.use(requireAdmin)
const str = (max) => Joi.string().trim().max(max).allow('')

const SCHEMAS = {
  general: Joi.object({ platform_name: str(80), support_email: Joi.string().trim().email().allow(''), maintenance: Joi.boolean(), maintenance_message: str(300) }),
  bonus: Joi.object({ enabled: Joi.boolean(), usd: Joi.number().min(0).max(100), daily_cap: Joi.number().integer().min(0).max(100000), require_email_confirmed: Joi.boolean() }),
  referral: Joi.object({ enabled: Joi.boolean(), reward_usdt: Joi.number().min(0).max(100), min_deposit_usdt: Joi.number().min(0).max(100000) }),
  investments: Joi.object({ early_redeem_enabled: Joi.boolean(), early_redeem_penalty_percent: Joi.number().min(0).max(90) }),
  invoice: Joi.object({ company_name: str(120), address: str(300), tax_id: str(60), footer: str(300) }),
  payments: Joi.object({ nowpayments_enabled: Joi.boolean(), sandbox: Joi.boolean(), min_usd: Joi.number().min(1).max(100000), max_usd: Joi.number().min(1).max(1000000) }),
  email: Joi.object({ enabled: Joi.boolean(), from: str(120), notify_deposit: Joi.boolean() }),
}
const ROLES = ['admin', 'super_admin']

router.get('/', async (_req, res, next) => {
  try {
    const out = {}
    for (const k of Object.keys(DEFAULTS)) out[k] = await getSetting(k)
    res.json({ success: true, data: out })
  } catch (err) { next(err) }
})

router.patch('/:key', async (req, res, next) => {
  try {
    if (!ROLES.includes(req.userRole)) return res.status(403).json({ success: false, error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } })
    const schema = SCHEMAS[req.params.key]
    if (!schema) return res.status(404).json({ success: false, error: { message: 'Unknown settings group', code: 'NOT_FOUND' } })
    const { value, error } = schema.min(1).validate(req.body)
    if (error) return res.status(400).json({ success: false, error: { message: error.message, code: 'BAD_REQUEST' } })
    const saved = await saveSetting(req.params.key, value, req.user.id)
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'SETTINGS_UPDATED', entity: 'platform_settings', metadata: { key: req.params.key, changed: Object.keys(value) } })
    res.json({ success: true, data: saved })
  } catch (err) { next(err) }
})

export default router
