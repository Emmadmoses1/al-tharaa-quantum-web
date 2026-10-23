// A stable per-browser id kept in localStorage, a cookie and IndexedDB (restored from any that survives),
// plus a coarse fingerprint. Used to detect several accounts created on one device.
const KEY = 'aq_device'

function fromCookie(): string | null {
  try { return document.cookie.split('; ').find(c => c.startsWith(KEY + '='))?.split('=')[1] || null } catch { return null }
}
function fromLocal(): string | null { try { return localStorage.getItem(KEY) } catch { return null } }

function idb<T>(run: (s: IDBObjectStore) => IDBRequest<T>, write: boolean): Promise<T | null> {
  return new Promise(resolve => {
    try {
      const open = indexedDB.open('aq', 1)
      open.onupgradeneeded = () => open.result.createObjectStore('kv')
      open.onerror = () => resolve(null)
      open.onsuccess = () => {
        try {
          const tx = open.result.transaction('kv', write ? 'readwrite' : 'readonly')
          const rq = run(tx.objectStore('kv'))
          rq.onsuccess = () => resolve(rq.result)
          rq.onerror = () => resolve(null)
        } catch { resolve(null) }
      }
    } catch { resolve(null) }
  })
}

async function sha(text: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40)
  } catch { return '' }
}

async function fingerprint(): Promise<string> {
  let canvas = ''
  try {
    const c = document.createElement('canvas')
    const x = c.getContext('2d')
    if (x) { x.textBaseline = 'top'; x.font = '14px Arial'; x.fillText('Al Tharaa Quantum \u2728', 2, 2); canvas = c.toDataURL().slice(-60) }
  } catch { /* ignore */ }
  const n = navigator as Navigator & { deviceMemory?: number }
  return sha([n.userAgent, n.language, n.platform, n.hardwareConcurrency, n.deviceMemory, screen.width, screen.height, screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone, canvas].join('|'))
}

export async function getDevice(): Promise<{ id: string; fp: string }> {
  let id = fromLocal() || fromCookie() || (await idb<string>(s => s.get(KEY), false))
  if (!id || id.length < 8) id = (crypto.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`)
  try { localStorage.setItem(KEY, id) } catch { /* ignore */ }
  try { document.cookie = `${KEY}=${id}; max-age=63072000; path=/; SameSite=Lax` } catch { /* ignore */ }
  await idb(s => s.put(id as string, KEY), true)
  return { id, fp: await fingerprint() }
}
