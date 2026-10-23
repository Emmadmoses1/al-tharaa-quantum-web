// Who is calling: real IP and country (Cloudflare header first, then a cached IP lookup).
export function clientIp(req) {
  const h = req.headers
  const raw = h['cf-connecting-ip'] || String(h['x-forwarded-for'] || '').split(',')[0] || req.ip || ''
  return String(raw).trim().replace(/^::ffff:/, '').slice(0, 64) || null
}

const geo = new Map() // ip -> { c, at }

export async function clientCountry(req) {
  const hdr = String(req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || '').toUpperCase()
  if (/^[A-Z]{2}$/.test(hdr) && hdr !== 'XX' && hdr !== 'T1') return hdr
  const ip = clientIp(req)
  if (!ip || /^(10\.|127\.|192\.168\.|::1)/.test(ip)) return null
  const hit = geo.get(ip)
  if (hit && Date.now() - hit.at < 6 * 3600 * 1000) return hit.c
  let c = null
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 2500)
    const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code`, { signal: ctl.signal })
    clearTimeout(t)
    const d = await r.json()
    if (d?.success && /^[A-Za-z]{2}$/.test(d.country_code || '')) c = d.country_code.toUpperCase()
  } catch { /* ignore */ }
  if (geo.size > 2000) geo.clear()
  geo.set(ip, { c, at: Date.now() })
  return c
}

export const logEvent = (supabase, user_id, type, req, meta = {}) =>
  supabase.from('user_events').insert({ user_id, type, ip: req ? clientIp(req) : null, meta }).then(() => {}, () => {})
