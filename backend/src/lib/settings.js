import { supabase } from './supabase.js'

export const DEFAULTS = {
  general: { platform_name: 'الثراء كوانتوم', support_email: '', maintenance: false, maintenance_message: '' },
  bonus: { enabled: true, usd: 5, daily_cap: 50, require_email_confirmed: true },
  referral: { enabled: false, reward_usdt: 0, min_deposit_usdt: 20 },
  investments: { early_redeem_enabled: true, early_redeem_penalty_percent: 10 },
  invoice: { company_name: 'AL THARAA QUANTUM', address: '', tax_id: '', footer: 'Thank you for your deposit.', start_after: null },
  payments: { nowpayments_enabled: false, sandbox: false, min_usd: 10, max_usd: 5000 },
  email: { enabled: true, from: '', notify_deposit: true },
}

let cache = { at: 0, rows: null }
export function clearSettingsCache() { cache = { at: 0, rows: null } }

async function load() {
  if (cache.rows && Date.now() - cache.at < 5000) return cache.rows
  const { data } = await supabase.from('platform_settings').select('key, value')
  cache = { at: Date.now(), rows: new Map((data || []).map(r => [r.key, r.value])) }
  return cache.rows
}

export async function getSetting(key) {
  const rows = await load()
  return { ...(DEFAULTS[key] || {}), ...(rows.get(key) || {}) }
}

export async function saveSetting(key, patch, userId = null) {
  const cur = await getSetting(key)
  const value = { ...cur, ...patch }
  const { error } = await supabase.from('platform_settings').upsert({ key, value, updated_at: new Date().toISOString(), updated_by: userId })
  if (error) throw error
  clearSettingsCache()
  return value
}
