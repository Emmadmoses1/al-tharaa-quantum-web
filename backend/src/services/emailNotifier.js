import { supabase } from '../lib/supabase.js'

// Emails every new notification row. Needs RESEND_API_KEY; does nothing without it.
let cursor = new Date().toISOString()
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

export async function sendNotificationEmails() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  const from = process.env.EMAIL_FROM || 'Al Tharaa Quantum <onboarding@resend.dev>'
  const { data: rows, error } = await supabase.from('notifications')
    .select('id, user_id, title, title_ar, message, message_ar, created_at').gt('created_at', cursor).order('created_at').limit(50)
  if (error) throw error
  if (!rows || rows.length === 0) return null
  cursor = rows[rows.length - 1].created_at
  const ids = [...new Set(rows.map(r => r.user_id))]
  const { data: profs } = await supabase.from('profiles').select('id, email').in('id', ids)
  const mail = new Map((profs || []).map(p => [p.id, p.email]))
  let sent = 0
  for (const r of rows) {
    const to = mail.get(r.user_id)
    if (!to) continue
    const subject = r.title_ar && r.title ? `${r.title_ar} | ${r.title}` : (r.title || r.title_ar || 'Al Tharaa Quantum')
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#0B0B0B;color:#fff;padding:24px;border-radius:12px">
      <h2 style="color:#D4AF37;margin:0 0 12px">${esc(r.title_ar || r.title)}</h2>
      <p dir="rtl" style="line-height:1.8">${esc(r.message_ar || r.message)}</p>
      ${r.message && r.message_ar ? `<p style="line-height:1.7;color:#bbb">${esc(r.message)}</p>` : ''}
      <p style="color:#777;font-size:12px;margin-top:20px">Al Tharaa Quantum</p></div>`
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject, html }),
      })
      if (resp.ok) sent++; else console.error('[email]', resp.status, (await resp.text()).slice(0, 200))
    } catch (e) { console.error('[email] send failed:', e.message) }
  }
  return sent ? { emailed: sent } : null
}
