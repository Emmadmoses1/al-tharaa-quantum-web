import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'

// The signed-in user's own results, computed from their closed trades and settled binary orders. Nothing estimated.
const router = Router()
router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const uid = req.user.id
    const [t, b] = await Promise.all([
      supabase.from('trades').select('realized_pnl, created_at').eq('user_id', uid).eq('status', 'closed').not('realized_pnl', 'is', null).order('created_at', { ascending: false }).limit(1000),
      supabase.from('binary_orders').select('status, amount, payout, created_at').eq('user_id', uid).in('status', ['won', 'lost']).order('created_at', { ascending: false }).limit(1000),
    ])
    const rows = []
    for (const r of t.data || []) rows.push({ at: r.created_at, net: Number(r.realized_pnl) })
    for (const r of b.data || []) rows.push({ at: r.created_at, net: r.status === 'won' ? Number(r.payout) - Number(r.amount) : -Number(r.amount) })
    const ok = rows.filter(r => Number.isFinite(r.net)).sort((a, c) => new Date(a.at) - new Date(c.at))
    const count = ok.length
    const wins = ok.filter(r => r.net > 0).length
    const losses = ok.filter(r => r.net < 0).length
    let run = 0
    const cum = ok.map(r => (run += r.net))
    const step = Math.max(1, Math.ceil(cum.length / 60))
    const series = cum.filter((_, i) => i % step === 0 || i === cum.length - 1).map(v => Math.round(v * 100) / 100)
    const r2 = n => Math.round(n * 100) / 100
    res.json({ success: true, data: {
      count, wins, losses,
      win_rate: wins + losses ? Math.round((wins / (wins + losses)) * 1000) / 10 : 0,
      net: r2(run), best: count ? r2(Math.max(...ok.map(r => r.net))) : 0, worst: count ? r2(Math.min(...ok.map(r => r.net))) : 0,
      series,
    } })
  } catch (err) { next(err) }
})

export default router
