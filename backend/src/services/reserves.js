import { supabase } from '../lib/supabase.js'
import { fetchJson } from './prices.js'

const TOKEN = {
  'USDT:TRC20': { contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', dec: 6 },
  'USDT:ERC20': { chainid: 1, contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7', dec: 6 },
  'USDC:ERC20': { chainid: 1, contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', dec: 6 },
  'USDT:BEP20': { chainid: 56, contract: '0x55d398326f99059fF775485246999027B3197955', dec: 18 },
  'USDC:BEP20': { chainid: 56, contract: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', dec: 18 },
}

async function holding(asset, network, address) {
  const key = `${asset}:${network}`
  if (key === 'BTC:Bitcoin') {
    const d = await fetchJson(`https://mempool.space/api/address/${address}`)
    return (d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum) / 1e8
  }
  const t = TOKEN[key]
  if (network === 'TRC20') {
    const h = process.env.TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY } : {}
    const d = await fetchJson(`https://api.trongrid.io/v1/accounts/${address}`, h)
    const hit = (d.data?.[0]?.trc20 || []).find(o => o[t.contract] !== undefined)
    return hit ? Number(hit[t.contract]) / 10 ** t.dec : 0
  }
  const k = process.env.ETHERSCAN_API_KEY
  if (!k) throw new Error('ETHERSCAN_API_KEY is not set')
  const chainid = key === 'ETH:ERC20' ? 1 : t.chainid
  const q = key === 'ETH:ERC20'
    ? 'action=balance'
    : `action=tokenbalance&contractaddress=${t.contract}`
  const d = await fetchJson(`https://api.etherscan.io/v2/api?chainid=${chainid}&module=account&${q}&address=${address}&tag=latest&apikey=${k}`)
  if (!/^\d+$/.test(String(d.result))) throw new Error(`Explorer: ${String(d.result || d.message).slice(0, 100)}`)
  return Number(d.result) / 10 ** (key === 'ETH:ERC20' ? 18 : t.dec)
}

export async function getReserves() {
  const { data: addrs, error } = await supabase.from('deposit_addresses').select('asset, network, address')
  if (error) throw error

  const seen = new Set()
  const holdings = {}, errors = {}
  for (const a of addrs || []) {
    const k = `${a.asset}|${a.network}|${a.address}`
    if (seen.has(k)) continue
    seen.add(k)
    try { holdings[a.asset] = (holdings[a.asset] || 0) + await holding(a.asset, a.network, a.address) }
    catch (e) { (errors[a.asset] ||= []).push(`${a.network}: ${e.message}`) }
  }

  const { data: totals, error: tErr } = await supabase.rpc('balance_totals')
  if (tErr) throw tErr
  const owed = {}
  for (const t of totals || []) owed[t.asset] = (owed[t.asset] || 0) + Number(t.total)
  // Money inside open trades was debited from the ledger but is still owed to the user
  const { data: open } = await supabase.from('trades').select('amount_usdt').eq('status', 'open')
  owed.USDT = (owed.USDT || 0) + (open || []).reduce((s, t) => s + Number(t.amount_usdt || 0), 0)

  const assets = [...new Set([...Object.keys(holdings), ...Object.keys(owed), ...Object.keys(errors)])].sort()
  const rows = assets.map(asset => {
    const h = holdings[asset] ?? 0, o = owed[asset] ?? 0, delta = h - o
    const status = errors[asset] ? 'incomplete' : delta < -(o * 0.001) - 1e-9 ? 'shortfall' : 'ok'
    return { asset, holdings: h, owed: o, delta, status, errors: errors[asset] || [] }
  })
  return { generated_at: new Date().toISOString(), rows }
}
