const PAIR = { BTC: 'BTCUSDT', ETH: 'ETHUSDT' }
const CG = { BTC: 'bitcoin', ETH: 'ethereum' }
const CB = { BTC: 'BTC-USD', ETH: 'ETH-USD' }
const KR = { BTC: 'XBTUSD', ETH: 'ETHUSD' }
const KR_IV = { '15m': 15, '1h': 60, '4h': 240, '1d': 1440 }

export async function fetchJson(url, headers = {}, ms = 9000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const r = await fetch(url, { signal: ctl.signal, headers })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return await r.json()
  } finally {
    clearTimeout(t)
  }
}

// ---- price cache: one upstream call per asset every few seconds, shared by all users ----
const FRESH_MS = 8000
const STALE_MS = 90000
const cache = new Map()    // asset -> { p, at }
const inflight = new Map() // asset -> Promise

async function fromSources(asset) {
  const sources = [
    async () => Number((await fetchJson(`https://data-api.binance.vision/api/v3/ticker/price?symbol=${PAIR[asset]}`, {}, 5000)).price),
    async () => Number((await fetchJson(`https://api.binance.com/api/v3/ticker/price?symbol=${PAIR[asset]}`, {}, 5000)).price),
    async () => Number((await fetchJson(`https://api.coinbase.com/v2/prices/${CB[asset]}/spot`, {}, 5000)).data.amount),
    async () => Number(Object.values((await fetchJson(`https://api.kraken.com/0/public/Ticker?pair=${KR[asset]}`, {}, 5000)).result)[0].c[0]),
    async () => Number((await fetchJson(`https://api.coingecko.com/api/v3/simple/price?ids=${CG[asset]}&vs_currencies=usd`, {}, 5000))[CG[asset]].usd),
  ]
  let last = ''
  for (const s of sources) {
    try { const p = await s(); if (Number.isFinite(p) && p > 0) return p } catch (e) { last = e.message }
  }
  throw new Error(`price feeds unavailable (${last})`)
}

function refresh(asset) {
  if (!inflight.has(asset)) {
    inflight.set(asset, fromSources(asset)
      .then(p => { cache.set(asset, { p, at: Date.now() }); return p })
      .finally(() => inflight.delete(asset)))
  }
  return inflight.get(asset)
}

const UNAVAILABLE = 'Market price is temporarily unavailable. Please try again in a moment.'

export async function getPrice(asset) {
  if (!PAIR[asset]) throw new Error(`Unsupported asset ${asset}`)
  const c = cache.get(asset)
  if (c && Date.now() - c.at < FRESH_MS) return c.p
  try {
    return await refresh(asset)
  } catch (e) {
    if (c && Date.now() - c.at < STALE_MS) return c.p
    console.error(`[prices] ${asset}: ${e.message}`)
    throw new Error(UNAVAILABLE)
  }
}

// For anything that fixes a price for money (opening a trade, settling an order, closing at stop-loss): never a stale value.
export async function getPriceFresh(asset, maxAgeMs = 5000) {
  if (!PAIR[asset]) throw new Error(`Unsupported asset ${asset}`)
  const c = cache.get(asset)
  if (c && Date.now() - c.at < maxAgeMs) return c.p
  try {
    return await refresh(asset)
  } catch (e) {
    console.error(`[prices] fresh ${asset}: ${e.message}`)
    throw new Error(UNAVAILABLE)
  }
}

// Price at a past moment (1-minute candle, interpolated inside the minute). Used to settle orders that were overdue.
export async function getPriceAt(asset, tsMs) {
  if (!PAIR[asset]) throw new Error(`Unsupported asset ${asset}`)
  const start = Math.floor(tsMs / 60000) * 60000
  const frac = (tsMs - start) / 60000
  const mix = (o, c) => Number(o) + (Number(c) - Number(o)) * frac
  const q = `symbol=${PAIR[asset]}&interval=1m&startTime=${start}&limit=1`
  for (const host of ['data-api.binance.vision', 'api.binance.com', 'api.binance.us']) {
    try {
      const rows = await fetchJson(`https://${host}/api/v3/klines?${q}`, {}, 5000)
      if (rows?.length && Number(rows[0][0]) === start) { const p = mix(rows[0][1], rows[0][4]); if (Number.isFinite(p) && p > 0) return p }
    } catch { /* next source */ }
  }
  try {
    const d = await fetchJson(`https://api.kraken.com/0/public/OHLC?pair=${KR[asset]}&interval=1&since=${Math.floor(start / 1000) - 1}`, {}, 5000)
    const arr = Object.entries(d.result).find(([k]) => k !== 'last')[1]
    const r = arr.find(x => Number(x[0]) * 1000 === start)
    if (r) { const p = mix(r[1], r[4]); if (Number.isFinite(p) && p > 0) return p }
  } catch { /* fall through */ }
  throw new Error('historical price unavailable')
}

// ---- candles: cached for a minute, several sources ----
const candleCache = new Map()

export async function getCandles(asset, interval, limit = 200) {
  const key = `${asset}:${interval}:${limit}`
  const hit = candleCache.get(key)
  if (hit && Date.now() - hit.at < 60000) return hit.rows
  const q = `symbol=${PAIR[asset]}&interval=${interval}&limit=${limit}`
  const tries = [
    async () => (await fetchJson(`https://data-api.binance.vision/api/v3/klines?${q}`)).map(r => ({ h: Number(r[2]), l: Number(r[3]), c: Number(r[4]) })),
    async () => (await fetchJson(`https://api.binance.com/api/v3/klines?${q}`)).map(r => ({ h: Number(r[2]), l: Number(r[3]), c: Number(r[4]) })),
    async () => (await fetchJson(`https://api.binance.us/api/v3/klines?${q}`)).map(r => ({ h: Number(r[2]), l: Number(r[3]), c: Number(r[4]) })),
    async () => {
      if (!KR_IV[interval]) throw new Error('interval')
      const d = await fetchJson(`https://api.kraken.com/0/public/OHLC?pair=${KR[asset]}&interval=${KR_IV[interval]}`)
      return Object.entries(d.result).find(([k]) => k !== 'last')[1].slice(-limit).map(r => ({ h: Number(r[2]), l: Number(r[3]), c: Number(r[4]) }))
    },
  ]
  let last = ''
  for (const t of tries) {
    try {
      const rows = (await t()).slice(0, -1) // drop the still-forming candle
      if (rows.length) { candleCache.set(key, { rows, at: Date.now() }); return rows }
    } catch (e) { last = e.message }
  }
  if (hit && Date.now() - hit.at < 30 * 60000) return hit.rows // never build signals on data older than 30 min
  throw new Error(`candles unavailable (${last})`)
}
