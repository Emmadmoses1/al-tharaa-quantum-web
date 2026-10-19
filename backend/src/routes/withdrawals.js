import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'
import { validate, withdrawalSchema } from '../middleware/validate.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()
router.use(requireAuth)

const NETWORKS = {
  USDT: ['TRC20', 'ERC20', 'BEP20'],
  USDC: ['ERC20', 'BEP20'],
  ETH: ['ERC20'],
  BTC: ['Bitcoin'],
}
const ADDRESS = {
  TRC20: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
  ERC20: /^0x[0-9a-fA-F]{40}$/,
  BEP20: /^0x[0-9a-fA-F]{40}$/,
  Bitcoin: /^(bc1[a-z0-9]{25,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
}
const MIN = { USDT: 10, USDC: 10, BTC: 0.0005, ETH: 0.005 }
const bad = (res, message, code) => res.status(400).json({ success: false, error: { message, code } })

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('withdrawals').select('*')
      .eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(50)
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

router.post('/', validate(withdrawalSchema), async (req, res, next) => {
  try {
    const { withdrawal_type, asset, network, amount, destination_address } = req.body
    const userId = req.user.id
    const address = destination_address.trim()

    if (!NETWORKS[asset]?.includes(network)) return bad(res, `${asset} is not available on ${network}.`, 'INVALID_NETWORK')
    if (withdrawal_type === 'trading' && asset !== 'USDT') return bad(res, 'The trading wallet holds USDT only.', 'TRADING_USDT_ONLY')
    if (!ADDRESS[network].test(address)) return bad(res, `The address is not a valid ${network} address. Check it carefully.`, 'INVALID_ADDRESS')
    if (amount < MIN[asset]) return bad(res, `Minimum withdrawal is ${MIN[asset]} ${asset}.`, 'BELOW_MINIMUM')

    const { data: existing } = await supabase.from('withdrawals').select('id')
      .eq('user_id', userId).in('status', ['pending', 'approved', 'processing']).limit(1)
    if (existing && existing.length > 0) return bad(res, 'You already have a pending withdrawal request.', 'DUPLICATE_WITHDRAWAL')

    const ledgerType = withdrawal_type === 'trading' ? 'trading' : 'investment'
    const { data: last } = await supabase.from('ledger_entries').select('balance_after')
      .eq('user_id', userId).eq('ledger_type', ledgerType).eq('asset', asset)
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1)
    const balance = last && last.length ? Number(last[0].balance_after) : 0
    if (balance < amount) return bad(res, `Insufficient balance. Available: ${balance.toFixed(6)} ${asset}`, 'INSUFFICIENT_BALANCE')

    const fees = Number((amount * 0.001).toFixed(8))
    const id = uuidv4()
    const { data: withdrawal, error } = await supabase.from('withdrawals').insert({
      id, user_id: userId, withdrawal_type, asset, network, amount, fees,
      net_amount: Number((amount - fees).toFixed(8)), destination_address: address, status: 'pending',
    }).select().single()
    if (error) throw error

    await supabase.from('audit_logs').insert({
      user_id: userId, action: 'WITHDRAWAL_REQUESTED', entity: 'withdrawals', entity_id: id,
      metadata: { asset, network, amount, withdrawal_type },
    })
    // The notification is created by the withdrawal page itself, so none is added here.
    res.status(201).json({ success: true, data: withdrawal, message: 'Withdrawal request submitted. Pending admin review.' })
  } catch (err) { next(err) }
})

// A user can cancel only while it is still waiting for review (no funds were debited yet)
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('withdrawals')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', req.params.id).eq('user_id', req.user.id).eq('status', 'pending')
      .select().single()
    if (error || !data) return bad(res, 'This request can no longer be cancelled.', 'INVALID_STATUS')
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'WITHDRAWAL_CANCELLED', entity: 'withdrawals', entity_id: data.id })
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

export default router
