import { supabase } from '../lib/supabase.js'
import { getCandles } from './prices.js'

const ASSETS = ['BTC', 'ETH']
const TTL_MIN = { '15m': 30, '1h': 120, '4h': 480, '1d': 2880 }

const ema = (v, p) => { const k = 2 / (p + 1); let e = v[0]; const o = [e]; for (let i = 1; i < v.length; i++) { e = v[i] * k + e * (1 - k); o.push(e) } return o }
const rsi = (c, p = 14) => {
  let g = 0, l = 0
  for (let i = 1; i <= p; i++) { const d = c[i] - c[i - 1]; d >= 0 ? (g += d) : (l -= d) }
  g /= p; l /= p
  for (let i = p + 1; i < c.length; i++) { const d = c[i] - c[i - 1]; g = (g * (p - 1) + Math.max(d, 0)) / p; l = (l * (p - 1) + Math.max(-d, 0)) / p }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l)
}
const atr = (h, l, c, p = 14) => {
  const tr = []
  for (let i = 1; i < c.length; i++) tr.push(Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])))
  let a = tr.slice(0, p).reduce((x, y) => x + y, 0) / p
  for (let i = p; i < tr.length; i++) a = (a * (p - 1) + tr[i]) / p
  return a
}
const r2 = n => Number(n.toFixed(2))

export function analyze(candles) {
  const c = candles.map(x => x.c), h = candles.map(x => x.h), l = candles.map(x => x.l)
  const price = c[c.length - 1]
  const e20 = ema(c, 20).at(-1), e50 = ema(c, 50).at(-1)
  const r = rsi(c), a = atr(h, l, c), aPct = (a / price) * 100
  const spread = Math.abs(e20 - e50) / price * 100
  const up = e20 > e50 && price > e50
  const down = e20 < e50 && price < e50
  const nearE20 = Math.abs(price - e20) / price < 0.015

  let signal = 'WAIT', score = 50
  if (up && r >= 40 && r <= 68 && nearE20) { signal = 'BUY'; score = 55 + (r <= 60 ? 10 : 0) + Math.min(15, spread * 10) }
  else if (up) { signal = 'HOLD'; score = 55 }
  else if (down && r <= 55) { signal = 'SELL'; score = 55 + Math.min(15, spread * 10) }

  const risk = aPct < 1 ? 'low' : aPct < 2.5 ? 'medium' : 'high'
  const trend = up ? 'صاعد' : down ? 'هابط' : 'عرضي'
  return {
    signal, risk, confidence: r2(Math.max(50, Math.min(85, score))),
    entry_low: r2(price * 0.998), entry_high: r2(price * 1.002),
    stop_loss: r2(price - 1.5 * a), tp1: r2(price + 2.25 * a), tp2: r2(price + 4.5 * a),
    indicators: { price: r2(price), ema20: r2(e20), ema50: r2(e50), rsi: r2(r), atr_pct: r2(aPct) },
    summary: `الاتجاه ${trend} (EMA20 ${up ? 'فوق' : down ? 'تحت' : 'قرب'} EMA50)، مؤشر RSI = ${r2(r)}، التذبذب ATR = ${r2(aPct)}%. نسبة الثقة تقدير إرشادي مبني على المؤشرات وليست احتمال ربح.`,
  }
}

export async function runSignalEngine({ force = false } = {}) {
  const { data: st } = await supabase.from('ai_engine_state').select('*').eq('id', 1).single()
  if (!force && st && st.enabled === false) return null

  const { data: strategies } = await supabase.from('strategies').select('*').eq('is_enabled', true)
  let result
  if (!strategies || strategies.length === 0) {
    result = { created: 0, message: 'No enabled strategies. Enable one in Admin > Strategies.' }
  } else {
    let created = 0; const errors = []
    for (const s of strategies) {
      for (const asset of (s.supported_assets || []).filter(x => ASSETS.includes(x))) {
        try {
          const a = analyze(await getCandles(asset, s.timeframe || '1h'))
          await supabase.from('ai_signals').update({ is_active: false }).eq('strategy_id', s.id).eq('asset', asset).eq('is_active', true)
          const ttl = TTL_MIN[s.timeframe] || 120
          await supabase.from('ai_signals').insert({
            strategy_id: s.id, asset, signal: a.signal, entry_zone_low: a.entry_low, entry_zone_high: a.entry_high,
            stop_loss: a.stop_loss, take_profit_1: a.tp1, take_profit_2: a.tp2, risk_level: a.risk,
            confidence_percent: a.confidence, timeframe: s.timeframe, analysis_summary: a.summary,
            is_active: true, expires_at: new Date(Date.now() + ttl * 60000).toISOString(),
          })
          await supabase.from('ai_decisions').insert({
            strategy_id: s.id, asset, signal: a.signal, indicators: a.indicators,
            decision: 'signal_published', model_version: 'rules-ema-rsi-atr-v1',
          })
          created++
        } catch (e) { errors.push(`${asset}: ${e.message}`) }
      }
    }
    result = { created, errors }
  }
  await supabase.from('ai_engine_state').update({ last_run_at: new Date().toISOString(), last_result: result }).eq('id', 1)
  return result
}
