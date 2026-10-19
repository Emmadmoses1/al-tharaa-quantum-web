import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'

const router = Router()

// Public: list open opportunities
router.get('/opportunities', async (req, res, next) => {
  try {
    const { category, status = 'open' } = req.query

    let query = supabase
      .from('investment_opportunities')
      .select('id, name, category, location, description, minimum_investment, target_amount, amount_raised, risk_level, duration_days, deadline, status, cover_image_url, projected_return_min, projected_return_max')
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (category) query = query.eq('category', category)

    const { data, error } = await query
    if (error) throw error

    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// Public: single opportunity
router.get('/opportunities/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('investment_opportunities')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !data) {
      return res.status(404).json({ success: false, error: { message: 'Opportunity not found', code: 'NOT_FOUND' } })
    }

    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// Auth: user portfolio
router.get('/portfolio', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('investment_allocations')
      .select('*, investment_opportunities(name, category, cover_image_url)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const totalInvested = (data || []).reduce((s, a) => s + Number(a.amount_invested || 0), 0)
    const totalCurrentValue = (data || []).reduce((s, a) => s + Number(a.current_value || a.amount_invested || 0), 0)

    res.json({
      success: true,
      data: {
        allocations: data,
        summary: {
          total_invested: totalInvested,
          total_current_value: totalCurrentValue,
          total_gain_loss: totalCurrentValue - totalInvested,
          count: (data || []).length,
        },
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
