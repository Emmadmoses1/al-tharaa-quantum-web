import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { getPrice } from '../services/prices.js'

// Public "payout proof": real numbers from completed withdrawals only. Nothing here can be typed in by hand.
const router = Router()
const STABLE = new Set(['USDT', 'USDC'])
const EXPLORER = {
  TRC20: 'https://tronscan.org/#/transaction/',
  ERC20: 'https://etherscan.io/tx/',
  BEP20: 'https://bscscan.com/tx/',
  Bitcoin: 'https://mempool.space/tx/',
}
let cache = { at: 0, n: 0, v: null }

const mask = name => {
  const s = String(name || '').trim()
  return s ? `${[...s][0]}***` : 'عميل ***'
}

async function build(n) {
  const { data: all, error } = await supabase.from('withdrawals').select('asset, net_amount, amount, created_at, updated_at')
    .eq('status', 'completed').order('updated_at', { ascending: false }).limit(5000)
  if (error) throw error
  const rows = all || []
  if (rows.length === 0) return { count: 0, total_usd: 0, median_minutes: null, items: [] }

  const price = {}
  for (const a of [...new Set(rows.map(r => r.asset))].filter(a => !STABLE.has(a))) {
    try { price[a] = await getPrice(a) } catch { price[a] = null }
  }
  let total = 0
  for (const r of rows) {
    const v = Number(r.net_amount ?? r.amount)
    if (STABLE.has(r.asset)) total += v
    else if (price[r.asset]) total += v * price[r.asset]
  }
  // Only count a duration when the record shows real time passed between request and completion.
  const mins = rows.map(r => (new Date(r.updated_at) - new Date(r.created_at)) / 60000).filter(m => m >= 1).sort((a, b) => a - b)
  const median = mins.length >= 3 ? Math.round(mins[Math.floor(mins.length / 2)]) : null

  const { data: last } = await supabase.from('withdrawals').select('user_id, asset, network, amount, net_amount, txid, created_at, updated_at')
    .eq('status', 'completed').not('txid', 'is', null).order('updated_at', { ascending: false }).limit(n * 2)
  const real = (last || []).filter(r => String(r.txid).length >= 20 && !String(r.txid).startsWith('np:')).slice(0, n)
  const ids = [...new Set(real.map(r => r.user_id))]
  const { data: profs } = ids.length ? await supabase.from('profiles').select('id, full_name').in('id', ids) : { data: [] }
  const who = new Map((profs || []).map(p => [p.id, p.full_name]))
  const items = real.map(r => ({
    name: mask(who.get(r.user_id)), amount: Number(r.net_amount ?? r.amount), asset: r.asset, network: r.network,
    at: r.updated_at || r.created_at, txid: r.txid, url: EXPLORER[r.network] ? EXPLORER[r.network] + r.txid : null,
  }))
  return { count: rows.length, total_usd: Math.round(total * 100) / 100, median_minutes: median, items }
}

router.get('/', async (req, res, next) => {
  try {
    const n = Math.min(30, Math.max(3, Number(req.query.n) || 6))
    if (cache.v && cache.n === n && Date.now() - cache.at < 60000) return res.json({ success: true, data: cache.v })
    const v = await build(n)
    cache = { at: Date.now(), n, v }
    res.json({ success: true, data: v })
  } catch (err) { next(err) }
})

export default router
