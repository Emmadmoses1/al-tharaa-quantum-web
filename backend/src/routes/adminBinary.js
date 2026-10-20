import { Router } from 'express'
import Joi from 'joi'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'
import { clearConfigCache } from './binary.js'

const router = Router()
router.use(requireAdmin)
const ROLES = ['admin', 'super_admin', 'trading_admin']
const deny = res => res.status(403).json({ success: false, error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } })
const n = v => Number(v || 0)
const r2 = v => Math.round(v * 100) / 100

router.get('/config', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('trading_config').select('*').eq('id', 1).single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

const cfgSchema = Joi.object({
  binary_enabled: Joi.boolean(),
  payout_percent: Joi.number().min(50).max(95),
  min_stake: Joi.number().min(0.1).max(1000),
  max_stake: Joi.number().min(1).max(10000),
  max_open_per_user: Joi.number().integer().min(1).max(50),
  max_platform_exposure: Joi.number().min(0).max(10000000),
  withdraw_daily_limit_usdt: Joi.number().min(0).max(10000000),
}).min(1)

router.patch('/config', async (req, res, next) => {
  try {
    if (!ROLES.includes(req.userRole)) return deny(res)
    const { value, error: ve } = cfgSchema.validate(req.body)
    if (ve) return res.status(400).json({ success: false, error: { message: ve.message, code: 'BAD_REQUEST' } })
    const { data: cur } = await supabase.from('trading_config').select('*').eq('id', 1).single()
    const next_ = { ...cur, ...value }
    if (n(next_.min_stake) > n(next_.max_stake)) return res.status(400).json({ success: false, error: { message: 'Min stake cannot exceed max stake', code: 'BAD_REQUEST' } })
    const { data, error } = await supabase.from('trading_config').update({ ...value, updated_at: new Date().toISOString() }).eq('id', 1).select().single()
    if (error) throw error
    clearConfigCache()
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'BINARY_CONFIG_UPDATED', entity: 'trading_config', metadata: value })
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

router.get('/stats', async (req, res, next) => {
  try {
    const days = Math.max(0, Math.min(3650, parseInt(req.query.days, 10) || 0))
    let q = supabase.from('binary_orders').select('user_id,status,amount,payout,payout_percent,opened_at').limit(20000)
    if (days > 0) q = q.gte('opened_at', new Date(Date.now() - days * 86400000).toISOString())
    const { data, error } = await q
    if (error) throw error
    const s = { orders: 0, users: new Set(), staked: 0, won: 0, lost: 0, other: 0, paid_out: 0, lost_stakes: 0, open_count: 0, open_stake: 0, open_max_liability: 0 }
    for (const o of data || []) {
      s.orders++; s.users.add(o.user_id)
      if (o.status === 'open') { s.open_count++; s.open_stake += n(o.amount); s.open_max_liability += n(o.amount) * n(o.payout_percent) / 100; continue }
      if (o.status === 'won') { s.won++; s.staked += n(o.amount); s.paid_out += n(o.payout) }
      else if (o.status === 'lost') { s.lost++; s.staked += n(o.amount); s.lost_stakes += n(o.amount) }
      else s.other++
    }
    const settled = s.won + s.lost
    res.json({ success: true, data: {
      orders: s.orders, users: s.users.size, staked: r2(s.staked), won: s.won, lost: s.lost, void_or_tie: s.other,
      user_win_rate: settled ? r2((s.won / settled) * 100) : null,
      paid_out: r2(s.paid_out), house_pnl: r2(s.lost_stakes - (s.paid_out - (s.staked - s.lost_stakes))),
      open_count: s.open_count, open_stake: r2(s.open_stake), open_max_liability: r2(s.open_max_liability),
    } })
  } catch (err) { next(err) }
})

router.get('/orders', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('binary_orders').select('*, profiles(email)').order('opened_at', { ascending: false }).limit(100)
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

export default router
