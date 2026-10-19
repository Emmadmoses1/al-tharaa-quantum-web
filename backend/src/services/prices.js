const PAIR = { BTC: 'BTCUSDT', ETH: 'ETHUSDT' }
const CG = { BTC: 'bitcoin', ETH: 'ethereum' }

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

export async function getPrice(asset) {
  if (!PAIR[asset]) throw new Error(`Unsupported asset ${asset}`)
  try {
    const d = await fetchJson(`https://api.binance.com/api/v3/ticker/price?symbol=${PAIR[asset]}`)
    return Number(d.price)
  } catch {
    const d = await fetchJson(`https://api.coingecko.com/api/v3/simple/price?ids=${CG[asset]}&vs_currencies=usd`)
    return Number(d[CG[asset]].usd)
  }
}

export async function getCandles(asset, interval, limit = 200) {
  const q = `symbol=${PAIR[asset]}&interval=${interval}&limit=${limit}`
  let rows
  try { rows = await fetchJson(`https://api.binance.com/api/v3/klines?${q}`) }
  catch { rows = await fetchJson(`https://api.binance.us/api/v3/klines?${q}`) }
  // drop the still-forming candle
  return rows.slice(0, -1).map(r => ({ h: Number(r[2]), l: Number(r[3]), c: Number(r[4]) }))
}
