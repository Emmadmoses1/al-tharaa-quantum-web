import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'

// The signed-in user's own recent security activity, so they can spot anything they do not recognise.
const router = Router()
router.use(requireAuth)
const SHOW = ['login', 'signup', 'password_reset', 'avatar_changed', 'face_submitted', 'face_approved', 'face_rejected']
const mask = ip => {
  if (!ip) return ''
  if (ip.includes(':')) return ip.split(':').slice(0, 3).join(':') + ':…'
  const p = ip.split('.')
  return p.length === 4 ? `${p[0]}.${p[1]}.•.•` : ''
}

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('user_events').select('type, ip, country, created_at')
      .eq('user_id', req.user.id).in('type', SHOW).order('created_at', { ascending: false }).limit(20)
    if (error) throw error
    res.json({ success: true, data: (data || []).map(e => ({ type: e.type, ip: mask(e.ip), country: e.country || '', at: e.created_at })) })
  } catch (err) { next(err) }
})

export default router
