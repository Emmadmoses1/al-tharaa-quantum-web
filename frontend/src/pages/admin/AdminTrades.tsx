import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Pill, Chips, KV, btn, cardCss, cardGrid, ago } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

/* eslint-disable @typescript-eslint/no-explicit-any */
const n = (v: unknown, d = 2) => (v == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: d }))

export default function AdminTrades() {
  const qc = useQueryClient()
  const [f, setF] = useState('open')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const q = useQuery({ queryKey: ['admin-trades', f], staleTime: 0, refetchInterval: 20000, queryFn: () => api.get<any[]>(`/api/admin/trades${f === 'all' ? '' : `?status=${f}`}`) })

  async function close(id: string) {
    if (!window.confirm('Force-close this trade at the current market price?')) return
    setBusy(id); setMsg(null)
    try { await api.post(`/api/admin/trades/${id}/close`, {}); setMsg('Trade closed'); qc.invalidateQueries({ queryKey: ['admin-trades'] }) }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Failed') }
    setBusy(null)
  }

  const rows = q.data || []
  const exposure = rows.filter(t => t.status === 'open').reduce((s, t) => s + Number(t.amount_usdt || 0), 0)
  const pnl = rows.reduce((s, t) => s + (t.pnl != null ? Number(t.pnl) : 0), 0)

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>User Trades</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 14 }}>
        Every user trade. Open trades update live. Force-close settles at the current market price.
      </p>
      <div style={{ ...cardCss, cursor: 'default', marginBottom: 14 }}>
        <KV k="Trades shown" v={String(rows.length)} />
        <KV k="Open exposure (USDT)" v={n(exposure)} />
        <KV k="P&L of shown trades (USDT)" v={`${pnl >= 0 ? '+' : ''}${n(pnl)}`} />
      </div>
      <Chips options={['open', 'closed', 'all']} value={f} onChange={setF} />
      {msg && <div style={{ marginBottom: 12, fontSize: 12, color: '#D4AF37', fontFamily: 'Montserrat' }}>{msg}</div>}
      {q.isLoading ? <div style={cardGrid}>{[1, 2, 3].map(i => <Skeleton key={i} height={120} borderRadius={14} />)}</div>
        : q.isError ? <ErrorState english onRetry={q.refetch} />
        : rows.length === 0 ? <div style={{ textAlign: 'center', padding: '50px 0', color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat', fontSize: 13 }}>No trades</div>
        : (
          <div style={cardGrid}>
            {rows.map(t => (
              <div key={t.id} style={{ ...cardCss, cursor: 'default' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <b style={{ color: '#fff', fontFamily: 'Montserrat' }}>{t.asset}/USDT</b>
                  <Pill text={t.status} color={t.status === 'open' ? '#10b981' : '#9ca3af'} />
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.profiles?.email || t.user_id}</div>
                <KV k="Amount" v={`${n(t.amount_usdt)} USDT`} />
                <KV k="Entry" v={n(t.executed_price)} />
                {t.status === 'open' && <KV k="Now" v={n(t.price)} />}
                <KV k="Stop / Target" v={`${n(t.stop_loss)} / ${n(t.take_profit)}`} />
                <KV k={t.status === 'open' ? 'Unrealized P&L' : 'Realized P&L'} v={t.pnl == null ? '—' : `${t.pnl >= 0 ? '+' : ''}${n(t.pnl)} USDT`} />
                <KV k="Opened" v={ago(t.created_at)} />
                {t.status === 'open' && <button disabled={busy === t.id} onClick={() => close(t.id)} style={{ ...btn('red', busy === t.id), marginTop: 10 }}>{busy === t.id ? 'Closing…' : 'Force close'}</button>}
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
