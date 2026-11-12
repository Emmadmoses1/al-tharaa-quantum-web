import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

// Currencies a new user can pick at registration (active ones only; Nigeria's naira is not offered).
const router = Router()
let cache = { at: 0, v: null }

router.get('/', async (_req, res, next) => {
  try {
    if (cache.v && Date.now() - cache.at < 300000) return res.json({ success: true, data: cache.v })
    const { data, error } = await supabase.from('currencies').select('*').eq('is_active', true).order('display_order')
    if (error) throw error
    const list = (data || []).filter(c => c.code !== 'NGN').map(c => ({ code: c.code, name: c.name_ar || c.name || c.code, symbol: c.symbol || c.code }))
    if (!list.some(c => c.code === 'USD')) list.unshift({ code: 'USD', name: 'دولار أمريكي', symbol: '$' })
    cache = { at: Date.now(), v: list }
    res.json({ success: true, data: list })
  } catch (err) { next(err) }
})

export default router
