import { supabase } from '../lib/supabase.js'
import { getPriceFresh } from './prices.js'

const fmt = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })

// Fires price alerts. Each alert is claimed with an UPDATE ... WHERE active before notifying, so it can never fire twice.
// The notification goes through the normal delivery loop: in-app, email and push.
export async function checkAlerts() {
  const { data: rows } = await supabase.from('price_alerts').select('id, user_id, asset, direction, target').eq('active', true).limit(1000)
  if (!rows || rows.length === 0) return null
  const prices = {}
  for (const a of new Set(rows.map(r => r.asset))) { try { prices[a] = await getPriceFresh(a, 15000) } catch { /* try next round */ } }
  let fired = 0
  for (const r of rows) {
    const p = prices[r.asset]
    if (!p) continue
    const hit = r.direction === 'above' ? p >= Number(r.target) : p <= Number(r.target)
    if (!hit) continue
    const { data: claimed } = await supabase.from('price_alerts').update({ active: false, triggered_at: new Date().toISOString() }).eq('id', r.id).eq('active', true).select('id')
    if (!claimed || claimed.length === 0) continue
    const up = r.direction === 'above'
    await supabase.from('notifications').insert({
      user_id: r.user_id, type: 'trade',
      title: `${r.asset} price alert`, title_ar: `تنبيه سعر ${r.asset}`,
      message: `${r.asset} is now ${fmt(p)} USDT, ${up ? 'above' : 'below'} your target of ${fmt(r.target)}.`,
      message_ar: `سعر ${r.asset} الآن ${fmt(p)} USDT، ${up ? 'أعلى' : 'أدنى'} من هدفك ${fmt(r.target)}.`,
    })
    fired++
  }
  return fired ? { alerts_fired: fired } : null
}
