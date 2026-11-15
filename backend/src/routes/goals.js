import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'

// Savings goals are a personal tracker only: they never move money. Progress is computed on the client from the real wallet balance.
const router = Router()
router.use(requireAuth)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const bad = (res, message, code = 'BAD_REQUEST') => res.status(400).json({ success: false, error: { message, code } })

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('savings_goals').select('id, name, target_usd, deadline, created_at')
      .eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(20)
    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (err) { next(err) }
})

router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim()
    const target = Number(req.body?.target_usd)
    const deadline = req.body?.deadline ? String(req.body.deadline) : null
    if (name.length < 2 || name.length > 60) return bad(res, 'Name must be 2 to 60 characters. الاسم من 2 إلى 60 حرفاً.')
    if (!Number.isFinite(target) || target <= 0 || target > 1e9) return bad(res, 'Enter a valid target amount. أدخل مبلغاً صحيحاً.')
    if (deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(Date.parse(deadline)))) return bad(res, 'Invalid date. تاريخ غير صالح.')
    const { count } = await supabase.from('savings_goals').select('id', { count: 'exact', head: true }).eq('user_id', req.user.id)
    if ((count || 0) >= 10) return bad(res, 'You can have up to 10 goals. الحد الأقصى 10 أهداف.', 'LIMIT')
    const { data, error } = await supabase.from('savings_goals')
      .insert({ user_id: req.user.id, name, target_usd: target, deadline }).select('id, name, target_usd, deadline, created_at').single()
    if (error) throw error
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
})

router.post('/:id/delete', async (req, res, next) => {
  try {
    if (!UUID.test(String(req.params.id))) return bad(res, 'Invalid id.')
    const { error } = await supabase.from('savings_goals').delete().eq('id', req.params.id).eq('user_id', req.user.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { next(err) }
})

export default router
