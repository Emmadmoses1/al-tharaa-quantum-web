import { Router } from 'express'
import { getPrice, getCandles } from '../services/prices.js'

// Public live prices + 24h mini-chart for the ticker. Real data only: an asset whose feed fails is simply left out.
const router = Router()
let cache = { at: 0, v: null }

router.get('/', async (_req, res) => {
  if (cache.v && Date.now() - cache.at < 20000) return res.json({ success: true, data: cache.v })
  const out = {}
  await Promise.all(['BTC', 'ETH'].map(async a => {
    try {
      const [price, candles] = await Promise.all([getPrice(a), getCandles(a, '1h', 48).catch(() => [])])
      const spark = candles.slice(-24).map(c => c.c)
      const change = spark.length > 1 ? ((price - spark[0]) / spark[0]) * 100 : null
      out[a] = { price, change: change === null ? null : Number(change.toFixed(2)), spark }
    } catch { /* leave out */ }
  }))
  if (!Object.keys(out).length) return res.status(503).json({ success: false, error: { message: 'Market data is temporarily unavailable.', code: 'PRICE_UNAVAILABLE' } })
  cache = { at: Date.now(), v: out }
  res.json({ success: true, data: out })
})

export default router
