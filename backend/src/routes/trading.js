import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'

const router = Router()

router.use(requireAuth)

// Get trading portfolio summary
router.get('/portfolio', async (req, res, next) => {
  try {
    const { data: portfolio, error } = await supabase
      .from('trading_portfolios')
      .select('*')
      .eq('user_id', req.user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    if (!portfolio) {
      return res.json({
        success: true,
        data: {
          available_balance: 0,
          allocated_capital: 0,
          unrealized_pnl: 0,
          realized_pnl: 0,
          open_positions: 0,
          ai_status: 'inactive',
          message: 'No trading activity yet',
        },
      })
    }

    res.json({ success: true, data: portfolio })
  } catch (err) {
    next(err)
  }
})

// Get AI signals (read-only, no fake data)
router.get('/signals', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('ai_signals')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    res.json({ success: true, data: data || [] })
  } catch (err) {
    next(err)
  }
})

// Get strategies
router.get('/strategies', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('strategies')
      .select('id, name, description, risk_level, timeframe, supported_assets, is_enabled')
      .eq('is_enabled', true)

    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (err) {
    next(err)
  }
})

// Get trade history
router.get('/trades', async (req, res, next) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query

    let query = supabase
      .from('trades')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1)

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    res.json({ success: true, data: data || [] })
  } catch (err) {
    next(err)
  }
})

// Emergency stop
router.post('/emergency-stop', async (req, res, next) => {
  try {
    const { data: portfolio, error: findErr } = await supabase
      .from('trading_portfolios')
      .select('id, ai_status')
      .eq('user_id', req.user.id)
      .single()

    if (findErr || !portfolio) {
      return res.status(404).json({ success: false, error: { message: 'No trading portfolio found', code: 'NOT_FOUND' } })
    }

    const { error } = await supabase
      .from('trading_portfolios')
      .update({
        ai_status: 'emergency_stopped',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', req.user.id)

    if (error) throw error

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'EMERGENCY_STOP',
      entity: 'trading_portfolio',
      entity_id: portfolio.id,
      metadata: { triggered_at: new Date().toISOString() },
    })

    res.json({ success: true, message: 'Emergency stop activated. No new positions will be opened.' })
  } catch (err) {
    next(err)
  }
})

export default router
