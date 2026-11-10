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

const err = (res, status, message, code) => res.status(status).json({ success: false, error: { message, code } })

// Price with one retry, so a momentary feed hiccup does not fail the user's trade.
async function priceOrNull(asset) {
  try { return await getPrice(asset) } catch { await new Promise(r => setTimeout(r, 1200)); try { return await getPrice(asset) } catch { return null } }
}

router.post('/open', validate(openTradeSchema), async (req, res, next) => {
  try {
    const { signal_id, amount } = req.body
    const { data: sig } = await supabase.from('ai_signals')
      .select('asset, is_active, expires_at, stop_loss, take_profit_1, entry_zone_low, entry_zone_high').eq('id', signal_id).single()
    if (!sig) return err(res, 404, 'Signal not found', 'NOT_FOUND')
    if (!sig.is_active || (sig.expires_at && new Date(sig.expires_at) < new Date())) {
      return err(res, 409, 'This signal has expired. Refresh and choose the latest signal.', 'SIGNAL_EXPIRED')
    }
    const price = await priceOrNull(sig.asset)
    if (!price) return err(res, 503, 'Market price is temporarily unavailable. Please try again in a moment.', 'PRICE_UNAVAILABLE')

    // Refuse a trade that would be closed by its own stop-loss or target a moment after opening.
    if (sig.stop_loss && price <= Number(sig.stop_loss)) return err(res, 409, 'Price is already at or below this signal\'s stop-loss. Wait for a new signal.', 'SIGNAL_STALE')
    if (sig.take_profit_1 && price >= Number(sig.take_profit_1)) return err(res, 409, 'Price already reached this signal\'s target. Wait for a new signal.', 'SIGNAL_STALE')
    const lo = Number(sig.entry_zone_low), hi = Number(sig.entry_zone_high)
    if (lo > 0 && hi > 0) {
      const mid = (lo + hi) / 2
      if (Math.abs(price - mid) / mid > 0.015) return err(res, 409, 'Price has moved away from this signal\'s entry. Refresh for the latest signal.', 'PRICE_MOVED')
    }

    const { data, error } = await supabase.rpc('open_trade', { p_user: req.user.id, p_signal: signal_id, p_amount: amount, p_price: price })
    if (error) return err(res, 400, error.message, 'TRADE_REJECTED')
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'TRADE_OPENED', entity: 'trades', entity_id: data, metadata: { signal_id, amount, price } })
    await supabase.from('notifications').insert({
      user_id: req.user.id, type: 'trade',
      title: `${sig.asset} position opened`, title_ar: `تم فتح صفقة ${sig.asset}`,
      message: `Opened with ${amount} USDT at ${Number(price).toLocaleString('en-US')}.`,
      message_ar: `فُتحت الصفقة بمبلغ ${amount} USDT عند سعر ${Number(price).toLocaleString('en-US')}.`,
    })
    res.status(201).json({ success: true, data: { id: data, price } })
  } catch (e) { next(e) }
})

router.post('/close/:id', async (req, res, next) => {
  try {
    const { data: t } = await supabase.from('trades').select('asset').eq('id', req.params.id).eq('user_id', req.user.id).single()
    if (!t) return res.status(404).json({ success: false, error: { message: 'Position not found', code: 'NOT_FOUND' } })
    const price = await priceOrNull(t.asset)
    if (!price) return err(res, 503, 'Market price is temporarily unavailable. Please try again in a moment.', 'PRICE_UNAVAILABLE')
    const { data, error } = await supabase.rpc('close_trade', { p_trade: req.params.id, p_price: price, p_reason: 'manual', p_user: req.user.id })
    if (error) return res.status(400).json({ success: false, error: { message: error.message, code: 'CLOSE_REJECTED' } })
    const pnl = Number(data?.pnl ?? 0)
    const sign = pnl >= 0 ? '+' : ''
    await supabase.from('notifications').insert({
      user_id: req.user.id, type: 'trade',
      title: `${t.asset} position closed`, title_ar: `تم إغلاق صفقة ${t.asset}`,
      message: `Closed manually. Result: ${sign}${pnl.toFixed(2)} USDT.`,
      message_ar: `أُغلقت الصفقة يدوياً. النتيجة: ${sign}${pnl.toFixed(2)} USDT.`,
    })
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

export default router
