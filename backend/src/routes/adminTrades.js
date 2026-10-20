import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'
import { getPrice } from '../services/prices.js'

const router = Router()
router.use(requireAdmin)
const TRADING_ROLES = ['admin', 'super_admin', 'trading_admin']

router.get('/', async (req, res, next) => {
  try {
    const status = ['open', 'closed'].includes(req.query.status) ? req.query.status : null
    let q = supabase.from('trades').select('*, profiles(email, full_name)').order('created_at', { ascending: false }).limit(150)
    if (status) q = q.eq('status', status)
    const { data, error } = await q
    if (error) throw error
    const prices = {}
    for (const a of new Set((data || []).filter(t => t.status === 'open').map(t => t.asset))) { try { prices[a] = await getPrice(a) } catch { /* leave null */ } }
    const rows = (data || []).map(t => {
      const price = t.status === 'open' ? (prices[t.asset] ?? null) : null
      const pnl = t.status === 'open' ? (price ? Number(t.quantity) * price - Number(t.amount_usdt) : null) : (t.realized_pnl != null ? Number(t.realized_pnl) : null)
      return { ...t, price, pnl }
    })
    res.json({ success: true, data: rows })
  } catch (err) { next(err) }
})

router.post('/:id/close', async (req, res, next) => {
  try {
    if (!TRADING_ROLES.includes(req.userRole)) return res.status(403).json({ success: false, error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } })
    const { data: t } = await supabase.from('trades').select('asset, status, user_id').eq('id', req.params.id).single()
    if (!t || t.status !== 'open') return res.status(404).json({ success: false, error: { message: 'Open trade not found', code: 'NOT_FOUND' } })
    const price = await getPrice(t.asset)
    const { data, error } = await supabase.rpc('close_trade', { p_trade: req.params.id, p_price: price, p_reason: 'admin', p_user: null })
    if (error) return res.status(400).json({ success: false, error: { message: error.message, code: 'CLOSE_REJECTED' } })
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'ADMIN_FORCE_CLOSE_TRADE', entity: 'trades', entity_id: req.params.id, metadata: { price, owner: t.user_id } })
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

export default router
