import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'
import { lockRate, refreshRates } from '../lib/fx.js'

// The signed-in user's display currency and the exchange rate locked for them.
const router = Router()
router.use(requireAuth)

router.get('/me', async (req, res, next) => {
  try {
    const uid = req.user.id
    const { data: p } = await supabase.from('profiles').select('preferred_currency').eq('id', uid).single()
    const code = String(p?.preferred_currency || 'USD').toUpperCase()
    const { data: meta } = await supabase.from('currencies').select('*').eq('code', code).maybeSingle()
    const base = { currency: code, symbol: meta?.symbol || code, decimals: Number(meta?.decimals ?? 2) }
    if (code === 'USD') return res.json({ success: true, data: { ...base, rate: 1, locked_at: null } })
    const { data: snap } = await supabase.from('user_currency_rates').select('currency, rate, locked_at').eq('user_id', uid).maybeSingle()
    let row = snap && snap.currency === code ? snap : null
    // First time (older accounts) or the user chose a different currency: lock today's rate once.
    if (!row) row = await lockRate(uid, code).catch(() => null)
    res.json({ success: true, data: { ...base, rate: row ? Number(row.rate) : null, locked_at: row ? row.locked_at : null } })
  } catch (err) { next(err) }
})

// USD -> currency rates, used to show investment amounts in crypto and in the user's own currency.
async function readRates() {
  const { data } = await supabase.from('currency_rates').select('quote_currency, rate').eq('base_currency', 'USD')
  return data || []
}
router.get('/rates', async (_req, res, next) => {
  try {
    let rows = await readRates()
    if (!rows.length) { await refreshRates().catch(e => console.error('[fx] refresh failed:', e.message)); rows = await readRates() }
    const out = { USD: 1 }
    for (const r of rows) if (r.quote_currency !== 'NGN' && Number(r.rate) > 0) out[r.quote_currency] = Number(r.rate)
    res.json({ success: true, data: out })
  } catch (err) { next(err) }
})

export default router
