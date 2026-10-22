import { supabase } from '../lib/supabase.js'
import { getSetting, saveSetting } from '../lib/settings.js'
import { sendMail, esc, emailLogo } from '../lib/mailer.js'
import { getPrice } from './prices.js'

const STABLE = new Set(['USDT', 'USDC', 'USD'])
const n = (v, d = 8) => Number(v).toLocaleString('en-US', { maximumFractionDigits: d })

export function invoiceHtml(inv, co, email) {
  const row = (k, v) => `<tr><td style="padding:8px 0;color:#999;border-bottom:1px solid #222">${k}</td><td style="padding:8px 0;text-align:right;border-bottom:1px solid #222;word-break:break-all">${v}</td></tr>`
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#0B0B0B;color:#fff;padding:28px;border-radius:12px">
    ${emailLogo()}
    <div style="display:flex;justify-content:space-between"><h2 style="color:#D4AF37;margin:0">${esc(co.company_name)}</h2><b>INVOICE</b></div>
    <p style="color:#999;margin:4px 0 18px;font-size:13px">${esc(co.address)}${co.tax_id ? ` · Tax ID ${esc(co.tax_id)}` : ''}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${row('Invoice no.', esc(inv.number))}${row('Date', new Date(inv.issued_at).toUTCString())}${row('Billed to', esc(email))}
      ${row('Description', `Deposit to ${esc(inv.purpose)} wallet`)}${row('Asset / network', `${esc(inv.asset)} (${esc(inv.network)})`)}
      ${row('Amount received', `<b>${n(inv.amount)} ${esc(inv.asset)}</b>`)}
      ${row('Rate at confirmation', `1 ${esc(inv.asset)} = ${n(inv.rate, 4)} USD`)}${row('Value', `<b>${n(inv.usd_value, 2)} USD</b>`)}
      ${row('Transaction', esc(inv.txid || 'Confirmed by administrator'))}${row('Status', 'PAID / CREDITED')}
    </table>
    <p style="color:#777;font-size:12px;margin-top:20px">${esc(co.footer)}</p></div>`
}

export async function processInvoices() {
  const co = await getSetting('invoice')
  if (!co.start_after) { await saveSetting('invoice', { start_after: new Date().toISOString() }); return null }
  const { data: deps, error } = await supabase.from('deposits')
    .select('id, user_id, asset, amount').eq('status', 'confirmed').gte('confirmed_at', co.start_after).order('confirmed_at').limit(50)
  if (error) throw error
  if (!deps || deps.length === 0) return null
  const { data: have } = await supabase.from('invoices').select('deposit_id').in('deposit_id', deps.map(d => d.id))
  const done = new Set((have || []).map(h => h.deposit_id))
  let made = 0
  for (const d of deps.filter(x => !done.has(x.id))) {
    try {
      let rate = 1
      if (!STABLE.has(d.asset)) rate = await getPrice(d.asset)
      const usd = Number(d.amount) * rate
      const { data: id, error: e } = await supabase.rpc('create_invoice', { p_deposit: d.id, p_usd: usd, p_rate: rate })
      if (e) throw e
      if (!id) continue
      made++
      const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).single()
      const { data: prof } = await supabase.from('profiles').select('id, email, notify_email, referred_by').eq('id', d.user_id).single()

      const em = await getSetting('email')
      if (inv && prof?.email && prof.notify_email !== false && em.notify_deposit !== false) {
        const r = await sendMail({ to: prof.email, subject: `Invoice ${inv.number} | فاتورة إيداع`, html: invoiceHtml(inv, co, prof.email) })
        if (r.ok) await supabase.from('invoices').update({ emailed_at: new Date().toISOString() }).eq('id', id)
        else if (r.error) console.error('[invoice email]', r.error)
      }

      // referral reward on the referred user's first qualifying deposit
      const ref = await getSetting('referral')
      if (ref.enabled && Number(ref.reward_usdt) > 0 && prof?.referred_by && usd >= Number(ref.min_deposit_usdt)) {
        await supabase.rpc('grant_bonus', { p_user: prof.referred_by, p_type: `referral:${prof.id}`, p_usd: ref.reward_usdt, p_asset: 'USDT', p_amount: ref.reward_usdt, p_rate: 1 })
      }
    } catch (e) { console.error(`[invoices] deposit ${d.id}: ${e.message}`) }
  }
  return made ? { invoices: made } : null
}
