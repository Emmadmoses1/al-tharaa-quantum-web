import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'

const router = Router()

router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, nationality, preferred_currency, preferred_language, role, kyc_status, created_at')
      .eq('id', req.user.id)
      .single()

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

router.patch('/', async (req, res, next) => {
  try {
    const allowed = ['full_name', 'phone', 'preferred_currency', 'preferred_language']
    const updates = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single()

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

export default router
