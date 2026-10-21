import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Pill, Chips, KV, btn, inputCss, labelCss, cardCss, cardGrid, ago } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'
import SafetyPanel from '../../components/SafetyPanel'

/* eslint-disable @typescript-eslint/no-explicit-any */
const n = (v: unknown, d = 2) => (v == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: d }))
const PERIOD: Record<string, number> = { '1d': 1, '7d': 7, '30d': 30, all: 0 }
const FIELDS: [string, string][] = [
  ['payout_percent', 'Payout % (50-95)'], ['min_stake', 'Min stake (USDT)'], ['max_stake', 'Max stake (USDT)'],
  ['max_open_per_user', 'Max open orders per user'], ['max_platform_exposure', 'Max total exposure (USDT you could owe)'],
]

export default function AdminBinary() {
  const [period, setPeriod] = useState('7d')
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const cfg = useQuery({ queryKey: ['bin-admin-cfg'], staleTime: 0, queryFn: () => api.get<any>('/api/admin/binary/config') })
  const stats = useQuery({ queryKey: ['bin-admin-stats', period], staleTime: 0, refetchInterval: 15000, queryFn: () => api.get<any>(`/api/admin/binary/stats?days=${PERIOD[period]}`) })
  const orders = useQuery({ queryKey: ['bin-admin-orders'], staleTime: 0, refetchInterval: 15000, queryFn: () => api.get<any[]>('/api/admin/binary/orders') })

  async function save(body: Record<string, unknown>, done: string) {
    setBusy(true); setMsg(null)
    try { await api.patch('/api/admin/binary/config', body); setMsg(done); setDraft({}); await cfg.refetch() }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Failed') }
    setBusy(false)
  }

  const c = cfg.data
  const s = stats.data
  const pnlCol = s && s.house_pnl >= 0 ? '#10b981' : '#ef4444'

  return (
    <div translate="no" className="notranslate">
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>Binary Desk</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 14, lineHeight: 1.7 }}>
        Controls and results for the trading room. Winners are paid from your wallets, so watch exposure and compare with Reserves Check.
      </p>

      {cfg.isLoading ? <Skeleton height={90} borderRadius={14} /> : cfg.isError || !c ? <ErrorState english onRetry={cfg.refetch} /> : (
        <div style={{ ...cardCss, cursor: 'default', marginBottom: 14, borderColor: c.binary_enabled ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
            <b style={{ color: '#fff', fontFamily: 'Montserrat' }}>Trading room</b>
            <Pill text={c.binary_enabled ? 'live' : 'paused'} color={c.binary_enabled ? '#10b981' : '#ef4444'} />
          </div>
          <button disabled={busy} onClick={() => { if (c.binary_enabled && !window.confirm('Pause ALL new orders now? Open orders still settle normally.')) return; save({ binary_enabled: !c.binary_enabled }, c.binary_enabled ? 'Trading paused' : 'Trading resumed') }}
            style={btn(c.binary_enabled ? 'red' : 'green', busy)}>{c.binary_enabled ? 'Pause trading' : 'Resume trading'}</button>
        </div>
      )}

      <Chips options={Object.keys(PERIOD)} value={period} onChange={setPeriod} />
      {stats.isLoading ? <Skeleton height={200} borderRadius={14} /> : stats.isError || !s ? <ErrorState english onRetry={stats.refetch} /> : (
        <div style={cardGrid}>
          <div style={{ ...cardCss, cursor: 'default' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', letterSpacing: 1, marginBottom: 6 }}>RESULTS ({period})</div>
            <KV k="House profit / loss (USDT)" v={`${s.house_pnl >= 0 ? '+' : ''}${n(s.house_pnl)}`} />
            <KV k="Total staked (settled)" v={n(s.staked)} />
            <KV k="Paid out to winners" v={n(s.paid_out)} />
            <KV k="Orders / traders" v={`${s.orders} / ${s.users}`} />
            <KV k="Won / lost / void-tie" v={`${s.won} / ${s.lost} / ${s.void_or_tie}`} />
            <KV k="User win rate" v={s.user_win_rate == null ? '—' : `${s.user_win_rate}%`} />
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: pnlCol, fontFamily: 'Montserrat' }}>{s.house_pnl >= 0 ? '+' : ''}{n(s.house_pnl)} USDT</div>
          </div>
          <div style={{ ...cardCss, cursor: 'default' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', letterSpacing: 1, marginBottom: 6 }}>OPEN RIGHT NOW</div>
            <KV k="Open orders" v={String(s.open_count)} />
            <KV k="Stakes held" v={`${n(s.open_stake)} USDT`} />
            <KV k="Most you could owe in profit" v={`${n(s.open_max_liability)} USDT`} />
            {c && <KV k="Exposure cap" v={`${n(c.max_platform_exposure)} USDT`} />}
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Montserrat', color: '#D4AF37', margin: '22px 0 10px' }}>Limits</h2>
      {c && (
        <div style={{ ...cardCss, cursor: 'default' }}>
          <div style={{ display: 'grid', gap: 10 }}>
            {FIELDS.map(([k, label]) => (
              <div key={k}>
                <label style={labelCss}>{label}</label>
                <input inputMode="decimal" value={draft[k] ?? String(c[k])} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value.replace(/[^0-9.]/g, '') }))} style={inputCss} />
              </div>
            ))}
            <button disabled={busy || Object.keys(draft).length === 0} style={btn('gold', busy || Object.keys(draft).length === 0)}
              onClick={() => { const b: Record<string, number> = {}; for (const [k, v] of Object.entries(draft)) b[k] = Number(v); save(b, 'Limits saved') }}>Save limits</button>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', marginTop: 10, lineHeight: 1.6 }}>New limits apply to new orders only. Orders already open keep the payout they were placed with.</p>
        </div>
      )}
      {msg && <div style={{ marginTop: 10, fontSize: 12, color: '#D4AF37', fontFamily: 'Montserrat' }}>{msg}</div>}

      <SafetyPanel />

      <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Montserrat', color: '#D4AF37', margin: '22px 0 10px' }}>Recent orders</h2>
      {orders.isLoading ? <Skeleton height={120} borderRadius={14} /> : orders.isError ? <ErrorState english onRetry={orders.refetch} /> : (
        <div style={{ display: 'grid', gap: 8 }}>
          {(orders.data || []).map(o => {
            const col = o.status === 'won' ? '#10b981' : o.status === 'lost' ? '#ef4444' : o.status === 'open' ? '#D4AF37' : '#9ca3af'
            return (
              <div key={o.id} style={{ ...cardCss, cursor: 'default', padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 12.5, color: '#fff' }}><b>{o.asset}</b> {o.direction === 'up' ? '▲' : '▼'} · {n(o.amount)} USDT · {o.expiry_seconds / 60}m</span>
                  <Pill text={o.status} color={col} />
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {o.profiles?.email || o.user_id} · {n(o.entry_price, 4)}{o.close_price ? ` → ${n(o.close_price, 4)}` : ''} · {ago(o.opened_at)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
