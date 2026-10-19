import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('platform_statistics')
      .select('metric_key, metric_value, display_value')
      .eq('is_visible', true)

    if (error) throw error

    const stats = {}
    for (const row of data || []) {
      stats[row.metric_key] = {
        value: row.metric_value,
        display: row.display_value,
      }
    }

    res.json({ success: true, data: stats })
  } catch (err) {
    next(err)
  }
})

export default router
