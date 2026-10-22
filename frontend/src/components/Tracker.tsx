import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

// Counts page views for the admin Traffic page. No cookies, no IP address, nothing personal. Skips admin pages.
export default function Tracker() {
  const loc = useLocation()
  const last = useRef('')

  useEffect(() => {
    try {
      if (navigator.doNotTrack === '1' || loc.pathname.startsWith('/admin')) return
      const key = loc.pathname + loc.search
      if (last.current === key) return
      last.current = key
      let sid = sessionStorage.getItem('sid')
      const entry = !sid
      if (!sid) {
        sid = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('')
        sessionStorage.setItem('sid', sid)
      }
      const q = new URLSearchParams(loc.search)
      const body: Record<string, unknown> = { sid, path: loc.pathname, entry }
      if (entry) {
        body.ref = document.referrer || ''
        for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) body[k] = q.get(k) || ''
      }
      const api = import.meta.env.VITE_API_URL || ''
      if (!api) return
      fetch(`${api}/api/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {})
    } catch { /* tracking is optional */ }
  }, [loc.pathname, loc.search])

  return null
}
