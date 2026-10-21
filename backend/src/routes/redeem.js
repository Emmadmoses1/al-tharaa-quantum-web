import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'

const router = Router()
router.use(requireAuth)

router.post('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase.rpc('redeem_allocation', { p_alloc: req.params.id, p_user: req.user.id })
    if (error) return res.status(400).json({ success: false, error: { message: error.message, code: 'REDEEM_REJECTED' } })
    await supabase.from('notifications').insert({
      user_id: req.user.id, type: 'investment', title: 'Investment redeemed early', title_ar: 'تم استرداد الاستثمار مبكراً',
      message: `${data.refund} ${data.currency} returned to your investment wallet (early redemption penalty ${data.penalty_percent}%).`,
      message_ar: `أُعيد ${data.refund} ${data.currency} إلى محفظة الاستثمار (غرامة الاسترداد المبكر ${data.penalty_percent}%).`,
    })
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'ALLOCATION_REDEEMED_EARLY', entity: 'investment_allocations', entity_id: req.params.id, metadata: data })
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

export default router
