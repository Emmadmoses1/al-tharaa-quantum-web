import { fetchJson } from './prices.js'

const TOKENS = {
  'USDT:TRC20': { kind: 'trc20', contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' },
  'USDT:ERC20': { kind: 'evm', chainid: 1, contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  'USDC:ERC20': { kind: 'evm', chainid: 1, contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  'USDT:BEP20': { kind: 'evm', chainid: 56, contract: '0x55d398326f99059fF775485246999027B3197955' },
  'USDC:BEP20': { kind: 'evm', chainid: 56, contract: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
  'ETH:ERC20': { kind: 'evm-native', chainid: 1 },
  'BTC:Bitcoin': { kind: 'btc' },
}

const scale = (v, dec) => Number(v) / 10 ** Number(dec)

async function tron(address, contract) {
  const h = process.env.TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY } : {}
  const base = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?only_to=true&limit=50&contract_address=${contract}`
  const [all, done] = await Promise.all([fetchJson(base, h), fetchJson(base + '&only_confirmed=true', h)])
  const confirmed = new Set((done.data || []).map(t => t.transaction_id))
  return (all.data || [])
    .filter(t => t.to === address)
    .map(t => ({
      txid: t.transaction_id,
      amount: scale(t.value, t.token_info?.decimals ?? 6),
      confirmations: confirmed.has(t.transaction_id) ? 999 : 0,
      ts: t.block_timestamp,
    }))
}

async function evm(address, cfg) {
  const key = process.env.ETHERSCAN_API_KEY
  if (!key) throw new Error('ETHERSCAN_API_KEY is not set')
  const action = cfg.kind === 'evm-native' ? 'txlist' : 'tokentx'
  const extra = cfg.contract ? `&contractaddress=${cfg.contract}` : ''
  const url = `https://api.etherscan.io/v2/api?chainid=${cfg.chainid}&module=account&action=${action}${extra}&address=${address}&page=1&offset=50&sort=desc&apikey=${key}`
  const d = await fetchJson(url)
  if (!Array.isArray(d.result)) {
    if (/no transactions/i.test(String(d.message))) return []
    throw new Error(`Explorer: ${String(d.result || d.message).slice(0, 120)}`)
  }
  return d.result
    .filter(t => String(t.to).toLowerCase() === address.toLowerCase() && t.isError !== '1')
    .map(t => ({
      txid: t.hash,
      amount: scale(t.value, cfg.contract ? t.tokenDecimal : 18),
      confirmations: Number(t.confirmations || 0),
      ts: Number(t.timeStamp) * 1000,
    }))
}

async function btc(address) {
  const [txs, tip] = await Promise.all([
    fetchJson(`https://mempool.space/api/address/${address}/txs`),
    fetchJson('https://mempool.space/api/blocks/tip/height'),
  ])
  return txs.map(t => {
    const sats = (t.vout || []).filter(o => o.scriptpubkey_address === address).reduce((s, o) => s + o.value, 0)
    return {
      txid: t.txid,
      amount: sats / 1e8,
      confirmations: t.status?.confirmed ? Number(tip) - t.status.block_height + 1 : 0,
      ts: (t.status?.block_time || Math.floor(Date.now() / 1000)) * 1000,
    }
  }).filter(t => t.amount > 0)
}

export async function getIncoming(asset, network, address) {
  const cfg = TOKENS[`${asset}:${network}`]
  if (!cfg) throw new Error(`Auto-detect not supported for ${asset}/${network}`)
  if (cfg.kind === 'trc20') return tron(address, cfg.contract)
  if (cfg.kind === 'btc') return btc(address)
  return evm(address, cfg)
}
