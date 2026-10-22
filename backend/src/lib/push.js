import { supabase } from './supabase.js'
import { getSecret, encrypt, clearSecretCache } from './secrets.js'

// Browser push (Web Push). The VAPID key pair is created once and kept encrypted in the database.
// Or set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY as environment variables to use your own.
let boot = null

async function init() {
  let lib
  try { lib = (await import('web-push')).default } catch { console.error('[push] package "web-push" is not installed. Run: npm i web-push (in backend)'); return null }
  let pub = await getSecret('VAPID_PUBLIC_KEY')
  let priv = await getSecret('VAPID_PRIVATE_KEY')
  if (!pub || !priv) {
    const k = lib.generateVAPIDKeys()
    const at = new Date().toISOString()
    const { error } = await supabase.from('integration_secrets').upsert([
      { name: 'VAPID_PUBLIC_KEY', ciphertext: encrypt(k.publicKey), updated_at: at },
      { name: 'VAPID_PRIVATE_KEY', ciphertext: encrypt(k.privateKey), updated_at: at },
    ])
    if (error) { console.error('[push] could not store keys:', error.message, '. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars (npx web-push generate-vapid-keys).'); return null }
    clearSecretCache()
    pub = k.publicKey; priv = k.privateKey
  }
  const front = (process.env.FRONTEND_URL || '').trim()
  lib.setVapidDetails(front.startsWith('https://') ? front : 'mailto:admin@altharaa.app', pub, priv)
  return { lib, pub }
}

export function vapid() {
  if (!boot) boot = init().then(r => { if (!r) boot = null; return r }).catch(e => { boot = null; console.error('[push]', e.message); return null })
  return boot
}

// payload: { title, body, url, tag }
export async function sendPush(userId, payload) {
  const v = await vapid()
  if (!v) return 0
  const { data: subs } = await supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', userId)
  let sent = 0
  for (const s of subs || []) {
    try {
      await v.lib.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 86400 })
      sent++
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await supabase.from('push_subscriptions').delete().eq('id', s.id)
      else console.error('[push]', e.statusCode || e.message)
    }
  }
  return sent
}
