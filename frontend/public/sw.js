// Installable app + push notifications + fast repeat visits.
// Caches only static files of this site (hashed JS/CSS, icons, images). API calls, Supabase and fonts are never touched,
// and pages are always fetched from the network first, so users get new releases immediately.
const V = 'aq-v2'
const STATIC = V + '-static'
const PAGES = V + '-pages'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil((async () => {
  const keys = await caches.keys()
  await Promise.all(keys.filter(k => !k.startsWith(V)).map(k => caches.delete(k)))
  await self.clients.claim()
})()))

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(PAGES).then(c => c.put('/', copy)) }
      return r
    }).catch(async () => (await caches.match('/')) || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })))
    return
  }

  if (url.pathname.startsWith('/assets/') || /\.(png|jpe?g|svg|webp|ico|woff2?)$/i.test(url.pathname)) {
    e.respondWith(caches.open(STATIC).then(async c => {
      const hit = await c.match(req)
      if (hit) return hit
      const r = await fetch(req)
      if (r.ok) c.put(req, r.clone())
      return r
    }))
  }
})

self.addEventListener('push', e => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { body: e.data ? e.data.text() : '' } }
  e.waitUntil(self.registration.showNotification(d.title || 'الثراء كوانتوم', {
    body: d.body || '', icon: '/icon-192.png', badge: '/icon-192.png', tag: d.tag || undefined,
    data: { url: d.url || '/dashboard' }, dir: 'rtl', lang: 'ar', vibrate: [80, 40, 80],
  }))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/dashboard'
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if ('focus' in c) { if ('navigate' in c) c.navigate(url).catch(() => {}); return c.focus() }
    }
    return self.clients.openWindow(url)
  }))
})
