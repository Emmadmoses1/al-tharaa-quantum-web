import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Pill, btn, inputCss, labelCss, cardGrid, cardCss } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

/* eslint-disable @typescript-eslint/no-explicit-any */
const RISK: Record<string, string> = { conservative: '#10b981', moderate: '#D4AF37', aggressive: '#ef4444' }
const FIELDS: [string, string][] = [
  ['max_position_size_percent', 'Max position size %'], ['max_daily_loss_percent', 'Max daily loss %'],
  ['max_open_positions', 'Max open positions'], ['stop_loss_percent', 'Stop loss %'], ['take_profit_percent', 'Take profit %'],
]

export default function AdminStrategies() {
  const q = useQuery({ queryKey: ['admin-strategies'], staleTime: 0, queryFn: () => api.get<any[]>('/api/admin/strategies') })
  const [open, setOpen] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function run(key: string, fn: () => Promise<unknown>, done: string) {
    setBusy(key); setMsg(null)
    try { await fn(); setMsg(done); await q.refetch() } catch (e) { setMsg(e instanceof Error ? e.message : 'Failed') }
    setBusy(null)
  }

  const list = q.data || []
  const on = list.filter(s => s.is_enabled).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>AI Strategies</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', lineHeight: 1.7 }}>
            {on} of {list.length} enabled. Changes are saved immediately. The signal engine only runs enabled strategies; disabling one retires its live signals.
          </p>
        </div>
        <button disabled={busy === 'all' || on === 0} onClick={() => { if (window.confirm('Disable ALL strategies and retire every live signal?')) run('all', () => api.post('/api/admin/strategies/disable-all', {}), 'All strategies disabled') }}
          style={{ ...btn('red', busy === 'all' || on === 0), width: 'auto', padding: '10px 16px' }}>Emergency stop all</button>
      </div>
      {msg && <div style={{ marginBottom: 12, fontSize: 12, color: '#D4AF37', fontFamily: 'Montserrat' }}>{msg}</div>}

      {q.isLoading ? <div style={cardGrid}>{[1, 2, 3].map(i => <Skeleton key={i} height={120} borderRadius={14} />)}</div>
        : q.isError ? <ErrorState english onRetry={q.refetch} />
        : (
          <div style={cardGrid}>
            {list.map(s => (
              <div key={s.id} style={{ ...cardCss, cursor: 'default', borderColor: s.is_enabled ? 'rgba(16,185,129,0.4)' : undefined }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                  <b style={{ color: '#fff', fontFamily: 'Montserrat', fontSize: 15 }}>{s.name}</b>
                  <Pill text={s.risk_level} color={RISK[s.risk_level]} />
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', fontFamily: 'Montserrat', marginBottom: 8, lineHeight: 1.6 }}>
                  {s.timeframe} · {(s.supported_assets || []).join(', ') || '—'}{s.description ? ` · ${s.description}` : ''}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button disabled={busy === s.id} onClick={() => run(s.id, () => api.patch(`/api/admin/strategies/${s.id}`, { is_enabled: !s.is_enabled }), s.is_enabled ? `${s.name} disabled` : `${s.name} enabled`)}
                    style={btn(s.is_enabled ? 'red' : 'green', busy === s.id)}>{busy === s.id ? 'Saving…' : s.is_enabled ? 'Turn off' : 'Turn on'}</button>
                  <button onClick={() => { setOpen(open === s.id ? null : s.id); setDraft({}) }} style={btn('ghost')}>{open === s.id ? 'Close' : 'Parameters'}</button>
                </div>
                {open === s.id && (
                  <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                    {FIELDS.map(([k, label]) => (
                      <div key={k}>
                        <label style={labelCss}>{label}</label>
                        <input inputMode="decimal" value={draft[k] ?? String(s[k] ?? '')} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value.replace(/[^0-9.]/g, '') }))} style={inputCss} />
                      </div>
                    ))}
                    <button disabled={busy === s.id + 'p' || Object.keys(draft).length === 0}
                      onClick={() => run(s.id + 'p', async () => {
                        const body: Record<string, number> = {}
                        for (const [k, v] of Object.entries(draft)) body[k] = Number(v)
                        await api.patch(`/api/admin/strategies/${s.id}`, body); setDraft({})
                      }, 'Parameters saved')}
                      style={btn('gold', busy === s.id + 'p' || Object.keys(draft).length === 0)}>Save parameters</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
