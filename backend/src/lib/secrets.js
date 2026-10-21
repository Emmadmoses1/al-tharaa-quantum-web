import crypto from 'node:crypto'
import { supabase } from './supabase.js'

// Keys the admin can store from the dashboard. Values are encrypted (AES-256-GCM) before they reach the database.
export const SECRET_NAMES = {
  RESEND_API_KEY: { label: 'Resend (email sending)', help: 'Sends invoices and notification emails. Get it at resend.com.' },
  ANTHROPIC_API_KEY: { label: 'Anthropic (AI text)', help: 'Optional. Used to polish opportunity descriptions and Arabic translations.' },
  OPENAI_API_KEY: { label: 'OpenAI (AI text and images)', help: 'Optional. Used for text polishing and AI cover illustrations.' },
  TRONGRID_API_KEY: { label: 'TronGrid (TRC20 deposits)', help: 'Raises the rate limit for USDT TRC20 deposit detection.' },
  ETHERSCAN_API_KEY: { label: 'Etherscan (ERC20/BEP20/ETH deposits)', help: 'Required to detect ERC20, BEP20 and ETH deposits.' },
}

const aesKey = () => crypto.createHash('sha256').update(process.env.SECRETS_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').digest()

export function encrypt(text) {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', aesKey(), iv)
  const enc = Buffer.concat([c.update(text, 'utf8'), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64')
}

export function decrypt(b64) {
  const b = Buffer.from(b64, 'base64')
  const d = crypto.createDecipheriv('aes-256-gcm', aesKey(), b.subarray(0, 12))
  d.setAuthTag(b.subarray(12, 28))
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8')
}

const cache = new Map()
export function clearSecretCache() { cache.clear() }

// Database value first, then the environment variable of the same name.
export async function getSecret(name) {
  const hit = cache.get(name)
  if (hit && Date.now() - hit.at < 15000) return hit.v
  let v = ''
  try {
    const { data } = await supabase.from('integration_secrets').select('ciphertext').eq('name', name).maybeSingle()
    if (data?.ciphertext) v = decrypt(data.ciphertext)
  } catch (e) { console.error(`[secrets] ${name}: ${e.message}`) }
  if (!v) v = process.env[name] || ''
  cache.set(name, { at: Date.now(), v })
  return v
}

export async function secretStatus() {
  const { data } = await supabase.from('integration_secrets').select('name, ciphertext, updated_at')
  const rows = new Map((data || []).map(r => [r.name, r]))
  return Object.entries(SECRET_NAMES).map(([name, meta]) => {
    const r = rows.get(name)
    let preview = ''
    let source = 'none'
    if (r) { try { preview = '••••' + decrypt(r.ciphertext).slice(-4); source = 'database' } catch { source = 'unreadable' } }
    else if (process.env[name]) { preview = '••••' + process.env[name].slice(-4); source = 'environment' }
    return { name, ...meta, configured: source === 'database' || source === 'environment', source, preview, updated_at: r?.updated_at || null }
  })
}
