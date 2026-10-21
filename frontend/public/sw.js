// Minimal service worker: makes the site installable. It does not cache anything, so users always get the latest version.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
