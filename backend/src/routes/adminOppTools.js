import { Router } from 'express'
import dns from 'dns/promises'
import net from 'net'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'

// Admin tools for opportunities: RSS finder (feeds -> items with image/video) and safe deletion.
const router = Router()
router.use(requireAdmin)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const bad = (res, message, code = 'BAD_REQUEST', status = 400) => res.status(status).json({ success: false, error: { message, code } })
const canWrite = req => ['admin', 'super_admin'].includes(req.userRole)
const deny = res => bad(res, 'Insufficient permissions', 'FORBIDDEN', 403)

// ---------- safe outbound fetch (https only, no private networks, size and time limits) ----------
export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
  }
  const v = ip.toLowerCase()
  if (v === '::1' || v === '::') return true
  if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7))
  return v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')
}

async function assertPublic(urlStr) {
  let u
  try { u = new URL(urlStr) } catch { throw new Error('Invalid link') }
  if (u.protocol !== 'https:') throw new Error('Only https links are allowed')
  if (u.port && u.port !== '443') throw new Error('Only the standard https port is allowed')
  const host = u.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('This address is not allowed')
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true })
  if (!addrs.length || addrs.some(a => isPrivateIp(a.address))) throw new Error('This address is not allowed')
  return u
}

async function fetchLimited(urlStr, { maxBytes = 2_000_000, timeoutMs = 9000, accept = '*/*' } = {}) {
  let url = urlStr
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url)
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), timeoutMs)
    try {
      const r = await fetch(url, { redirect: 'manual', signal: ctl.signal, headers: { 'User-Agent': 'AlTharaaQuantumBot/1.0', Accept: accept } })
      if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { url = new URL(r.headers.get('location'), url).toString(); continue }
      if (!r.ok) throw new Error(`Source answered ${r.status}`)
      const reader = r.body.getReader()
      const chunks = []; let size = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.length
        if (size > maxBytes) { ctl.abort(); throw new Error('The file is too large') }
        chunks.push(value)
      }
      return { buf: Buffer.concat(chunks), contentType: (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase(), finalUrl: url }
    } finally { clearTimeout(timer) }
  }
  throw new Error('Too many redirects')
}

// ---------- RSS / Atom parsing (no dependencies) ----------
const ent = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
function inner(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))
  if (!m) return ''
  const raw = m[1].trim()
  const c = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/)
  return c ? c[1] : ent(raw)
}
const attr = (block, tag, a, filter) => {
  const re = new RegExp(`<${tag}\\b([^>]*)/?>`, 'gi')
  let m
  while ((m = re.exec(block))) {
    if (filter && !filter(m[1])) continue
    const v = m[1].match(new RegExp(`\\b${a}\\s*=\\s*["']([^"']+)["']`, 'i'))
    if (v) return ent(v[1])
  }
  return ''
}
const https = u => (u && /^https:\/\//i.test(u) && u.length < 800 ? u : '')
const text = html => ent(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/p>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim()

export function parseFeed(xml) {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi) || []
  return blocks.slice(0, 30).map(b => {
    const title = text(inner(b, 'title'))
    let link = https(text(inner(b, 'link'))) || https(attr(b, 'link', 'href', a => !/rel\s*=\s*["'](?!alternate)/i.test(a)))
    const html = inner(b, 'content:encoded') || inner(b, 'description') || inner(b, 'content') || inner(b, 'summary')
    const image = https(attr(b, 'media:content', 'url', a => /image/i.test(a) || !/video/i.test(a)))
      || https(attr(b, 'media:thumbnail', 'url')) || https(attr(b, 'enclosure', 'url', a => /image/i.test(a)))
      || https(attr(b, 'itunes:image', 'href')) || https((html.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i) || [])[1] || '')
    let video = https(attr(b, 'media:content', 'url', a => /video/i.test(a))) || https(attr(b, 'enclosure', 'url', a => /video/i.test(a)))
    if (!video) {
      const yt = inner(b, 'yt:videoId') || ((html + ' ' + link).match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/) || [])[1]
      if (yt) video = `https://www.youtube.com/watch?v=${yt}`
      else { const vm = (html + ' ' + link).match(/vimeo\.com\/(?:video\/)?(\d+)/); if (vm) video = `https://vimeo.com/${vm[1]}` }
    }
    return { title, link, summary: text(html).slice(0, 1500), image, video, published: inner(b, 'pubDate') || inner(b, 'published') || inner(b, 'updated') || null }
  }).filter(i => i.title)
}

const cache = new Map()
async function loadFeed(url) {
  const hit = cache.get(url)
  if (hit && Date.now() - hit.at < 300000) return hit.items
  const { buf } = await fetchLimited(url, { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' })
  const items = parseFeed(buf.toString('utf8'))
  cache.set(url, { at: Date.now(), items })
  return items
}

router.get('/feeds', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('rss_feeds').select('id, name, url, created_at').order('created_at', { ascending: false }).limit(30)
    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (err) { next(err) }
})

router.post('/feeds', async (req, res, next) => {
  try {
    if (!canWrite(req)) return deny(res)
    const name = String(req.body?.name || '').trim()
    const url = String(req.body?.url || '').trim()
    if (name.length < 2 || name.length > 60) return bad(res, 'Name must be 2 to 60 characters.')
    let items
    try { items = await loadFeed(url) } catch (e) { return bad(res, `Could not read this feed: ${e.message}`, 'FEED_ERROR') }
    if (!items.length) return bad(res, 'No articles found. Check that this is an RSS or Atom feed link.', 'FEED_EMPTY')
    const { count } = await supabase.from('rss_feeds').select('id', { count: 'exact', head: true })
    if ((count || 0) >= 20) return bad(res, 'Up to 20 feeds.', 'LIMIT')
    const { data, error } = await supabase.from('rss_feeds').insert({ name, url, created_by: req.user.id }).select('id, name, url, created_at').single()
    if (error) return bad(res, error.code === '23505' ? 'This feed is already added.' : error.message, 'DB_ERROR')
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
})

router.post('/feeds/:id/delete', async (req, res, next) => {
  try {
    if (!canWrite(req)) return deny(res)
    if (!UUID.test(String(req.params.id))) return bad(res, 'Invalid id.')
    const { error } = await supabase.from('rss_feeds').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { next(err) }
})

router.get('/items/:feedId', async (req, res, next) => {
  try {
    if (!UUID.test(String(req.params.feedId))) return bad(res, 'Invalid id.')
    const { data: f } = await supabase.from('rss_feeds').select('url').eq('id', req.params.feedId).maybeSingle()
    if (!f) return bad(res, 'Feed not found.', 'NOT_FOUND', 404)
    try { res.json({ success: true, data: await loadFeed(f.url) }) }
    catch (e) { return bad(res, `Could not read this feed: ${e.message}`, 'FEED_ERROR', 502) }
  } catch (err) { next(err) }
})

// Copies a picture from the source into our own storage so the listing never depends on another site.
router.post('/import-image', async (req, res, next) => {
  try {
    if (!canWrite(req)) return deny(res)
    const url = String(req.body?.url || '').trim()
    let got
    try { got = await fetchLimited(url, { maxBytes: 5_000_000, accept: 'image/*' }) } catch (e) { return bad(res, e.message, 'IMAGE_ERROR') }
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[got.contentType]
    if (!ext) return bad(res, 'The source is not a supported image (jpg, png, webp, gif).', 'IMAGE_TYPE')
    const path = `rss-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('opportunity-images').upload(path, got.buf, { contentType: got.contentType, upsert: false })
    if (error) throw error
    res.json({ success: true, data: { url: supabase.storage.from('opportunity-images').getPublicUrl(path).data.publicUrl } })
  } catch (err) { next(err) }
})

// An opportunity with investments can never be deleted (that would orphan real money). Cancel it instead.
router.post('/delete-opportunity/:id', async (req, res, next) => {
  try {
    if (!canWrite(req)) return deny(res)
    const id = String(req.params.id)
    if (!UUID.test(id)) return bad(res, 'Invalid id.')
    const { data: opp } = await supabase.from('investment_opportunities').select('id, name').eq('id', id).maybeSingle()
    if (!opp) return bad(res, 'Opportunity not found.', 'NOT_FOUND', 404)
    const { count } = await supabase.from('investment_allocations').select('id', { count: 'exact', head: true }).eq('opportunity_id', id)
    if (count) return bad(res, `This opportunity has ${count} investment(s) and cannot be deleted. Set its status to Cancelled or Completed instead.`, 'HAS_INVESTMENTS', 409)
    const { error } = await supabase.from('investment_opportunities').delete().eq('id', id)
    if (error) return bad(res, 'It is still linked to other records, so it cannot be deleted. Set its status to Cancelled instead.', 'LINKED', 409)
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'OPPORTUNITY_DELETED', entity: 'investment_opportunities', entity_id: id, metadata: { name: opp.name } })
    res.json({ success: true })
  } catch (err) { next(err) }
})

export default router
