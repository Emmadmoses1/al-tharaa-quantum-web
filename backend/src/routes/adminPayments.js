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

// Tells the admin exactly what is wrong with the NOWPayments connection
router.post('/test', async (_req, res, next) => {
  try {
    const [rawKey, cfg] = await Promise.all([getSecret('NOWPAYMENTS_API_KEY'), getSetting('payments')])
    const key = String(rawKey || '').trim()
    const out = (ok, detail) => res.json({ success: true, data: { ok, detail } })
    if (!key) return out(false, 'No API key saved. Add it in Admin > API Keys.')
    const probe = async (sandbox) => { const r = await fetch(`${npBase(sandbox)}/currencies`, { headers: { 'x-api-key': key } }); return r.ok }
    const env = cfg.sandbox ? 'sandbox' : 'live'
    if (await probe(!!cfg.sandbox)) {
      const r = await fetch(`${npBase(!!cfg.sandbox)}/estimate?amount=10&currency_from=usd&currency_to=usdttrc20`, { headers: { 'x-api-key': key } })
      const d = await r.json().catch(() => ({}))
      return out(r.ok, r.ok ? `Key works (${env} mode). 10 USD = ${d.estimated_amount} USDT on TRC20.` : `Key accepted (${env}) but pricing failed: ${d?.message || r.status}`)
    }
    if (await probe(!cfg.sandbox)) {
      return out(false, cfg.sandbox
        ? 'This is a LIVE key but Sandbox mode is ON. Turn Sandbox off in Admin > Settings > Payments.'
        : 'This is a SANDBOX key but Sandbox mode is OFF. Turn Sandbox on in Admin > Settings > Payments, or paste your live key.')
    }
    return out(false, 'NOWPayments rejects this key in both live and sandbox. Copy the API key again from NOWPayments > Store Settings > API keys (not the IPN secret) and paste it in Admin > API Keys.')
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
