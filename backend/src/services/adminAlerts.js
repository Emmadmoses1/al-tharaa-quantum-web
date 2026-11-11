import { supabase } from '../lib/supabase.js'
import { sendMail, esc } from '../lib/mailer.js'

// Emails the admins when something needs attention. Each problem is reported once, then again only after COOLDOWN.
const COOLDOWN = 6 * 3600 * 1000
const last = new Map()          // alert key -> time last sent
let seenFlagged = null          // ids already flagged when we started: not re-announced

const due = key => { const t = last.get(key); return !t || Date.now() - t > COOLDOWN }

async function collect() {
  const out = []
  const now = Date.now()

  // 1. Signal engine failing or stalled
  const { data: st } = await supabase.from('ai_engine_state').select('enabled, last_run_at, last_result').eq('id', 1).maybeSingle()
  if (st && st.enabled !== false) {
    const every = Number(process.env.SIGNAL_INTERVAL_MIN || 15) * 60000
    const age = st.last_run_at ? now - new Date(st.last_run_at).getTime() : Infinity
    if (age > Math.max(3 * every, 45 * 60000)) out.push({ key: 'engine-stalled', text: `Signal engine has not run since ${st.last_run_at || 'ever'}.` })
    const r = st.last_result
    if (r && r.created === 0 && Array.isArray(r.errors) && r.errors.length) out.push({ key: 'engine-errors', text: `Signal engine produced no signals. Errors: ${r.errors.slice(0, 3).join('; ')}` })
  }

  // 2. Binary orders overdue by more than 5 minutes
  const { count } = await supabase.from('binary_orders').select('id', { count: 'exact', head: true })
    .eq('status', 'open').lt('expires_at', new Date(now - 5 * 60000).toISOString())
  if (count) out.push({ key: 'binary-stuck', text: `${count} binary order(s) are more than 5 minutes past expiry and still unsettled. Check the price feeds and the server logs.` })

  // 3. Users newly flagged (shared device, etc.)
  const { data: fl } = await supabase.from('profiles').select('id, email, flag_reason').eq('flagged', true).limit(500)
  const ids = new Set((fl || []).map(p => p.id))
  if (seenFlagged === null) seenFlagged = ids
  else for (const p of fl || []) if (!seenFlagged.has(p.id)) { seenFlagged.add(p.id); out.push({ key: `flag-${p.id}`, text: `User flagged: ${p.email} — ${p.flag_reason || 'no reason recorded'}` }) }
  return out
}

export async function runAdminAlerts() {
  const found = (await collect()).filter(a => due(a.key))
  if (!found.length) return null
  const { data: admins } = await supabase.from('profiles').select('email').in('role', ['admin', 'super_admin'])
  const to = [...new Set((admins || []).map(a => a.email).filter(Boolean))]
  if (!to.length) return null
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#0B0B0B;color:#fff;padding:24px;border-radius:14px;border:1px solid #2a2a2a">
    <h2 style="color:#D4AF37;margin:0 0 12px">Al Tharaa Quantum — admin alert</h2>
    ${found.map(a => `<p style="line-height:1.7;margin:0 0 10px;padding:10px 12px;background:#141414;border-radius:8px">${esc(a.text)}</p>`).join('')}
    <p style="color:#888;font-size:12px;margin:12px 0 0">Each alert repeats at most every 6 hours while the problem remains.</p></div>`
  let sent = 0
  for (const email of to) {
    const m = await sendMail({ to: email, subject: `[Alert] ${found.length} item(s) need attention`, html })
    if (m.ok) sent++
  }
  if (sent) for (const a of found) last.set(a.key, Date.now())
  return { alerts: found.length, emailed: sent }
}
