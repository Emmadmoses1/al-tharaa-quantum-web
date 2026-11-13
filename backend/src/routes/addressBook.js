import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'

// Saved withdrawal addresses ("address book"): pick a wallet with one tap instead of pasting a long address each time.
const router = Router()
router.use(requireAuth)

const ADDRESS = {
  TRC20: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
  ERC20: /^0x[0-9a-fA-F]{40}$/,
  BEP20: /^0x[0-9a-fA-F]{40}$/,
  Bitcoin: /^(bc1[a-z0-9]{25,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
}
const MAX = 20
const bad = (res, message, code) => res.status(400).json({ success: false, error: { message, code } })

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('saved_addresses').select('id, label, network, address, created_at')
      .eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(MAX)
    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (err) { next(err) }
})

router.post('/', async (req, res, next) => {
  try {
    const network = String(req.body?.network || '')
    const address = String(req.body?.address || '').trim()
    const label = String(req.body?.label || '').trim().slice(0, 40) || `${network} wallet`
    if (!ADDRESS[network]) return bad(res, 'Unsupported network.', 'BAD_REQUEST')
    if (!ADDRESS[network].test(address)) return bad(res, `The address is not a valid ${network} address.`, 'INVALID_ADDRESS')
    const { data: mine } = await supabase.from('saved_addresses').select('id, network, address').eq('user_id', req.user.id)
    const exists = (mine || []).find(a => a.network === network && a.address === address)
    if (!exists && (mine || []).length >= MAX) return bad(res, `You can save up to ${MAX} addresses. Delete one first.`, 'LIMIT')
    const { data, error } = await supabase.from('saved_addresses')
      .upsert({ user_id: req.user.id, label, network, address }, { onConflict: 'user_id,network,address' })
      .select('id, label, network, address, created_at').single()
    if (error) throw error
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
})

router.post('/:id/delete', async (req, res, next) => {
  try {
    const { error } = await supabase.from('saved_addresses').delete().eq('id', req.params.id).eq('user_id', req.user.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { next(err) }
})

export default router
