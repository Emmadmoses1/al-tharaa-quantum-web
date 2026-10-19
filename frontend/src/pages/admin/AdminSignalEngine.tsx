import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot } from 'lucide-react'
import { api } from '../../lib/api'
import { btn, KV } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

type Engine = {
  enabled: boolean; last_run_at: string | null; last_result: { created?: number; message?: string; errors?: string[] } | null
  enabled_strategies: number; active_signals: number; open_positions: number
}

export default function AdminSignalEngine() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const q = useQuery({ queryKey: ['admin-engine'], queryFn: () => api.get<Engine>('/api/admin/engine'), refetchInterval: 15000, staleTime: 0 })

  async function act(fn: () => Promise<unknown>, done: string) {
    setBusy(true); setMsg(null)
    try { await fn(); setMsg(done); qc.invalidateQueries({ queryKey: ['admin-engine'] }) }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Failed') }
    setBusy(false)
  }

  const e = q.data
  const last = e?.last_result
  return (
    <div translate="no" className="notranslate">
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>AI Signal Engine</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 16, lineHeight: 1.7 }}>
        Rule-based engine (EMA20/50, RSI, ATR on live Binance candles). Publishes signals for every enabled strategy and closes user positions at stop-loss or take-profit.
      </p>
      {q.isLoading ? <Skeleton height={200} borderRadius={14} /> : q.isError || !e ? <ErrorState english onRetry={q.refetch} /> : (
        <div style={{ background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Bot size={20} color={e.enabled ? '#10b981' : '#9ca3af'} />
            <span style={{ fontWeight: 800, color: e.enabled ? '#10b981' : '#9ca3af', fontFamily: 'Montserrat', fontSize: 14 }}>{e.enabled ? 'RUNNING' : 'PAUSED'}</span>
          </div>
          <KV k="Enabled strategies" v={String(e.enabled_strategies)} />
          <KV k="Active signals" v={String(e.active_signals)} />
          <KV k="Open user positions" v={String(e.open_positions)} />
          <KV k="Last run" v={e.last_run_at ? new Date(e.last_run_at).toLocaleString('en-GB') : 'Never'} />
          <KV k="Last result" v={last ? (last.message || `${last.created ?? 0} signals${last.errors?.length ? `, ${last.errors.length} errors` : ''}`) : '—'} />
          {last?.errors?.length ? <div style={{ marginTop: 10, fontSize: 11, color: '#ef4444', fontFamily: 'Montserrat', wordBreak: 'break-word' }}>{last.errors.join(' | ')}</div> : null}
          {msg && <div style={{ marginTop: 12, fontSize: 12, color: '#D4AF37', fontFamily: 'Montserrat' }}>{msg}</div>}
          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            <button disabled={busy} onClick={() => act(() => api.post('/api/admin/engine/run', {}), 'Run finished')} style={btn('gold', busy)}>{busy ? 'Working…' : 'Run now'}</button>
            <button disabled={busy} onClick={() => act(() => api.post('/api/admin/engine', { enabled: !e.enabled }), e.enabled ? 'Engine paused' : 'Engine resumed')} style={btn(e.enabled ? 'red' : 'green', busy)}>
              {e.enabled ? 'Pause automatic engine' : 'Resume automatic engine'}
            </button>
            <button disabled={busy} onClick={() => act(() => api.post('/api/admin/deposits/scan', {}), 'Deposit scan finished')} style={btn('ghost', busy)}>Scan deposits now</button>
          </div>
        </div>
      )}
    </div>
  )
}
