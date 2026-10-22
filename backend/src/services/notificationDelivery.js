import { supabase } from '../lib/supabase.js'
import { sendMail, esc, emailLogo } from '../lib/mailer.js'
import { sendPush } from '../lib/push.js'

// Every row in `notifications` (deposits, trades, withdrawals, new opportunities, "we miss you")
// is delivered once: by email and as a browser/phone push. Each row is claimed first, so it is never sent twice.
const front = () => (process.env.FRONTEND_URL || '').replace(/\/$/, '')

function pathFor(type) {
  const t = String(type || '')
  if (/trade|trading|position|signal|binary/.test(t)) return '/dashboard/trading'
  if (/opportunit|invest|missyou/.test(t)) return '/dashboard/investments'
  if (/deposit|withdraw|invoice|transaction/.test(t)) return '/dashboard/transactions'
  return '/dashboard/notifications'
}

function html(r, link) {
  const title = r.title_ar || r.title || 'الثراء كوانتوم'
  const body = r.message_ar || r.message || ''
  const en = r.message && r.message_ar ? `<p style="line-height:1.7;color:#aaa;font-size:13px;margin:12px 0 0" dir="ltr">${esc(r.message)}</p>` : ''
  return `<div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;background:#0B0B0B;color:#fff;padding:26px;border-radius:14px;border:1px solid #2a2a2a">
    ${emailLogo()}
    <h2 style="color:#D4AF37;margin:0 0 12px;font-size:20px" dir="rtl">${esc(title)}</h2>
    <p dir="rtl" style="line-height:1.9;font-size:15px;margin:0">${esc(body)}</p>${en}
    ${front() ? `<p style="margin:22px 0 4px"><a href="${front()}${link}" style="background:#D4AF37;color:#0B0B0B;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;display:inline-block">فتح المنصة · Open</a></p>` : ''}
    <p style="color:#777;font-size:11px;margin-top:22px" dir="rtl">لإيقاف رسائل البريد: الإعدادات ← الإشعارات. Al Tharaa Quantum</p></div>`
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
  let emailed = 0, pushed = 0
  for (const r of rows) {
    const p = who.get(r.user_id)
    if (!p) continue
    const link = pathFor(r.type)
    if (p.email && p.notify_email !== false) {
      const subject = r.title_ar && r.title ? `${r.title_ar} | ${r.title}` : (r.title || r.title_ar || 'Al Tharaa Quantum')
      const res = await sendMail({ to: p.email, subject, html: html(r, link) })
      if (res.ok) emailed++
      else if (res.error) console.error('[email]', res.error)
    }
    if (p.notify_push !== false) {
      pushed += (await sendPush(r.user_id, { title: r.title_ar || r.title || 'الثراء كوانتوم', body: r.message_ar || r.message || '', url: link, tag: `${r.type || 'n'}-${r.id}` })) ? 1 : 0
    }
  }
  return { delivered: rows.length, emailed, pushed }
}
