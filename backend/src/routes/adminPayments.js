import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'
import { applyPayment } from './nowpayments.js'
import { getSecret } from '../lib/secrets.js'
import { getSetting } from '../lib/settings.js'
import { npBase } from './nowpayments.js'

const router = Router()
router.use(requireAdmin)

router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('nowpayments_payments')
      .select('id, user_id, np_payment_id, network, pay_address, price_usd, pay_amount, actually_paid, np_status, credited, needs_review, note, created_at, updated_at')
      .order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    const ids = [...new Set((data || []).map(r => r.user_id))]
    const { data: profs } = ids.length ? await supabase.from('profiles').select('id, email').in('id', ids) : { data: [] }
    const em = new Map((profs || []).map(p => [p.id, p.email]))
    const base = process.env.API_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || ''
    const [key, ipn, cfg] = await Promise.all([getSecret('NOWPAYMENTS_API_KEY'), getSecret('NOWPAYMENTS_IPN_SECRET'), getSetting('payments')])
    res.json({ success: true, data: {
      rows: (data || []).map(r => ({ ...r, email: em.get(r.user_id) || '' })),
      webhook_url: base ? `${base}/api/nowpayments/ipn` : '',
      api_key_set: !!key, ipn_secret_set: !!ipn, enabled: !!cfg.nowpayments_enabled, sandbox: !!cfg.sandbox,
    } })
  } catch (err) { next(err) }
})

// Re-check one payment directly with NOWPayments (use if a webhook was missed)
router.post('/:paymentId/sync', async (req, res, next) => {
  try {
    const [key, cfg] = await Promise.all([getSecret('NOWPAYMENTS_API_KEY'), getSetting('payments')])
    if (!key) return res.status(400).json({ success: false, error: { message: 'NOWPayments API key is not saved yet.', code: 'NO_KEY' } })
    const r = await fetch(`${npBase(cfg.sandbox)}/payment/${encodeURIComponent(req.params.paymentId)}`, { headers: { 'x-api-key': key } })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) return res.status(502).json({ success: false, error: { message: d?.message || `NOWPayments HTTP ${r.status}`, code: 'NOWPAYMENTS_ERROR' } })
    const out = await applyPayment(d)
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'NOWPAYMENTS_SYNC', entity: 'nowpayments_payments', metadata: { payment_id: req.params.paymentId, result: out } })
    res.json({ success: true, data: out })
  } catch (err) { next(err) }
})

export default router
