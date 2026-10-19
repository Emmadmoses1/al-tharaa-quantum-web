import { supabase } from '../lib/supabase.js'
import { getIncoming } from './chain.js'

const OPEN = ['awaiting_payment', 'detected', 'confirming']
const same = (a, b) => Math.round(Number(a) * 1e8) === Math.round(Number(b) * 1e8)

export async function scanDeposits() {
  const nowIso = new Date().toISOString()
  await supabase.from('deposits').update({ status: 'expired', updated_at: nowIso })
    .eq('status', 'awaiting_payment').is('txid', null).lt('expires_at', nowIso)

  const { data: open, error } = await supabase.from('deposits').select('*').in('status', OPEN)
  if (error) throw error
  if (!open || open.length === 0) return null

  const groups = new Map()
  for (const d of open) {
    if (!d.payable_amount) continue // legacy rows: admin confirms manually
    const k = `${d.asset}|${d.network}|${d.wallet_address}`
    groups.set(k, [...(groups.get(k) || []), d])
  }

  let credited = 0, updated = 0
  for (const [key, deps] of groups) {
    const [asset, network, address] = key.split('|')
    let transfers
    try { transfers = await getIncoming(asset, network, address) }
    catch (e) { console.error(`[deposits] ${asset}/${network}: ${e.message}`); continue }

    const claimed = new Set()
    for (const d of deps) {
      const since = new Date(d.created_at).getTime() - 5 * 60 * 1000
      const m = transfers.find(t =>
        !claimed.has(t.txid) && t.ts >= since && same(t.amount, d.payable_amount) &&
        (!d.txid || d.txid.toLowerCase() === t.txid.toLowerCase()))
      if (!m) continue
      claimed.add(m.txid)

      const need = d.required_confirmations || 1
      if (m.confirmations >= need) {
        const { error: e } = await supabase.rpc('credit_deposit', {
          p_deposit_id: d.id, p_amount: m.amount, p_txid: m.txid, p_confirmations: Math.min(m.confirmations, 999),
        })
        if (e) { console.error('[deposits] credit failed:', e.message); continue }
        credited++
      } else {
        const { error: e } = await supabase.from('deposits').update({
          txid: m.txid, confirmations: m.confirmations,
          status: m.confirmations > 0 ? 'confirming' : 'detected', updated_at: nowIso,
        }).eq('id', d.id)
        if (!e) {
          updated++
          if (d.status === 'awaiting_payment') {
            await supabase.from('notifications').insert({
              user_id: d.user_id, type: 'deposit', title: 'Deposit detected', title_ar: 'تم رصد تحويلك',
              message: `We detected your ${d.asset} transfer. It will be credited after network confirmation.`,
              message_ar: `تم رصد تحويل ${d.asset}. سيُضاف إلى رصيدك بعد تأكيد الشبكة.`,
            })
          }
        }
      }
    }
  }
  return { open: open.length, credited, updated }
}
