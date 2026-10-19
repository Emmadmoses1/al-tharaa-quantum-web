import { Router } from 'express'
import Joi from 'joi'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'
import { validate } from '../middleware/validate.js'
import { runSignalEngine } from '../services/signalEngine.js'
import { scanDeposits } from '../services/depositWatcher.js'

const router = Router()
router.use(requireAdmin)

const TRADING_ROLES = ['admin', 'super_admin', 'trading_admin']
const FINANCE_ROLES = ['admin', 'super_admin', 'finance']
const deny = res => res.status(403).json({ success: false, error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } })

const adjustSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  ledger_type: Joi.string().valid('investment', 'trading').required(),
  asset: Joi.string().valid('USDT', 'BTC', 'ETH', 'USDC').required(),
  amount: Joi.number().invalid(0).min(-10000000).max(10000000).required(),
  reason: Joi.string().trim().min(5).max(200).required(),
})

router.get('/engine', async (_req, res, next) => {
  try {
    const { data: st } = await supabase.from('ai_engine_state').select('*').eq('id', 1).single()
    const { count: strategies } = await supabase.from('strategies').select('id', { count: 'exact', head: true }).eq('is_enabled', true)
    const { count: signals } = await supabase.from('ai_signals').select('id', { count: 'exact', head: true }).eq('is_active', true)
    const { count: open } = await supabase.from('trades').select('id', { count: 'exact', head: true }).eq('status', 'open')
    res.json({ success: true, data: { ...st, enabled_strategies: strategies || 0, active_signals: signals || 0, open_positions: open || 0 } })
  } catch (err) { next(err) }
})

router.post('/engine', async (req, res, next) => {
  try {
    if (!TRADING_ROLES.includes(req.userRole)) return deny(res)
    const enabled = !!req.body?.enabled
    await supabase.from('ai_engine_state').update({ enabled }).eq('id', 1)
    res.json({ success: true, data: { enabled } })
  } catch (err) { next(err) }
})

router.post('/engine/run', async (req, res, next) => {
  try {
    if (!TRADING_ROLES.includes(req.userRole)) return deny(res)
    res.json({ success: true, data: await runSignalEngine({ force: true }) })
  } catch (err) { next(err) }
})

router.post('/deposits/scan', async (req, res, next) => {
  try {
    if (!FINANCE_ROLES.includes(req.userRole)) return deny(res)
    res.json({ success: true, data: (await scanDeposits()) || { open: 0 } })
  } catch (err) { next(err) }
})

router.get('/balances', async (req, res, next) => {
  try {
    if (!FINANCE_ROLES.includes(req.userRole)) return deny(res)
    const search = String(req.query.search || '').trim().slice(0, 60).replace(/[%,]/g, '')
    const [rows, totals] = await Promise.all([
      supabase.rpc('balances_overview', { p_search: search || null }),
      supabase.rpc('balance_totals'),
    ])
    if (rows.error) throw rows.error
    if (totals.error) throw totals.error
    const users = new Map()
    for (const r of rows.data || []) {
      const u = users.get(r.user_id) || { id: r.user_id, email: r.email, full_name: r.full_name, balances: [] }
      if (r.ledger_type) u.balances.push({ ledger_type: r.ledger_type, asset: r.asset, balance: Number(r.balance) })
      users.set(r.user_id, u)
    }
    res.json({ success: true, data: { users: [...users.values()], totals: totals.data || [] } })
  } catch (err) { next(err) }
})

router.post('/balances/adjust', validate(adjustSchema), async (req, res, next) => {
  try {
    if (!FINANCE_ROLES.includes(req.userRole)) return deny(res)
    const { user_id, ledger_type, asset, amount, reason } = req.body
    const { data, error } = await supabase.rpc('admin_adjust_balance', {
      p_admin: req.user.id, p_user: user_id, p_ledger: ledger_type, p_asset: asset, p_amount: amount, p_reason: reason,
    })
    if (error) return res.status(400).json({ success: false, error: { message: error.message, code: 'ADJUST_REJECTED' } })
    await supabase.from('notifications').insert({
      user_id, type: 'balance', title: 'Balance updated', title_ar: 'تم تعديل رصيدك',
      message: `${amount > 0 ? '+' : ''}${amount} ${asset} (${ledger_type}). ${reason}`,
      message_ar: `${amount > 0 ? '+' : ''}${amount} ${asset} (${ledger_type === 'trading' ? 'التداول' : 'الاستثمار'}). ${reason}`,
    })
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

export default router
