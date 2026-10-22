import { getSecret } from './secrets.js'
import { getSetting } from './settings.js'

export async function sendMail({ to, subject, html }) {
  const em = await getSetting('email')
  if (em.enabled === false) return { ok: false, skipped: 'disabled' }
  const key = await getSecret('RESEND_API_KEY')
  if (!key) return { ok: false, skipped: 'no_key' }
  const from = em.from || process.env.EMAIL_FROM || 'Al Tharaa Quantum <onboarding@resend.dev>'
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })
    if (!r.ok) return { ok: false, error: `${r.status} ${(await r.text()).slice(0, 200)}` }
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
}

export const emailLogo = () => {
  const base = (process.env.FRONTEND_URL || '').replace(/\/$/, '')
  return base ? `<img src="${base}/icon-192.png" width="44" height="44" alt="Al Tharaa Quantum" style="border-radius:10px;display:block;margin:0 0 14px">` : ''
}

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
