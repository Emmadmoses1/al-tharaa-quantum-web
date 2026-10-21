import { Router } from 'express'
import Joi from 'joi'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('profiles').select('full_name, phone, preferred_language, preferred_currency, notify_email').eq('id', req.user.id).single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

const schema = Joi.object({
  full_name: Joi.string().trim().max(120).allow(''),
  phone: Joi.string().trim().max(30).allow(''),
  preferred_language: Joi.string().valid('ar', 'en'),
  preferred_currency: Joi.string().trim().uppercase().min(2).max(6),
  notify_email: Joi.boolean(),
}).min(1)

router.patch('/', async (req, res, next) => {
  try {
    const { value, error: ve } = schema.validate(req.body)
    if (ve) return res.status(400).json({ success: false, error: { message: ve.message, code: 'BAD_REQUEST' } })
    if (value.preferred_currency) {
      const { data: c } = await supabase.from('currencies').select('code').eq('code', value.preferred_currency).eq('is_active', true).maybeSingle()
      if (!c) return res.status(400).json({ success: false, error: { message: 'Unsupported currency', code: 'BAD_REQUEST' } })
    }
    const { error } = await supabase.rpc('set_user_prefs', {
      p_user: req.user.id, p_name: value.full_name ?? null, p_phone: value.phone ?? null,
      p_lang: value.preferred_language ?? null, p_currency: value.preferred_currency ?? null, p_notify: value.notify_email ?? null,
    })
    if (error) throw error
    res.json({ success: true, data: value })
  } catch (err) { next(err) }
})

export default router
