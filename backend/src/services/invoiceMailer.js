import { supabase } from '../lib/supabase.js'
import { getSetting, saveSetting } from '../lib/settings.js'
import { sendMail, esc, emailLogo } from '../lib/mailer.js'
import { getPrice } from './prices.js'

const STABLE = new Set(['USDT', 'USDC', 'USD'])
const n = (v, d = 8) => Number(v).toLocaleString('en-US', { maximumFractionDigits: d })

export function invoiceHtml(inv, co, email) { // invoice-v2
  const row = (en, ar, v) => `<tr><td style="padding:10px 0;color:#999;border-bottom:1px solid #222;font-size:13px">${en}<br><span style="color:#777;font-size:12px" dir="rtl">${ar}</span></td><td style="padding:10px 0;text-align:right;border-bottom:1px solid #222;word-break:break-all;font-size:14px">${v}</td></tr>`
  return `<div style="font-family:Arial,sans-serif;max-width:580px;margin:auto;background:#0B0B0B;color:#fff;padding:28px;border-radius:12px;border-top:5px solid #D4AF37">
    ${emailLogo()}
    <table style="width:100%"><tr><td><h2 style="color:#D4AF37;margin:0">${esc(co.company_name)}</h2><div style="color:#999;font-size:12px;margin-top:3px">${esc(co.address)}${co.tax_id ? ` · Tax ID ${esc(co.tax_id)}` : ''}</div></td>
    <td style="text-align:right"><b style="font-size:18px;letter-spacing:1px">INVOICE</b><br><span style="color:#999;font-size:13px" dir="rtl">فاتورة إيداع</span></td></tr></table>
    <div style="margin:16px 0 6px"><span style="display:inline-block;border:2px solid #22c55e;color:#22c55e;border-radius:6px;padding:3px 12px;font-size:12px;font-weight:bold;letter-spacing:1px">PAID / CREDITED</span></div>
    <table style="width:100%;border-collapse:collapse">
      ${row('Invoice no.', 'رقم الفاتورة', esc(inv.number))}${row('Date', 'التاريخ', new Date(inv.issued_at).toUTCString())}${row('Billed to', 'صادرة إلى', esc(email))}
      ${row('Description', 'الوصف', `Deposit to ${esc(inv.purpose)} wallet`)}${row('Asset / network', 'العملة / الشبكة', `${esc(inv.asset)} (${esc(inv.network)})`)}
      ${row('Rate at confirmation', 'السعر وقت التأكيد', `1 ${esc(inv.asset)} = ${n(inv.rate, 4)} USD`)}
      ${row('Transaction', 'رقم المعاملة', esc(inv.txid || 'Confirmed by administrator'))}
      ${row('Amount received', 'المبلغ المستلم', `<b style="color:#D4AF37;font-size:16px">${n(inv.amount)} ${esc(inv.asset)}</b>`)}
      ${row('Value', 'القيمة', `<b>${n(inv.usd_value, 2)} USD</b>`)}
    </table>
    <p style="color:#777;font-size:12px;margin-top:20px;line-height:1.7">${esc(co.footer)}<br>This is a computer-generated document and does not require a signature. · وثيقة صادرة إلكترونياً ولا تحتاج إلى توقيع.<br>You can view and print all your invoices in your dashboard under Invoices.</p></div>`
}

// One-time: invoices for deposits that were confirmed before invoicing started. Created silently (no email) and dated by the deposit.
async function backfillOld(co) {
  if (co.backfilled || !co.start_after) return
  const { data: deps, error } = await supabase.from('deposits')
    .select('id, asset, amount, confirmed_at').eq('status', 'confirmed').lt('confirmed_at', co.start_after).order('confirmed_at').limit(1000)
  if (error) throw error
  const list = deps || []
  let failed = 0
  if (list.length) {
    const { data: have } = await supabase.from('invoices').select('deposit_id').in('deposit_id', list.map(d => d.id))
    const done = new Set((have || []).map(h => h.deposit_id))
    for (const d of list.filter(x => !done.has(x.id))) {
      try {
        const rate = STABLE.has(d.asset) ? 1 : await getPrice(d.asset)
        const { data: id, error: e } = await supabase.rpc('create_invoice', { p_deposit: d.id, p_usd: Number(d.amount) * rate, p_rate: rate })
        if (e) throw e
        if (id) await supabase.from('invoices').update({ issued_at: d.confirmed_at, emailed_at: new Date().toISOString() }).eq('id', id)
      } catch (e) { failed++; console.error(`[invoices] backfill ${d.id}: ${e.message}`) }
    }
  }
  if (failed === 0 && list.length < 1000) await saveSetting('invoice', { backfilled: true })
}

export async function processInvoices() {
  const co = await getSetting('invoice')
  if (!co.start_after) { await saveSetting('invoice', { start_after: new Date().toISOString() }); return null }
  await backfillOld(co).catch(e => console.error('[invoices] backfill:', e.message))
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
