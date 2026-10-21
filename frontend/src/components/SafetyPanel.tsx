/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { btn, inputCss, labelCss, cardCss } from './ui/AdminKit'

type Safety = { credit_caps: Record<string, number>; approval_thresholds: Record<string, number> }
const ASSETS = ['USDT', 'USDC', 'BTC', 'ETH']

export default function SafetyPanel() {
  const { profile } = useAuth()
  const isSuper = profile?.role === 'super_admin'
  const q = useQuery({ queryKey: ['safety'], staleTime: 0, queryFn: () => api.get<Safety>('/api/admin/binary/safety') })
  const [d, setD] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const s = q.data
  if (!s) return null

  async function save() {
    setBusy(true); setMsg(null)
    const body: any = {}
    for (const [k, v] of Object.entries(d)) {
      const [group, asset] = k.split('.')
      body[group] = { ...(body[group] || {}), [asset]: Number(v) }
    }
    try { await api.patch('/api/admin/binary/safety', body); setMsg('Saved'); setD({}); await q.refetch() }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Failed') }
    setBusy(false)
  }

  const field = (group: 'credit_caps' | 'approval_thresholds', a: string) => (
    <div key={group + a}>
      <label style={labelCss}>{a}</label>
      <input disabled={!isSuper} inputMode="decimal" value={d[`${group}.${a}`] ?? String(s[group][a] ?? '')}
        onChange={e => setD(x => ({ ...x, [`${group}.${a}`]: e.target.value.replace(/[^0-9.]/g, '') }))} style={{ ...inputCss, opacity: isSuper ? 1 : 0.6 }} />
    </div>
  )

  return (
    <div style={{ ...cardCss, cursor: 'default', marginTop: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontFamily: 'Montserrat', marginBottom: 4 }}>Money safety</div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', lineHeight: 1.6, marginBottom: 12 }}>
        {isSuper ? 'Only you (super admin) can change these.' : 'View only. A super admin can change these.'}
      </p>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat', marginBottom: 8 }}>Max single deposit credit (above this is refused)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>{ASSETS.map(a => field('credit_caps', a))}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat', marginBottom: 8 }}>Withdrawals at or above this need a super admin</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>{ASSETS.map(a => field('approval_thresholds', a))}</div>
      {isSuper && <button disabled={busy || Object.keys(d).length === 0} onClick={save} style={btn('gold', busy || Object.keys(d).length === 0)}>Save safety limits</button>}
      {msg && <div style={{ marginTop: 8, fontSize: 12, color: '#D4AF37', fontFamily: 'Montserrat' }}>{msg}</div>}
    </div>
  )
}
