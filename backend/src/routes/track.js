import { Router } from 'express'
import Joi from 'joi'
import { supabase } from '../lib/supabase.js'

// Public, privacy-light page view collector. No IP address, no cookie, no user id.
const router = Router()
const hits = new Map()
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|monitor|uptime|curl|wget|python-requests/i

const SOURCES = [
  [/(^|\.)google\./, 'google'], [/(^|\.)bing\.com$/, 'bing'], [/duckduckgo\.com$/, 'duckduckgo'], [/(^|\.)yahoo\./, 'yahoo'],
  [/(^|\.)(facebook|fb)\.com$|^l\.facebook\.com$|^lm\.facebook\.com$/, 'facebook'], [/instagram\.com$/, 'instagram'],
  [/^t\.co$|twitter\.com$|(^|\.)x\.com$/, 'x'], [/^t\.me$|telegram\./, 'telegram'], [/whatsapp\.com$|^wa\.me$/, 'whatsapp'],
  [/youtube\.com$|^youtu\.be$/, 'youtube'], [/linkedin\.com$|^lnkd\.in$/, 'linkedin'], [/tiktok\.com$/, 'tiktok'], [/reddit\.com$/, 'reddit'],
]
const classify = (host, utm) => {
  if (utm) return { source: utm.toLowerCase().slice(0, 40), known: true }
  if (!host) return { source: 'direct' }
  for (const [re, name] of SOURCES) if (re.test(host)) return { source: name }
  return { source: 'other' }
}
const device = (ua) => /ipad|tablet/i.test(ua) ? 'tablet' : /mobi|android|iphone/i.test(ua) ? 'mobile' : 'desktop'

const schema = Joi.object({
  sid: Joi.string().alphanum().min(8).max(40).required(),
  path: Joi.string().max(200).pattern(/^\//).required(),
  entry: Joi.boolean().default(false),
  ref: Joi.string().max(300).allow('').default(''),
  utm_source: Joi.string().max(60).allow('').default(''),
  utm_medium: Joi.string().max(60).allow('').default(''),
  utm_campaign: Joi.string().max(80).allow('').default(''),
})

router.post('/', async (req, res) => {
  try {
    const ua = String(req.headers['user-agent'] || '')
    const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim()
    const h = hits.get(ip) || { n: 0, at: Date.now() }
    if (Date.now() - h.at > 60000) { h.n = 0; h.at = Date.now() }
    h.n++; hits.set(ip, h)
    if (hits.size > 5000) hits.clear()
    if (h.n > 60 || !ua || BOT.test(ua)) return res.status(204).end()
    const { value, error } = schema.validate(req.body)
    if (error || /^\/(admin|api)/.test(value.path)) return res.status(204).end()
    let refHost = null
    try { if (value.ref) refHost = new URL(value.ref).hostname.replace(/^www\./, '').toLowerCase().slice(0, 100) } catch { /* ignore */ }
    const own = (process.env.FRONTEND_URL || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (refHost && own && refHost === own) refHost = null
    const { source } = classify(refHost, value.utm_source)
    await supabase.from('page_views').insert({
      sid: value.sid, path: value.path.split('?')[0], is_entry: value.entry, referrer_host: value.entry ? refHost : null,
      source: value.entry ? source : null, medium: value.entry ? (value.utm_medium || null) : null, campaign: value.entry ? (value.utm_campaign || null) : null,
      country: String(req.headers['cf-ipcountry'] || '').slice(0, 2).toUpperCase() || null, device: device(ua),
    })
    res.status(204).end()
  } catch { res.status(204).end() }
})

export default router
