import { supabase } from '../lib/supabase.js'
import { sendMail, esc, emailLogo } from '../lib/mailer.js'

// Emails every new notification row (skips users who turned email off in Settings).
let cursor = new Date().toISOString()

export async function sendNotificationEmails() {
  const { data: rows, error } = await supabase.from('notifications')
    .select('id, user_id, title, title_ar, message, message_ar, created_at').gt('created_at', cursor).order('created_at').limit(50)
  if (error) throw error
  if (!rows || rows.length === 0) return null
  cursor = rows[rows.length - 1].created_at
  const ids = [...new Set(rows.map(r => r.user_id))]
  const { data: profs } = await supabase.from('profiles').select('id, email, notify_email').in('id', ids)
  const who = new Map((profs || []).map(p => [p.id, p]))
  let sent = 0
  for (const r of rows) {
    const p = who.get(r.user_id)
    if (!p?.email || p.notify_email === false) continue
    const subject = r.title_ar && r.title ? `${r.title_ar} | ${r.title}` : (r.title || r.title_ar || 'Al Tharaa Quantum')
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#0B0B0B;color:#fff;padding:24px;border-radius:12px">
      ${emailLogo()}
      <h2 style="color:#D4AF37;margin:0 0 12px">${esc(r.title_ar || r.title)}</h2>
      <p dir="rtl" style="line-height:1.8">${esc(r.message_ar || r.message)}</p>
      ${r.message && r.message_ar ? `<p style="line-height:1.7;color:#bbb">${esc(r.message)}</p>` : ''}
      <p style="color:#777;font-size:12px;margin-top:20px">Al Tharaa Quantum</p></div>`
    const res = await sendMail({ to: p.email, subject, html })
    if (res.ok) sent++
    else if (res.error) console.error('[email]', res.error)
  }
  return sent ? { emailed: sent } : null
}
