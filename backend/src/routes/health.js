import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1)
    res.json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api: 'online',
        database: error ? 'error' : 'online',
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, status: 'error', message: err.message })
  }
})

export default router
