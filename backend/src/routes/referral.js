import { Router } from 'express'
import Joi from 'joi'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'
import { getSetting } from '../lib/settings.js'

const router = Router()
router.use(requireAuth)

router.get('/me', async (req, res, next) => {
  try {
    const uid = req.user.id
    const { data: code, error } = await supabase.rpc('ensure_referral_code', { p_user: uid })
    if (error) throw error
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('referred_by', uid)
    const { data: rw } = await supabase.from('bonuses').select('amount').eq('user_id', uid).like('type', 'referral:%')
    const ref = await getSetting('referral')
    res.json({ success: true, data: {
      code, referred: count || 0, earned_usdt: (rw || []).reduce((s, r) => s + Number(r.amount), 0),
      enabled: !!ref.enabled && Number(ref.reward_usdt) > 0, reward_usdt: Number(ref.reward_usdt), min_deposit_usdt: Number(ref.min_deposit_usdt),
    } })
  } catch (err) { next(err) }
})

router.post('/apply', async (req, res, next) => {
  try {
    const { value, error: ve } = Joi.object({ code: Joi.string().trim().alphanum().min(4).max(20).required() }).validate(req.body)
    if (ve) return res.status(400).json({ success: false, error: { message: ve.message, code: 'BAD_REQUEST' } })
    const { data, error } = await supabase.rpc('apply_referral', { p_user: req.user.id, p_code: value.code.toUpperCase() })
    if (error) throw error
    res.json({ success: true, data: { applied: !!data } })
  } catch (err) { next(err) }
})

export default router
