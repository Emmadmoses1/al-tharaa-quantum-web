import { supabase } from '../lib/supabase.js'
import { npFetch, applyPayment } from '../routes/nowpayments.js'

// Safety net: asks NOWPayments about every unfinished payment, so a deposit is credited even if the webhook never arrives
// or the user closed the page.
export async function syncPendingPayments() {
  const since = new Date(Date.now() - 8 * 86400000).toISOString()
  const { data } = await supabase.from('nowpayments_payments').select('np_payment_id')
    .eq('credited', false).not('np_status', 'in', '(finished,failed,expired,refunded)').gte('created_at', since).limit(25)
  if (!data || data.length === 0) return null
  let done = 0
  for (const r of data) {
    try { const p = await npFetch(`/payment/${encodeURIComponent(r.np_payment_id)}`); const res = await applyPayment(p); if (res?.credited) done++ }
    catch (e) { if (/not set up|not connected/i.test(e.message)) return null }
  }
  return done ? { credited: done } : null
}
