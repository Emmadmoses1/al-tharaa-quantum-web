import { Router } from 'express'
import { fetchJson, getCandles } from '../services/prices.js'

const router = Router()
const PAIRS = { BTC: 'BTCUSDT', ETH: 'ETHUSDT' }
let cache = { at: 0, data: null }

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

export default router
