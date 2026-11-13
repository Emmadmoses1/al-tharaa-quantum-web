import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'
import { getPrice } from '../services/prices.js'

// Money in and out for the admin dashboard, computed from real invoices and completed withdrawals.
const router = Router()
router.use(requireAdmin)
const STABLE = new Set(['USDT', 'USDC'])
const r2 = v => Math.round(v * 100) / 100

router.get('/', async (req, res, next) => {
  try {
    if (!['admin', 'super_admin', 'finance'].includes(req.userRole)) {
      return res.status(403).json({ success: false, error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } })
    }
    const now = Date.now()
    const d30 = new Date(now - 30 * 86400000).toISOString()
    const cut24 = now - 86400000
    const [inv, wd] = await Promise.all([
      supabase.from('invoices').select('usd_value, issued_at').gte('issued_at', d30).limit(5000),
      supabase.from('withdrawals').select('asset, net_amount, amount, updated_at').eq('status', 'completed').gte('updated_at', d30).limit(5000),
    ])
    if (inv.error) throw inv.error
    if (wd.error) throw wd.error

    const price = {}
    for (const a of [...new Set((wd.data || []).map(w => w.asset))].filter(a => !STABLE.has(a))) {
      try { price[a] = await getPrice(a) } catch { price[a] = null }
    }
    const out = { dep24: { usd: 0, count: 0 }, dep30: { usd: 0, count: 0 }, wd24: { usd: 0, count: 0 }, wd30: { usd: 0, count: 0 } }
    for (const i of inv.data || []) {
      const v = Number(i.usd_value || 0)
      out.dep30.usd += v; out.dep30.count++
      if (new Date(i.issued_at).getTime() >= cut24) { out.dep24.usd += v; out.dep24.count++ }
    }
    for (const w of wd.data || []) {
      const amt = Number(w.net_amount ?? w.amount)
      const v = STABLE.has(w.asset) ? amt : price[w.asset] ? amt * price[w.asset] : 0
      out.wd30.usd += v; out.wd30.count++
      if (new Date(w.updated_at).getTime() >= cut24) { out.wd24.usd += v; out.wd24.count++ }
    }
    for (const k of Object.keys(out)) out[k].usd = r2(out[k].usd)
    res.json({ success: true, data: out })
  } catch (err) { next(err) }
})

export default router
