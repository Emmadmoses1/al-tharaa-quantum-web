import { Router } from 'express'
import { isBlockedDevice } from '../lib/deviceBan.js'
import { clientIp } from '../lib/client.js'

// Called when the site opens in a browser. Answers only "blocked or not": no reason is revealed.
const router = Router()
const hits = new Map()
router.post('/', async (req, res) => {
  try {
    const ip = clientIp(req) || 'x'
    const h = hits.get(ip) || { n: 0, t: Date.now() }
    if (Date.now() - h.t > 60000) { h.n = 0; h.t = Date.now() }
    h.n++; hits.set(ip, h)
    if (hits.size > 5000) hits.clear()
    if (h.n > 60) return res.json({ success: true, data: { blocked: false } })
    const id = String(req.body?.device?.id || '').trim()
    if (id.length < 8 || id.length > 80) return res.json({ success: true, data: { blocked: false } })
    res.json({ success: true, data: { blocked: await isBlockedDevice({ id }) } })
  } catch { res.json({ success: true, data: { blocked: false } }) }
})
export default router
