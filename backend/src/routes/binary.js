import { Router } from 'express'
import Joi from 'joi'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'
import { getPrice } from '../services/prices.js'

const router = Router()
router.use(requireAuth)

// Keep in sync with the constants inside place_binary_order()
const CFG = { payout_percent: 85, durations: [60, 180, 300, 900], min: 1, max: 500, max_open: 10, assets: ['BTC', 'ETH'] }
const placeSchema = Joi.object({
  asset: Joi.string().valid(...CFG.assets).required(),
  direction: Joi.string().valid('up', 'down').required(),
  amount: Joi.number().min(CFG.min).max(CFG.max).required(),
  seconds: Joi.number().valid(...CFG.durations).required(),
})
const priceCache = new Map()

router.get('/config', (_req, res) => res.json({ success: true, data: CFG }))

router.get('/price', async (req, res, next) => {
  try {
    const asset = String(req.query.asset || 'BTC').toUpperCase()
    if (!CFG.assets.includes(asset)) return res.status(400).json({ success: false, error: { message: 'Unsupported asset', code: 'BAD_REQUEST' } })
    const hit = priceCache.get(asset)
    if (hit && Date.now() - hit.at < 1500) return res.json({ success: true, data: { asset, price: hit.price } })
    const price = await getPrice(asset)
    priceCache.set(asset, { at: Date.now(), price })
    res.json({ success: true, data: { asset, price } })
  } catch (err) { next(err) }
})

router.get('/orders', async (req, res, next) => {
  try {
    const [open, hist] = await Promise.all([
      supabase.from('binary_orders').select('*').eq('user_id', req.user.id).eq('status', 'open').order('expires_at'),
      supabase.from('binary_orders').select('*').eq('user_id', req.user.id).neq('status', 'open').order('settled_at', { ascending: false }).limit(25),
    ])
    if (open.error) throw open.error
    if (hist.error) throw hist.error
    res.json({ success: true, data: { open: open.data, history: hist.data } })
  } catch (err) { next(err) }
})

router.post('/place', async (req, res, next) => {
  try {
    const { value, error: ve } = placeSchema.validate(req.body)
    if (ve) return res.status(400).json({ success: false, error: { message: ve.message, code: 'BAD_REQUEST' } })
    const price = await getPrice(value.asset)
    const { data, error } = await supabase.rpc('place_binary_order', {
      p_user: req.user.id, p_asset: value.asset, p_direction: value.direction,
      p_amount: value.amount, p_seconds: value.seconds, p_price: price,
    })
    if (error) return res.status(400).json({ success: false, error: { message: error.message, code: 'ORDER_REJECTED' } })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
})

export default router
