import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'

const router = Router()
router.use(requireAdmin)

router.get('/', async (req, res, next) => {
  try {
    const days = [1, 7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 7
    const { data, error } = await supabase.rpc('analytics_summary', { p_days: days })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

export default router
