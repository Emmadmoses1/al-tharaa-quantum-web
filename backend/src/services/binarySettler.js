import { supabase } from '../lib/supabase.js'
import { getPrice } from './prices.js'

const TXT = {
  won: ['ربحت الصفقة', 'Order won'], lost: ['خسرت الصفقة', 'Order lost'],
  tie: ['تعادل: أُعيد المبلغ', 'Tie: stake refunded'], cancelled: ['أُلغيت الصفقة وأُعيد المبلغ', 'Order voided, stake refunded'],
}

export async function settleBinary() {
  const { data: due, error } = await supabase.from('binary_orders').select('id, asset')
    .eq('status', 'open').lte('expires_at', new Date().toISOString()).order('expires_at').limit(200)
  if (error) throw error
  if (!due || due.length === 0) return null
  const prices = {}
  for (const a of new Set(due.map(o => o.asset))) {
    try { prices[a] = await getPrice(a) } catch (e) { console.error(`[binary] price ${a}: ${e.message}`) }
  }
  let done = 0
  for (const o of due) {
    const p = prices[o.asset]
    if (!p) continue
    const { data, error: se } = await supabase.rpc('settle_binary_order', { p_order: o.id, p_price: p })
    if (se) { console.error('[binary] settle failed:', se.message); continue }
    if (!data?.status) continue
    done++
    const t = TXT[data.status]
    const net = data.status === 'won' ? Number(data.payout) - Number(data.amount) : data.status === 'lost' ? -Number(data.amount) : 0
    const sign = net >= 0 ? '+' : ''
    await supabase.from('notifications').insert({
      user_id: data.user_id, type: 'trade',
      title: `${data.asset}: ${t[1]}`, title_ar: `${data.asset}: ${t[0]}`,
      message: `Result: ${sign}${net.toFixed(2)} USDT.`, message_ar: `النتيجة: ${sign}${net.toFixed(2)} USDT.`,
    })
  }
  return done ? { settled: done } : null
}
