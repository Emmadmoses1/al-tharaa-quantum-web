import { supabase } from '../lib/supabase.js'
import { getPriceFresh, getPriceAt } from './prices.js'

const TXT = {
  won: ['ربحت الصفقة', 'Order won'], lost: ['خسرت الصفقة', 'Order lost'],
  tie: ['تعادل: أُعيد المبلغ', 'Tie: stake refunded'], cancelled: ['أُلغيت الصفقة وأُعيد المبلغ', 'Order voided, stake refunded'],
}

const LATE_MS = 20000      // beyond this, settle at the price of the expiry moment, not "now"
const STUCK_MS = 15 * 60000
let pauseUntil = 0         // back off when every price feed is failing, instead of hammering them every 2s

// The settlement price must be the price at expiry. On time: a fresh price. Late: the historical price at expiry.
async function settlePrice(o) {
  const exp = new Date(o.expires_at).getTime()
  const late = Date.now() - exp
  if (late <= LATE_MS) return getPriceFresh(o.asset, 3000)
  try { return await getPriceAt(o.asset, exp) }
  catch (e) { if (late <= 60000) return getPriceFresh(o.asset, 3000); throw e }
}

export async function settleBinary() {
  if (Date.now() < pauseUntil) return null
  const { data: due, error } = await supabase.from('binary_orders').select('id, asset, expires_at')
    .eq('status', 'open').lte('expires_at', new Date().toISOString()).order('expires_at').limit(200)
  if (error) throw error
  if (!due || due.length === 0) return null
  let done = 0, failed = 0
  for (const o of due) {
    let p
    try { p = await settlePrice(o) } catch (e) {
      failed++
      if (Date.now() - new Date(o.expires_at).getTime() > STUCK_MS) console.error(`[binary] order ${o.id} is stuck (${o.asset}): ${e.message}`)
      continue
    }
    if (!p) { failed++; continue }
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
  if (failed && !done) pauseUntil = Date.now() + 10000
  return done ? { settled: done } : null
}
