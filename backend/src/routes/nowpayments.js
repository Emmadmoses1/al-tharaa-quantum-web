import { Router } from 'express'
import crypto from 'node:crypto'
import Joi from 'joi'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'
import { getSecret } from '../lib/secrets.js'
import { getSetting } from '../lib/settings.js'

// NOWPayments: automatic crypto deposits. The user pays to an address NOWPayments creates; a signed webhook (IPN)
// tells us when the money has arrived and only then is the ledger credited (through the same credit_deposit path as the chain watcher).
const router = Router()
const CURRENCY = { TRC20: 'usdttrc20', BEP20: 'usdtbsc', ERC20: 'usdterc20' }
const bad = (res, message, code = 'BAD_REQUEST', status = 400) => res.status(status).json({ success: false, error: { message, code } })

export const npBase = (sandbox) => sandbox ? 'https://api-sandbox.nowpayments.io/v1' : 'https://api.nowpayments.io/v1'

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v && typeof v === 'object') return Object.keys(v).sort().reduce((o, k) => { o[k] = sortKeys(v[k]); return o }, {})
  return v
}

export async function npFetch(path, opts = {}) {
  const [rawKey, cfg] = await Promise.all([getSecret('NOWPAYMENTS_API_KEY'), getSetting('payments')])
  const key = String(rawKey || '').trim()
  if (!key) throw Object.assign(new Error('NOWPayments is not connected yet.'), { status: 400 })
  const r = await fetch(npBase(cfg.sandbox) + path, { ...opts, headers: { 'x-api-key': key, 'Content-Type': 'application/json', ...(opts.headers || {}) } })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) {
    if (r.status === 403 || d?.code === 'INVALID_API_KEY' || /invalid api key/i.test(String(d?.message || ''))) {
      console.error(`[nowpayments] key rejected (sandbox mode ${cfg.sandbox ? 'ON' : 'OFF'}). Use Admin > Payments > Test connection.`)
      throw Object.assign(new Error('Automatic deposit is not set up correctly yet. Please use the manual deposit below or contact support.'), { status: 502 })
    }
    throw Object.assign(new Error(d?.message || `NOWPayments error (HTTP ${r.status})`), { status: 502 })
  }
  return d
}

const DEP_STATUS = { waiting: 'awaiting_payment', confirming: 'confirming', confirmed: 'confirming', sending: 'confirming', partially_paid: 'detected', finished: 'confirmed', failed: 'expired', refunded: 'expired', expired: 'expired' }

// Used by the webhook and by the admin "sync" button. Safe to run many times for the same payment.
export async function applyPayment(p) {
  const paymentId = String(p.payment_id)
  let { data: row } = await supabase.from('nowpayments_payments').select('*').eq('np_payment_id', paymentId).maybeSingle()
  // card payments are created through an invoice, so the first webhook is matched by order_id (our deposit id)
  if (!row && /^[0-9a-f-]{36}$/i.test(String(p.order_id || ''))) {
    const r = await supabase.from('nowpayments_payments').select('*').eq('deposit_id', String(p.order_id)).maybeSingle()
    row = r.data
    if (row && !row.np_payment_id) {
      const patch = { np_payment_id: paymentId, pay_address: p.pay_address || row.pay_address }
      if (p.pay_amount != null) patch.pay_amount = Number(p.pay_amount)
      await supabase.from('nowpayments_payments').update(patch).eq('id', row.id)
      row = { ...row, ...patch }
    } else if (row && row.np_payment_id !== paymentId) row = null
  }
  if (!row) return { ignored: true }
  const status = String(p.payment_status || '')
  const paid = p.actually_paid != null ? Number(p.actually_paid) : null
  await supabase.from('nowpayments_payments').update({ np_status: status, actually_paid: paid ?? row.actually_paid, updated_at: new Date().toISOString() }).eq('id', row.id)

  const { data: dep } = await supabase.from('deposits').select('id, user_id, status, purpose').eq('id', row.deposit_id).single()
  if (!dep) return { ignored: true }
  const SEEN = ['confirming', 'confirmed', 'sending']
  if (SEEN.includes(status) && !SEEN.includes(row.np_status)) {
    await supabase.from('notifications').insert({
      user_id: dep.user_id, type: 'deposit', title: 'Payment detected', title_ar: 'تم رصد تحويلك',
      message: 'We detected your transfer. It will be added to your wallet once the network confirms it.', message_ar: 'تم رصد تحويلك على الشبكة، وسيُضاف إلى رصيدك فور التأكيد.',
    })
  }
  if (status === 'partially_paid' && row.np_status !== 'partially_paid') {
    await supabase.from('notifications').insert({
      user_id: dep.user_id, type: 'deposit', title: 'Partial payment received', title_ar: 'وصل جزء من المبلغ',
      message: 'We received less than the requested amount. Our team will review it and contact you.', message_ar: 'وصل مبلغ أقل من المطلوب. سيراجعه فريقنا ويتواصل معك.',
    })
  }
  if (status !== 'finished') {
    const next = DEP_STATUS[status]
    if (next && next !== 'confirmed' && dep.status !== 'confirmed') {
      await supabase.from('deposits').update({ status: next, updated_at: new Date().toISOString() }).eq('id', dep.id)
    }
    if (status === 'partially_paid') await supabase.from('nowpayments_payments').update({ needs_review: true, note: 'Partially paid. Review in Admin > Payments.' }).eq('id', row.id)
    return { status }
  }

  // finished: claim the credit exactly once
  if (paid == null || !(paid > 0)) { await supabase.from('nowpayments_payments').update({ needs_review: true, note: 'Finished without a paid amount.' }).eq('id', row.id); return { review: true } }
  const expected = Number(row.pay_amount || row.price_usd)
  if (paid > expected * 1.5 + 1) { await supabase.from('nowpayments_payments').update({ needs_review: true, note: `Paid ${paid} is far above the expected ${expected}. Not credited automatically.` }).eq('id', row.id); return { review: true } }
  const { data: claim } = await supabase.from('nowpayments_payments').update({ credited: true }).eq('id', row.id).eq('credited', false).select('id')
  if (!claim || claim.length === 0) return { already: true }
  const { error } = await supabase.rpc('credit_deposit', { p_deposit_id: dep.id, p_amount: paid, p_txid: String(p.payin_hash || `np:${paymentId}`), p_confirmations: 999 })
  if (error) {
    await supabase.from('nowpayments_payments').update({ credited: false, needs_review: true, note: `Credit failed: ${error.message}`.slice(0, 300) }).eq('id', row.id)
    throw error
  }
  await supabase.from('notifications').insert({
    user_id: dep.user_id, type: 'deposit', title: 'Deposit credited', title_ar: 'تمت إضافة إيداعك',
    message: `${paid} USDT was credited to your ${dep.purpose === 'investment' ? 'investment' : 'trading'} wallet.`, message_ar: `تمت إضافة ${paid} USDT إلى ${dep.purpose === 'investment' ? 'محفظة الاستثمار' : 'محفظة التداول'}.`,
  })
  return { credited: true }
}

// Webhook (no login). Trust is the HMAC signature, nothing else.
router.post('/ipn', async (req, res) => {
  try {
    const secret = await getSecret('NOWPAYMENTS_IPN_SECRET')
    const sig = String(req.headers['x-nowpayments-sig'] || '')
    if (!secret || !sig) return res.status(401).json({ success: false })
    const expected = crypto.createHmac('sha512', secret).update(JSON.stringify(sortKeys(req.body || {}))).digest('hex')
    const a = Buffer.from(expected), b = Buffer.from(sig)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ success: false })
    await applyPayment(req.body)
    res.json({ success: true })
  } catch (err) {
    console.error('[nowpayments ipn]', err.message)
    res.status(500).json({ success: false })
  }
})

router.use(requireAuth)
const rate = new Map()

router.post('/create', async (req, res, next) => {
  try {
    const { value, error } = Joi.object({
      amount_usd: Joi.number().positive().required(),
      network: Joi.string().valid(...Object.keys(CURRENCY)).required(),
      purpose: Joi.string().valid('trading', 'investment').required(),
    }).validate(req.body)
    if (error) return bad(res, error.message)
    const cfg = await getSetting('payments')
    if (!cfg.nowpayments_enabled) return bad(res, 'Automatic deposits are not enabled yet.', 'DISABLED')
    if (value.amount_usd < Number(cfg.min_usd) || value.amount_usd > Number(cfg.max_usd)) return bad(res, `Amount must be between $${cfg.min_usd} and $${cfg.max_usd}.`, 'AMOUNT_RANGE')
    const r = rate.get(req.user.id) || { n: 0, at: Date.now() }
    if (Date.now() - r.at > 3600000) { r.n = 0; r.at = Date.now() }
    if (++r.n > 10) return bad(res, 'Too many deposit requests. Try again later.', 'RATE_LIMITED', 429)
    rate.set(req.user.id, r)

    const depositId = uuidv4()
    const base = process.env.API_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || ''
    const payload = {
      price_amount: value.amount_usd, price_currency: 'usd', pay_currency: CURRENCY[value.network], order_id: depositId,
      order_description: `Deposit ${value.purpose}`, ...(base ? { ipn_callback_url: `${base}/api/nowpayments/ipn` } : {}),
    }
    const np = await npFetch('/payment', { method: 'POST', body: JSON.stringify(payload) })
    const expires = np.expiration_estimate_date ? new Date(np.expiration_estimate_date).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString()
    const { error: de } = await supabase.from('deposits').insert({
      id: depositId, user_id: req.user.id, asset: 'USDT', network: value.network, purpose: value.purpose,
      wallet_address: np.pay_address, minimum_deposit: 0, required_confirmations: 1,
      requested_amount: value.amount_usd, status: 'awaiting_payment', expires_at: expires,
    })
    if (de) throw de
    await supabase.from('nowpayments_payments').insert({
      user_id: req.user.id, deposit_id: depositId, np_payment_id: String(np.payment_id), pay_currency: CURRENCY[value.network],
      network: value.network, pay_address: np.pay_address, price_usd: value.amount_usd, pay_amount: np.pay_amount, np_status: np.payment_status || 'waiting',
    })
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'NOWPAYMENTS_CREATED', entity: 'deposits', entity_id: depositId, metadata: { amount_usd: value.amount_usd, network: value.network, purpose: value.purpose } })
    res.status(201).json({ success: true, data: { deposit_id: depositId, address: np.pay_address, pay_amount: np.pay_amount, network: value.network, expires_at: expires } })
  } catch (err) {
    if (err.status) return bad(res, err.message, 'NOWPAYMENTS_ERROR', err.status)
    next(err)
  }
})

const syncAt = new Map()
const TERMINAL = ['finished', 'failed', 'expired', 'refunded']

router.get('/status/:depositId', async (req, res, next) => {
  try {
    const { data: dep } = await supabase.from('deposits').select('id, status, expires_at').eq('id', req.params.depositId).eq('user_id', req.user.id).maybeSingle()
    if (!dep) return bad(res, 'Not found', 'NOT_FOUND', 404)
    let { data: np } = await supabase.from('nowpayments_payments').select('np_payment_id, np_status, actually_paid, pay_amount').eq('deposit_id', dep.id).maybeSingle()
    // Ask NOWPayments directly (at most every 8s), so the screen updates even without the webhook
    if (np && np.np_payment_id && !TERMINAL.includes(np.np_status) && Date.now() - (syncAt.get(dep.id) || 0) > 8000) {
      syncAt.set(dep.id, Date.now())
      try {
        await applyPayment(await npFetch(`/payment/${encodeURIComponent(np.np_payment_id)}`))
        const r = await supabase.from('nowpayments_payments').select('np_payment_id, np_status, actually_paid, pay_amount').eq('deposit_id', dep.id).maybeSingle()
        np = r.data
        const d2 = await supabase.from('deposits').select('status').eq('id', dep.id).single()
        if (d2.data) dep.status = d2.data.status
      } catch { /* keep the last known status */ }
    }
    res.json({ success: true, data: { status: dep.status, np_status: np?.np_status || null, paid: np?.actually_paid ?? null, expected: np?.pay_amount ?? null, expires_at: dep.expires_at } })
  } catch (err) { next(err) }
})

// The user's newest unfinished payment, so the screen can continue after a reload
router.get('/active', async (req, res, next) => {
  try {
    const { data: np } = await supabase.from('nowpayments_payments').select('deposit_id, pay_address, pay_amount, network, price_usd, np_status')
      .eq('user_id', req.user.id).eq('credited', false).is('np_invoice_id', null).not('np_status', 'in', '(finished,failed,expired,refunded)').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!np) return res.json({ success: true, data: null })
    const { data: dep } = await supabase.from('deposits').select('expires_at, status').eq('id', np.deposit_id).maybeSingle()
    if (!dep || !['awaiting_payment', 'detected', 'confirming'].includes(dep.status) || new Date(dep.expires_at).getTime() < Date.now()) return res.json({ success: true, data: null })
    res.json({ success: true, data: { deposit_id: np.deposit_id, address: np.pay_address, pay_amount: np.pay_amount, network: np.network, expires_at: dep.expires_at, price_usd: np.price_usd } })
  } catch (err) { next(err) }
})

// ---- Card deposits: NOWPayments hosted checkout (card details are entered on the partner's page, never here)
const CARD_CUR = ['usd', 'eur', 'gbp', 'ngn']
const cardRate = new Map()
function cardLimit(userId, max, windowMs) {
  const r = cardRate.get(userId) || { n: 0, at: Date.now() }
  if (Date.now() - r.at > windowMs) { r.n = 0; r.at = Date.now() }
  r.n++; cardRate.set(userId, r)
  return r.n <= max
}
async function estimateUsdt(amount, cur) {
  const e = await npFetch(`/estimate?amount=${encodeURIComponent(amount)}&currency_from=${encodeURIComponent(cur)}&currency_to=usdttrc20`)
  const v = Number(e.estimated_amount)
  if (!(v > 0)) throw Object.assign(new Error('Could not get a rate for this currency right now.'), { status: 502 })
  return v
}

router.get('/card/estimate', async (req, res, next) => {
  try {
    const cfg = await getSetting('payments')
    if (!cfg.card_enabled) return bad(res, 'Card deposits are not enabled yet.', 'DISABLED')
    const cur = String(req.query.currency || '').toLowerCase()
    const amount = Number(req.query.amount)
    if (!CARD_CUR.includes(cur) || !(amount > 0) || amount > 10000000) return bad(res, 'Invalid amount or currency')
    if (!cardLimit('e' + req.user.id, 40, 60000)) return bad(res, 'Too many requests. Wait a moment.', 'RATE_LIMITED', 429)
    const usdt = await estimateUsdt(amount, cur)
    res.json({ success: true, data: { usdt, min_usd: Number(cfg.min_usd), max_usd: Number(cfg.max_usd) } })
  } catch (err) {
    if (err.status) return bad(res, err.message, 'NOWPAYMENTS_ERROR', err.status)
    next(err)
  }
})

router.post('/card/create', async (req, res, next) => {
  try {
    const { value, error } = Joi.object({
      amount: Joi.number().positive().max(10000000).required(),
      currency: Joi.string().lowercase().valid(...CARD_CUR).required(),
      purpose: Joi.string().valid('trading', 'investment').required(),
    }).validate(req.body)
    if (error) return bad(res, error.message)
    const cfg = await getSetting('payments')
    if (!cfg.card_enabled) return bad(res, 'Card deposits are not enabled yet.', 'DISABLED')
    if (!cardLimit('c' + req.user.id, 10, 3600000)) return bad(res, 'Too many deposit requests. Try again later.', 'RATE_LIMITED', 429)
    const usdt = await estimateUsdt(value.amount, value.currency)
    if (usdt < Number(cfg.min_usd) || usdt > Number(cfg.max_usd)) return bad(res, `Amount must be worth between ${cfg.min_usd} and ${cfg.max_usd} USDT.`, 'AMOUNT_RANGE')

    const depositId = uuidv4()
    const front = (process.env.FRONTEND_URL || '').replace(/\/$/, '')
    const base = process.env.API_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || ''
    const inv = await npFetch('/invoice', { method: 'POST', body: JSON.stringify({
      price_amount: value.amount, price_currency: value.currency, pay_currency: 'usdttrc20', order_id: depositId,
      order_description: `Card deposit ${value.purpose}`,
      ...(base ? { ipn_callback_url: `${base}/api/nowpayments/ipn` } : {}),
      ...(front ? { success_url: `${front}/dashboard/deposit?card=success`, cancel_url: `${front}/dashboard/deposit?card=cancel` } : {}),
    }) })
    if (!inv.invoice_url) throw Object.assign(new Error('The card payment page could not be created.'), { status: 502 })
    const { error: de } = await supabase.from('deposits').insert({
      id: depositId, user_id: req.user.id, asset: 'USDT', network: 'TRC20', purpose: value.purpose,
      wallet_address: 'card-checkout', minimum_deposit: 0, required_confirmations: 1,
      requested_amount: usdt, status: 'awaiting_payment', expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    })
    if (de) throw de
    await supabase.from('nowpayments_payments').insert({
      user_id: req.user.id, deposit_id: depositId, np_payment_id: null, np_invoice_id: String(inv.id), pay_currency: 'usdttrc20',
      network: 'TRC20', pay_address: null, price_usd: usdt, pay_amount: usdt, np_status: 'waiting',
    })
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'NOWPAYMENTS_CARD_CREATED', entity: 'deposits', entity_id: depositId, metadata: { amount: value.amount, currency: value.currency, est_usdt: usdt, purpose: value.purpose } })
    res.status(201).json({ success: true, data: { deposit_id: depositId, invoice_url: inv.invoice_url, usdt } })
  } catch (err) {
    if (err.status) return bad(res, err.message, 'NOWPAYMENTS_ERROR', err.status)
    next(err)
  }
})

export default router
