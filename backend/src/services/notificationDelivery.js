import { supabase } from '../lib/supabase.js'
import { sendMail, esc, emailLogo } from '../lib/mailer.js'
import { sendPush } from '../lib/push.js'
import { getSetting } from '../lib/settings.js'

// Every row in `notifications` (deposits, trades, withdrawals, new opportunities, "we miss you")
// is delivered once: by email and as a browser/phone push. Each row is claimed first, so it is never sent twice.
const front = () => (process.env.FRONTEND_URL || '').replace(/\/$/, '')

function pathFor(type) {
  const t = String(type || '')
  if (/trade|trading|position|signal|binary/.test(t)) return '/dashboard/trading'
  if (/opportunit|invest|missyou/.test(t)) return '/dashboard/investments'
  if (/deposit|withdraw|invoice|transaction/.test(t)) return '/dashboard/transactions'
  if (/bonus|balance/.test(t)) return '/dashboard/transactions'
  if (/support/.test(t)) return '/dashboard/support'
  return '/dashboard/notifications'
}

const LABELS = { deposit: 'إيداع · Deposit', withdrawal: 'سحب · Withdrawal', trade: 'تداول · Trading', trading: 'تداول · Trading', investment: 'استثمار · Investment', bonus: 'مكافأة · Bonus', balance: 'الرصيد · Balance', support: 'الدعم · Support', security: 'أمان · Security' }
const CTA = { deposit: 'عرض المعاملات', withdrawal: 'عرض المعاملات', trade: 'عرض الصفقات', trading: 'عرض الصفقات', investment: 'عرض الاستثمارات', bonus: 'فتح حسابي', balance: 'عرض المعاملات', support: 'فتح الدعم' }

function html(r, link, support) { // notify-v2
  const title = r.title_ar || r.title || 'الثراء كوانتوم'
  const body = r.message_ar || r.message || ''
  const label = LABELS[String(r.type || '')] || 'إشعار · Notification'
  const cta = CTA[String(r.type || '')] || 'فتح المنصة'
  const en = r.message && r.message_ar ? `<div dir="ltr" style="border-top:1px solid #222;margin-top:16px;padding-top:14px"><div style="color:#D4AF37;font-size:13px;font-weight:bold;margin-bottom:4px">${esc(r.title || '')}</div><p style="line-height:1.7;color:#aaa;font-size:13px;margin:0">${esc(r.message)}</p></div>` : ''
  const help = support ? `للمساعدة: <a href="mailto:${esc(support)}" style="color:#D4AF37;text-decoration:none">${esc(support)}</a><br>` : ''
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#0B0B0B;color:#fff;padding:28px;border-radius:14px;border:1px solid #2a2a2a;border-top:5px solid #D4AF37">
    <span style="display:none;max-height:0;overflow:hidden">${esc(body).slice(0, 110)}</span>
    ${emailLogo()}
    <div style="display:inline-block;background:#1a1a1a;border:1px solid #3a3320;color:#D4AF37;border-radius:100px;padding:4px 12px;font-size:12px;margin-bottom:12px" dir="rtl">${label}</div>
    <h2 style="color:#fff;margin:0 0 12px;font-size:20px" dir="rtl">${esc(title)}</h2>
    <p dir="rtl" style="line-height:1.9;font-size:15px;margin:0;color:#ddd">${esc(body)}</p>${en}
    ${front() ? `<p style="margin:24px 0 4px"><a href="${front()}${link}" style="background:#D4AF37;color:#0B0B0B;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;display:inline-block">${cta}</a></p>` : ''}
    <p style="color:#777;font-size:11px;margin-top:26px;line-height:1.8;border-top:1px solid #222;padding-top:14px" dir="rtl">${help}لإيقاف رسائل البريد: الإعدادات ← الإشعارات.<br>الثراء كوانتوم · Al Tharaa Quantum</p></div>`
}

export async function deliverNotifications() {
  const { data: pending, error } = await supabase.from('notifications').select('id').is('delivered_at', null).order('created_at').limit(40)
  if (error) throw error
  if (!pending || pending.length === 0) return null
  const { data: rows, error: ce } = await supabase.from('notifications')
    .update({ delivered_at: new Date().toISOString() }).in('id', pending.map(p => p.id)).is('delivered_at', null)
    .select('id, user_id, type, title, title_ar, message, message_ar')
  if (ce) throw ce
  if (!rows || rows.length === 0) return null
  const ids = [...new Set(rows.map(r => r.user_id))]
  const { data: profs } = await supabase.from('profiles').select('id, email, notify_email, notify_push').in('id', ids)
  const who = new Map((profs || []).map(p => [p.id, p]))
  const support = (await getSetting('general')).support_email || ''
  let emailed = 0, pushed = 0
  for (const r of rows) {
    const p = who.get(r.user_id)
    if (!p) continue
    const link = pathFor(r.type)
    if (p.email && p.notify_email !== false) {
      const subject = r.title_ar && r.title ? `${r.title_ar} | ${r.title}` : (r.title || r.title_ar || 'Al Tharaa Quantum')
      const res = await sendMail({ to: p.email, subject, html: html(r, link, support) })
      if (res.ok) emailed++
      else if (res.error) console.error('[email]', res.error)
    }
    if (p.notify_push !== false) {
      pushed += (await sendPush(r.user_id, { title: r.title_ar || r.title || 'الثراء كوانتوم', body: r.message_ar || r.message || '', url: link, tag: `${r.type || 'n'}-${r.id}` })) ? 1 : 0
    }
  }
  return { delivered: rows.length, emailed, pushed }
}
