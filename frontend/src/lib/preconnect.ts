// Open the network connections to the API and the database early, so the first request after the page loads is faster.
for (const u of [import.meta.env.VITE_API_URL, import.meta.env.VITE_SUPABASE_URL]) {
  try {
    if (!u) continue
    const origin = new URL(String(u)).origin
    if (document.head.querySelector(`link[rel="preconnect"][href="${origin}"]`)) continue
    const l = document.createElement('link')
    l.rel = 'preconnect'; l.href = origin; l.crossOrigin = 'anonymous'
    document.head.appendChild(l)
  } catch { /* an invalid URL only means no early connection */ }
}
export {}
