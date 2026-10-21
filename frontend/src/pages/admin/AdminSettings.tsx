import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { btn, inputCss, labelCss, cardCss } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

type Val = string | number | boolean | null
type Field = { k: string; label: string; kind: 'text' | 'number' | 'bool'; help?: string; placeholder?: string }
type Section = { key: string; title: string; desc: string; fields: Field[] }

// Every setting here is stored in the database and used by the platform. Nothing on this page is decorative.
const SECTIONS: Section[] = [
  { key: 'general', title: 'General', desc: 'Name, contact and maintenance mode.', fields: [
    { k: 'platform_name', label: 'Platform name', kind: 'text' },
    { k: 'support_email', label: 'Support email', kind: 'text', placeholder: 'support@yourdomain.com' },
    { k: 'maintenance', label: 'Maintenance mode (pauses new trades and withdrawals, shows a banner)', kind: 'bool' },
    { k: 'maintenance_message', label: 'Banner message (optional)', kind: 'text' },
  ] },
  { key: 'bonus', title: 'Welcome bonus', desc: 'Credited once per account to the trading wallet. Withdrawal unlocks after the 4x trading rule.', fields: [
    { k: 'enabled', label: 'Bonus enabled', kind: 'bool' },
    { k: 'usd', label: 'Bonus value in USD (converted at the USDT rate)', kind: 'number' },
    { k: 'daily_cap', label: 'Max new bonuses per day (0 = unlimited)', kind: 'number', help: 'Limits the damage from mass fake sign-ups.' },
    { k: 'require_email_confirmed', label: 'Require a confirmed email to receive it', kind: 'bool' },
  ] },
  { key: 'referral', title: 'Referral program', desc: 'Paid in USDT to the inviter on the invited user’s first qualifying deposit.', fields: [
    { k: 'enabled', label: 'Referral program enabled', kind: 'bool' },
    { k: 'reward_usdt', label: 'Reward per referral (USDT)', kind: 'number' },
    { k: 'min_deposit_usdt', label: 'Minimum first deposit to qualify (USD value)', kind: 'number' },
  ] },
  { key: 'investments', title: 'Investments', desc: 'Rules for leaving an investment before it matures.', fields: [
    { k: 'early_redeem_enabled', label: 'Allow early redemption', kind: 'bool' },
    { k: 'early_redeem_penalty_percent', label: 'Early redemption penalty (%)', kind: 'number' },
  ] },
  { key: 'invoice', title: 'Invoices', desc: 'Printed on every deposit invoice and invoice email.', fields: [
    { k: 'company_name', label: 'Company name', kind: 'text' },
    { k: 'address', label: 'Address', kind: 'text' },
    { k: 'tax_id', label: 'Tax / registration ID (optional)', kind: 'text' },
    { k: 'footer', label: 'Footer note', kind: 'text' },
  ] },
  { key: 'email', title: 'Email', desc: 'Needs a Resend key under Integrations. Without it nothing is sent.', fields: [
    { k: 'enabled', label: 'Email enabled', kind: 'bool' },
    { k: 'from', label: 'From address', kind: 'text', placeholder: 'Al Tharaa <alerts@yourdomain.com>', help: 'Must be on a domain verified in Resend.' },
    { k: 'notify_deposit', label: 'Email an invoice on every confirmed deposit', kind: 'bool' },
  ] },
]

export default function AdminSettings() {
  const q = useQuery({ queryKey: ['admin-settings'], staleTime: 0, queryFn: () => api.get<Record<string, Record<string, Val>>>('/api/admin/settings') })
  const [draft, setDraft] = useState<Record<string, Record<string, Val>>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<Record<string, string>>({})

  const data = q.data
  const val = (sec: string, k: string): Val => (draft[sec] && k in draft[sec] ? draft[sec][k] : data?.[sec]?.[k] ?? '')
  const edit = (sec: string, k: string, v: Val) => setDraft(d => ({ ...d, [sec]: { ...(d[sec] || {}), [k]: v } }))

  async function save(sec: Section) {
    const changes = draft[sec.key]
    if (!changes) return
    const body: Record<string, Val> = {}
    for (const f of sec.fields) if (f.k in changes) body[f.k] = f.kind === 'number' ? Number(changes[f.k]) : changes[f.k]
    setBusy(sec.key); setMsg(m => ({ ...m, [sec.key]: '' }))
    try {
      await api.patch(`/api/admin/settings/${sec.key}`, body)
      setDraft(d => { const n = { ...d }; delete n[sec.key]; return n })
      setMsg(m => ({ ...m, [sec.key]: 'Saved' }))
      await q.refetch()
    } catch (e) { setMsg(m => ({ ...m, [sec.key]: e instanceof Error ? e.message : 'Failed' })) }
    setBusy(null)
  }

  return (
    <div translate="no" className="notranslate">
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>Settings</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 14, lineHeight: 1.7 }}>
        Saved in the database and applied immediately. Money limits and safety caps are under Binary Desk. API keys are under Integrations.
      </p>
      {q.isLoading ? <Skeleton height={200} borderRadius={14} /> : q.isError || !data ? <ErrorState english onRetry={q.refetch} /> : (
        <div style={{ display: 'grid', gap: 14 }}>
          {SECTIONS.map(sec => (
            <div key={sec.key} style={{ ...cardCss, cursor: 'default' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', fontFamily: 'Montserrat' }}>{sec.title}</div>
              <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', margin: '4px 0 12px', lineHeight: 1.6 }}>{sec.desc}</p>
              <div style={{ display: 'grid', gap: 12 }}>
                {sec.fields.map(f => {
                  const v = val(sec.key, f.k)
                  return (
                    <div key={f.k}>
                      <label style={labelCss}>{f.label}</label>
                      {f.kind === 'bool' ? (
                        <button type="button" onClick={() => edit(sec.key, f.k, !v)}
                          style={{ ...btn(v ? 'green' : 'ghost'), width: 110 }}>{v ? 'ON' : 'OFF'}</button>
                      ) : (
                        <input value={v == null ? '' : String(v)} inputMode={f.kind === 'number' ? 'decimal' : undefined} placeholder={f.placeholder}
                          onChange={e => edit(sec.key, f.k, f.kind === 'number' ? e.target.value.replace(/[^0-9.]/g, '') : e.target.value)} style={inputCss} />
                      )}
                      {f.help && <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat', marginTop: 4 }}>{f.help}</div>}
                    </div>
                  )
                })}
                <button disabled={busy === sec.key || !draft[sec.key]} onClick={() => save(sec)} style={btn('gold', busy === sec.key || !draft[sec.key])}>{busy === sec.key ? 'Saving…' : `Save ${sec.title.toLowerCase()}`}</button>
                {msg[sec.key] && <div style={{ fontSize: 12, color: msg[sec.key] === 'Saved' ? '#10b981' : '#ef4444', fontFamily: 'Montserrat' }}>{msg[sec.key]}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
