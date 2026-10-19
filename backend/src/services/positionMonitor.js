import { supabase } from '../lib/supabase.js'
import { getPrice } from './prices.js'

const WHY = { stop_loss: ['عند وقف الخسارة', 'at stop-loss'], take_profit: ['عند الهدف', 'at take-profit'] }

export async function monitorPositions() {
  const { data: open } = await supabase.from('trades').select('id, user_id, asset, stop_loss, take_profit').eq('status', 'open')
  if (!open || open.length === 0) return null
  const prices = {}
  for (const asset of new Set(open.map(t => t.asset))) {
    try { prices[asset] = await getPrice(asset) } catch (e) { console.error(`[positions] price ${asset}: ${e.message}`) }
  }
  let closed = 0
  for (const t of open) {
    const p = prices[t.asset]
    if (!p) continue
    const reason = t.stop_loss && p <= Number(t.stop_loss) ? 'stop_loss' : t.take_profit && p >= Number(t.take_profit) ? 'take_profit' : null
    if (!reason) continue
    const { data, error } = await supabase.rpc('close_trade', { p_trade: t.id, p_price: p, p_reason: reason, p_user: null })
    if (error) { console.error('[positions] close failed:', error.message); continue }
    closed++
    const pnl = Number(data?.pnl ?? 0)
    const sign = pnl >= 0 ? '+' : ''
    await supabase.from('notifications').insert({
      user_id: t.user_id, type: 'trade',
      title: `${t.asset} position closed`, title_ar: `تم إغلاق صفقة ${t.asset}`,
      message: `Closed ${WHY[reason][1]}. Result: ${sign}${pnl.toFixed(2)} USDT.`,
      message_ar: `أُغلقت الصفقة ${WHY[reason][0]}. النتيجة: ${sign}${pnl.toFixed(2)} USDT.`,
    })
  }
  return closed ? { closed } : null
}
