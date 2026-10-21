import { getSetting } from '../lib/settings.js'
import { Router } from 'express'
import Joi from 'joi'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'
import { getPrice } from '../services/prices.js'

const router = Router()
router.use(requireAuth)

const DURATIONS = [60, 180, 300, 900]
const ASSETS = ['BTC', 'ETH']
const priceCache = new Map()
let cfgCache = { at: 0, v: null }

export async function loadConfig() {
  if (cfgCache.v && Date.now() - cfgCache.at < 4000) return cfgCache.v
  const { data, error } = await supabase.from('trading_config').select('*').eq('id', 1).single()
  if (error || !data) throw new Error('Trading configuration missing. Run the trading_config SQL.')
  cfgCache = { at: Date.now(), v: {
    enabled: data.binary_enabled, payout_percent: Number(data.payout_percent), min: Number(data.min_stake), max: Number(data.max_stake),
    max_open: data.max_open_per_user, durations: DURATIONS, assets: ASSETS,
  } }
  return cfgCache.v
}
export function clearConfigCache() { cfgCache = { at: 0, v: null } }

router.get('/config', async (_req, res, next) => {
  try { res.json({ success: true, data: await loadConfig() }) } catch (err) { next(err) }
})

router.get('/price', async (req, res, next) => {
  try {
    const asset = String(req.query.asset || 'BTC').toUpperCase()
    if (!ASSETS.includes(asset)) return res.status(400).json({ success: false, error: { message: 'Unsupported asset', code: 'BAD_REQUEST' } })
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
    const cfg = await loadConfig()
    const gen = await getSetting('general')
    if (gen.maintenance) return res.status(503).json({ success: false, error: { message: gen.maintenance_message || 'The platform is under maintenance.', code: 'MAINTENANCE' } })
    if (!cfg.enabled) return res.status(400).json({ success: false, error: { message: 'Trading is temporarily paused', code: 'PAUSED' } })
    const schema = Joi.object({
      asset: Joi.string().valid(...ASSETS).required(),
      direction: Joi.string().valid('up', 'down').required(),
      amount: Joi.number().min(cfg.min).max(cfg.max).required(),
      seconds: Joi.number().valid(...DURATIONS).required(),
    })
    const { value, error: ve } = schema.validate(req.body)
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
