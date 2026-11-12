import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'
import { lockRate } from '../lib/fx.js'

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

export default router
