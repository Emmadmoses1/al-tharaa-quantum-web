import { sendMail, esc } from './mailer.js'
import { clientIp } from './client.js'

// Emails the account owner when a sign-in comes from a country never seen on that account before.
// First-ever sign-in, unknown country and repeat alerts within 6 hours are skipped, so it is never noisy.
const recent = new Map()   // user id -> time of last alert

const mask = ip => {
  if (!ip) return ''
  if (ip.includes(':')) return ip.split(':').slice(0, 3).join(':') + ':…'
  const p = ip.split('.')
  return p.length === 4 ? `${p[0]}.${p[1]}.•.•` : ''
}

export async function newLoginAlert(supabase, uid, req, country) {
  if (!country) return false
  const t = recent.get(uid)
  if (t && Date.now() - t < 6 * 3600000) return false
  const { data: prior } = await supabase.from('user_events').select('meta').eq('user_id', uid).eq('type', 'login')
    .order('created_at', { ascending: false }).limit(50)
  if (!prior || prior.length === 0) return false
  const known = new Set(prior.map(e => String(e.meta?.country || '').toUpperCase()).filter(Boolean))
  if (known.size === 0 || known.has(country.toUpperCase())) return false
  const { data: p } = await supabase.from('profiles').select('email, full_name').eq('id', uid).single()
  if (!p?.email) return false
  recent.set(uid, Date.now())
  if (recent.size > 5000) recent.clear()
  const when = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
  const ip = mask(clientIp(req))
  const r = await sendMail({
    to: p.email, subject: 'تسجيل دخول جديد إلى حسابك | New sign-in to your account',
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#0B0B0B;color:#fff;padding:26px;border-radius:14px;border:1px solid #2a2a2a">
      <h2 style="color:#D4AF37;margin:0 0 10px" dir="rtl">مرحباً ${esc(p.full_name || '')}</h2>
      <p dir="rtl" style="line-height:1.9;margin:0 0 12px">سُجّل دخول إلى حسابك في الثراء كوانتوم من بلد جديد (<b>${esc(country)}</b>).</p>
      <p dir="ltr" style="color:#bbb;font-size:13px;margin:0 0 14px">${esc(when)}${ip ? ' · IP ' + esc(ip) : ''}</p>
      <p dir="rtl" style="line-height:1.9;margin:0 0 12px">إن كنت أنت، فلا حاجة لأي إجراء. وإن لم تكن أنت، فغيّر كلمة المرور فوراً من خيار "نسيت كلمة المرور" وتواصل مع الدعم.</p>
      <p dir="ltr" style="color:#999;font-size:12px;margin:0">A new sign-in from <b>${esc(country)}</b> was detected. If this was you, no action is needed. If not, reset your password right away and contact support.</p></div>`,
  })
  if (!r.ok) console.error('[security] new-login email failed:', r.skipped || r.error)
  return !!r.ok
}
