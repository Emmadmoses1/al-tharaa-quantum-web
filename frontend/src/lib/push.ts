import { api } from './api'

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function keyBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

async function registration() {
  await navigator.serviceWorker.register('/sw.js')
  return navigator.serviceWorker.ready
}

async function sync(reg: ServiceWorkerRegistration) {
  const { key } = await api.get<{ key: string | null }>('/api/push/key')
  if (!key) return false
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) as unknown as BufferSource })
  const j = sub.toJSON()
  await api.post('/api/push/subscribe', { endpoint: j.endpoint, keys: j.keys })
  return true
}

// Must be called from a click (browsers require a user gesture to ask for permission).
export async function enablePush(): Promise<boolean> {
  try {
    if (!pushSupported()) return false
    if ((await Notification.requestPermission()) !== 'granted') return false
    return await sync(await registration())
  } catch { return false }
}

// Quietly re-registers this device when permission was already given.
export async function resyncPush() {
  try {
    if (pushSupported() && Notification.permission === 'granted') await sync(await registration())
  } catch { /* ignore */ }
}

// Shows a notification from the open page (used when a payment is confirmed).
export async function localNotify(title: string, body: string) {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return
    const reg = await navigator.serviceWorker.getRegistration()
    if (reg) await reg.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', dir: 'rtl', lang: 'ar' })
  } catch { /* ignore */ }
}
