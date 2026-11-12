import { supabase } from './supabase.js'

// Exchange rates (USD -> currency) come from a free public feed and are stored in currency_rates.
// A user's rate is locked once, when they pick their currency at registration, and never changes by itself.
const FEED = 'https://open.er-api.com/v6/latest/USD'
const EXCLUDED = new Set(['NGN'])
const MAX_AGE_MS = 2 * 24 * 3600000

export async function refreshRates() {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 10000)
  try {
    const res = await fetch(FEED, { signal: ctl.signal })
    const j = await res.json()
    if (!res.ok || j?.result !== 'success' || !j.rates) throw new Error('FX feed returned no rates')
    const { data: cur } = await supabase.from('currencies').select('code').eq('is_active', true)
    const now = new Date().toISOString()
    const rows = (cur || []).map(c => c.code).filter(c => c !== 'USD' && !EXCLUDED.has(c) && Number(j.rates[c]) > 0)
      .map(c => ({ base_currency: 'USD', quote_currency: c, rate: Number(j.rates[c]), provider: 'open.er-api.com', timestamp: now }))
    if (rows.length) {
      const { error } = await supabase.from('currency_rates').upsert(rows, { onConflict: 'base_currency,quote_currency' })
      if (error) throw error
    }
    return rows.length
  } finally { clearTimeout(timer) }
}

export async function usdTo(code) {
  if (code === 'USD') return 1
  const read = () => supabase.from('currency_rates').select('rate, timestamp').eq('base_currency', 'USD').eq('quote_currency', code).maybeSingle()
  let { data } = await read()
  if (!data || Date.now() - new Date(data.timestamp).getTime() > MAX_AGE_MS) {
    try { await refreshRates(); ({ data } = await read()) } catch (e) { console.error('[fx] refresh failed:', e.message) }
  }
  return data?.rate ? Number(data.rate) : null
}

// Returns the code only if it is an active, allowed display currency.
export async function validCurrency(code) {
  const c = String(code || '').trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(c) || EXCLUDED.has(c)) return null
  if (c === 'USD') return c
  const { data } = await supabase.from('currencies').select('code').eq('code', c).eq('is_active', true).maybeSingle()
  return data ? c : null
}

export async function lockRate(uid, currency) {
  const rate = await usdTo(currency)
  if (!rate) return null
  const row = { user_id: uid, currency, rate, locked_at: new Date().toISOString() }
  const { error } = await supabase.from('user_currency_rates').upsert(row, { onConflict: 'user_id' })
  if (error) throw error
  return row
}
