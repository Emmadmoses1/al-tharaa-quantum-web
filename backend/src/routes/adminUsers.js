import { Router } from 'express'
import Joi from 'joi'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'

const router = Router()
router.use(requireAdmin)
const schema = Joi.object({ suspend: Joi.boolean().required(), reason: Joi.string().trim().max(200).allow('').default('') })

router.post('/:id/suspend', async (req, res, next) => {
  try {
    if (!['admin', 'super_admin'].includes(req.userRole)) return res.status(403).json({ success: false, error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } })
    const { value, error: ve } = schema.validate(req.body)
    if (ve) return res.status(400).json({ success: false, error: { message: ve.message, code: 'BAD_REQUEST' } })
    if (req.params.id === req.user.id) return res.status(400).json({ success: false, error: { message: 'You cannot suspend yourself', code: 'BAD_REQUEST' } })
    const { data: target } = await supabase.from('profiles').select('role').eq('id', req.params.id).single()
    if (!target) return res.status(404).json({ success: false, error: { message: 'User not found', code: 'NOT_FOUND' } })
    if (target.role !== 'user' && req.userRole !== 'super_admin') return res.status(403).json({ success: false, error: { message: 'Only a super admin can suspend staff', code: 'FORBIDDEN' } })
    const { error } = await supabase.rpc('admin_set_suspended', { p_user: req.params.id, p_suspend: value.suspend, p_reason: value.reason || null })
    if (error) throw error
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: value.suspend ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED', entity: 'profiles', entity_id: req.params.id, metadata: { reason: value.reason } })
    res.json({ success: true, data: { suspended: value.suspend } })
  } catch (err) { next(err) }
})

export default router
