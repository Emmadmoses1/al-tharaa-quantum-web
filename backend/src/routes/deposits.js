import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'
import { validate, depositSchema, txidSchema } from '../middleware/validate.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()
router.use(requireAuth)

const OPEN = ['awaiting_payment', 'detected', 'confirming']
// Smallest step used to make every open request's amount unique on the shared address
const UNIT = { USDT: 0.0001, USDC: 0.0001, BTC: 0.00000001, ETH: 0.0000001 }

const depositCounts = new Map()
function checkDepositRateLimit(userId) {
  const now = Date.now()
  const hour = 60 * 60 * 1000
  const rec = depositCounts.get(userId) || { count: 0, resetAt: now + hour }
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + hour }
  rec.count++
  depositCounts.set(userId, rec)
  return rec.count <= 10
}

async function pickPayable(asset, network, requested) {
  const unit = UNIT[asset] || 0.0001
  for (let i = 0; i < 30; i++) {
    const n = 1 + Math.floor(Math.random() * 999)
    const payable = Number((requested + n * unit).toFixed(8))
    const { data } = await supabase.from('deposits').select('id')
      .eq('asset', asset).eq('network', network).eq('payable_amount', payable)
      .in('status', OPEN).limit(1)
    if (!data || data.length === 0) return payable
  }
  throw new Error('System is busy, please try again in a moment.')
}

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('deposits').select('*')
      .eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(50)
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

router.post('/', validate(depositSchema), async (req, res, next) => {
  try {
    const { asset, network, purpose, amount } = req.body
    const userId = req.user.id

    if (purpose === 'trading' && asset !== 'USDT') {
      return res.status(400).json({ success: false, error: { message: 'The trading wallet accepts USDT only.', code: 'TRADING_USDT_ONLY' } })
    }
    if (!checkDepositRateLimit(userId)) {
      return res.status(429).json({ success: false, error: { message: 'Too many deposit requests. Try again later.', code: 'RATE_LIMITED' } })
    }

    // Resume an existing open request instead of failing
    const { data: existing } = await supabase.from('deposits').select('*')
      .eq('user_id', userId).eq('asset', asset).eq('network', network).eq('purpose', purpose)
      .in('status', OPEN).gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }).limit(1)
    if (existing && existing.length > 0 && existing[0].payable_amount) {
      return res.json({ success: true, data: existing[0], resumed: true })
    }

    const { data: wallet, error: walletErr } = await supabase.from('deposit_addresses')
      .select('address, minimum_deposit, required_confirmations')
      .eq('asset', asset).eq('network', network).eq('status', 'active').single()
    if (walletErr || !wallet) {
      return res.status(400).json({ success: false, error: { message: 'No active wallet configured for this asset/network.', code: 'WALLET_NOT_FOUND' } })
    }

    const min = Number(wallet.minimum_deposit) || 0
    if (amount < min) {
      return res.status(400).json({ success: false, error: { message: `Minimum deposit is ${min} ${asset}.`, code: 'BELOW_MINIMUM' } })
    }

    const payable = await pickPayable(asset, network, amount)
    const id = uuidv4()
    const { data: deposit, error } = await supabase.from('deposits').insert({
      id, user_id: userId, asset, network, purpose,
      wallet_address: wallet.address,
      minimum_deposit: wallet.minimum_deposit,
      required_confirmations: wallet.required_confirmations,
      requested_amount: amount,
      payable_amount: payable,
      status: 'awaiting_payment',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }).select().single()
    if (error) throw error

    await supabase.from('audit_logs').insert({
      user_id: userId, action: 'DEPOSIT_REQUEST_CREATED', entity: 'deposits', entity_id: id,
      metadata: { asset, network, purpose, amount, payable },
    })
    res.status(201).json({ success: true, data: deposit })
  } catch (err) { next(err) }
})

// Optional hint: speeds up matching. Credit still requires the exact on-chain amount.
router.patch('/:id/txid', validate(txidSchema), async (req, res, next) => {
  try {
    const { txid } = req.body
    const { id } = req.params
    const { data: deposit } = await supabase.from('deposits').select('*')
      .eq('id', id).eq('user_id', req.user.id).single()
    if (!deposit) return res.status(404).json({ success: false, error: { message: 'Deposit not found', code: 'NOT_FOUND' } })
    if (!['awaiting_payment', 'detected'].includes(deposit.status)) {
      return res.status(400).json({ success: false, error: { message: 'Cannot submit TXID for this deposit status', code: 'INVALID_STATUS' } })
    }
    const { data: dup } = await supabase.from('deposits').select('id').eq('txid', txid).neq('id', id).limit(1)
    if (dup && dup.length > 0) {
      return res.status(400).json({ success: false, error: { message: 'This TXID has already been submitted.', code: 'DUPLICATE_TXID' } })
    }
    const { data, error } = await supabase.from('deposits')
      .update({ txid, status: 'detected', updated_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (error) throw error
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'TXID_SUBMITTED', entity: 'deposits', entity_id: id, metadata: { txid } })
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

router.post('/:id/cancel', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('deposits')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', req.params.id).eq('user_id', req.user.id).eq('status', 'awaiting_payment')
      .select().single()
    if (error || !data) return res.status(400).json({ success: false, error: { message: 'Cannot cancel this request.', code: 'INVALID_STATUS' } })
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

export default router
