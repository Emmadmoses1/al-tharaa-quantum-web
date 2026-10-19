import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'
import { validate, openTradeSchema } from '../middleware/validate.js'
import { getPrice } from '../services/prices.js'

const router = Router()
router.use(requireAuth)

router.get('/positions', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('trades').select('*')
      .eq('user_id', req.user.id).eq('status', 'open').order('created_at', { ascending: false })
    if (error) throw error
    const prices = {}
    for (const a of new Set((data || []).map(t => t.asset))) { try { prices[a] = await getPrice(a) } catch { /* keep null */ } }
    const out = (data || []).map(t => {
      const price = prices[t.asset] ?? null
      const value = price ? Number(t.quantity) * price : null
      return { ...t, price, value, pnl: value !== null ? value - Number(t.amount_usdt) : null }
    })
    res.json({ success: true, data: out })
  } catch (err) { next(err) }
})

router.post('/open', validate(openTradeSchema), async (req, res, next) => {
  try {
    const { signal_id, amount } = req.body
    const { data: sig } = await supabase.from('ai_signals').select('asset').eq('id', signal_id).single()
    if (!sig) return res.status(404).json({ success: false, error: { message: 'Signal not found', code: 'NOT_FOUND' } })
    const price = await getPrice(sig.asset)
    const { data, error } = await supabase.rpc('open_trade', { p_user: req.user.id, p_signal: signal_id, p_amount: amount, p_price: price })
    if (error) return res.status(400).json({ success: false, error: { message: error.message, code: 'TRADE_REJECTED' } })
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'TRADE_OPENED', entity: 'trades', entity_id: data, metadata: { signal_id, amount, price } })
    res.status(201).json({ success: true, data: { id: data, price } })
  } catch (err) { next(err) }
})

router.post('/close/:id', async (req, res, next) => {
  try {
    const { data: t } = await supabase.from('trades').select('asset').eq('id', req.params.id).eq('user_id', req.user.id).single()
    if (!t) return res.status(404).json({ success: false, error: { message: 'Position not found', code: 'NOT_FOUND' } })
    const price = await getPrice(t.asset)
    const { data, error } = await supabase.rpc('close_trade', { p_trade: req.params.id, p_price: price, p_reason: 'manual', p_user: req.user.id })
    if (error) return res.status(400).json({ success: false, error: { message: error.message, code: 'CLOSE_REJECTED' } })
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

export default router
