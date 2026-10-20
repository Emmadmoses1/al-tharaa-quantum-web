import { Router } from 'express'
import { fetchJson, getCandles } from '../services/prices.js'

const router = Router()
const PAIRS = { BTC: 'BTCUSDT', ETH: 'ETHUSDT' }
const INTERVALS = new Set(['15m', '1h', '4h', '1d'])
let cache = { at: 0, data: null }
const candleCache = new Map()

async function ticker(symbol) {
  try { return await fetchJson(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`) }
  catch { return await fetchJson(`https://api.binance.us/api/v3/ticker/24hr?symbol=${symbol}`) }
}

async function load() {
  const out = await Promise.allSettled(Object.entries(PAIRS).map(async ([asset, symbol]) => {
    const [t, candles] = await Promise.all([ticker(symbol), getCandles(asset, '1h', 25).catch(() => [])])
    return {
      asset, pair: `${asset}/USDT`,
      price: Number(t.lastPrice), change_pct: Number(t.priceChangePercent),
      high: Number(t.highPrice), low: Number(t.lowPrice), volume_usdt: Number(t.quoteVolume),
      spark: candles.map(c => c.c).filter(Number.isFinite),
    }
  }))
  return out.filter(r => r.status === 'fulfilled' && Number.isFinite(r.value.price)).map(r => r.value)
}

router.get('/', async (req, res) => {
  const now = Date.now()
  if (cache.data && now - cache.at < 20000) return res.json({ success: true, data: cache.data })
  try {
    const assets = await load()
    if (assets.length === 0) throw new Error('no data')
    cache = { at: now, data: { updated_at: new Date().toISOString(), assets, stale: false } }
    return res.json({ success: true, data: cache.data })
  } catch {
    if (cache.data && now - cache.at < 5 * 60000) {
      return res.json({ success: true, data: { ...cache.data, stale: true } })
    }
    return res.status(503).json({ success: false, error: { message: 'Market data is unavailable right now', code: 'MARKET_UNAVAILABLE' } })
  }
})

// Full candles (open, high, low, close, volume), including the candle still forming
router.get('/candles', async (req, res) => {
  const asset = String(req.query.asset || 'BTC').toUpperCase()
  const interval = String(req.query.interval || '1h')
  if (!PAIRS[asset] || !INTERVALS.has(interval)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid asset or interval', code: 'BAD_REQUEST' } })
  }
  const key = `${asset}|${interval}`
  const now = Date.now()
  const hit = candleCache.get(key)
  if (hit && now - hit.at < 10000) return res.json({ success: true, data: hit.data })
  try {
    const q = `symbol=${PAIRS[asset]}&interval=${interval}&limit=200`
    let rows
    try { rows = await fetchJson(`https://api.binance.com/api/v3/klines?${q}`) }
    catch { rows = await fetchJson(`https://api.binance.us/api/v3/klines?${q}`) }
    const candles = rows
      .map(r => ({ t: r[0], o: Number(r[1]), h: Number(r[2]), l: Number(r[3]), c: Number(r[4]), v: Number(r[5]) }))
      .filter(c => [c.o, c.h, c.l, c.c].every(Number.isFinite))
    if (candles.length === 0) throw new Error('no candles')
    const data = { asset, interval, candles }
    candleCache.set(key, { at: now, data })
    return res.json({ success: true, data })
  } catch {
    if (hit && now - hit.at < 5 * 60000) return res.json({ success: true, data: { ...hit.data, stale: true } })
    return res.status(503).json({ success: false, error: { message: 'Market data is unavailable right now', code: 'MARKET_UNAVAILABLE' } })
  }
})

export default router
