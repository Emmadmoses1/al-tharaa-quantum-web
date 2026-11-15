import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

// Track record: completed opportunities only. "actual_return_percent" is entered by the admin from the real
// outcome; when it is empty nothing about returns is shown. Nothing here is estimated.
const router = Router()
let cache = { at: 0, v: null }

router.get('/', async (_req, res, next) => {
  try {
    if (cache.v && Date.now() - cache.at < 60000) return res.json({ success: true, data: cache.v })
    const { data: opps, error } = await supabase.from('investment_opportunities')
      .select('id, name, name_ar, category, currency, target_amount, amount_raised, duration_days, actual_return_percent, cover_image_url, created_at')
      .eq('status', 'completed').order('created_at', { ascending: false }).limit(50)
    if (error) throw error
    const ids = (opps || []).map(o => o.id)
    const investors = {}
    if (ids.length) {
      const { data: al } = await supabase.from('investment_allocations').select('opportunity_id, user_id').in('opportunity_id', ids).limit(20000)
      const sets = {}
      for (const a of al || []) (sets[a.opportunity_id] ||= new Set()).add(a.user_id)
      for (const id of ids) investors[id] = sets[id] ? sets[id].size : 0
    }
    const items = (opps || []).map(o => ({
      id: o.id, name: o.name, name_ar: o.name_ar, category: o.category, currency: o.currency,
      raised: Number(o.amount_raised || 0), target: Number(o.target_amount || 0), duration_days: o.duration_days,
      actual_return_percent: o.actual_return_percent == null ? null : Number(o.actual_return_percent),
      cover_image_url: o.cover_image_url, investors: investors[o.id] || 0,
    }))
    const v = { count: items.length, items }
    cache = { at: Date.now(), v }
    res.json({ success: true, data: v })
  } catch (err) { next(err) }
})

export default router
