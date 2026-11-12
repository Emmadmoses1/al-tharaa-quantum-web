import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Pill, inputCss, btn, cardCss } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

type Row = { id: string | number; at: string; actor: string; action: string; entity: string; entity_id: string | number; meta: Record<string, unknown> | null }
type Page = { rows: Row[]; next: string | null }

export default function AdminAudit() {
  const [input, setInput] = useState('')
  const [action, setAction] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState<string | number | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true); setFailed(false)
    api.get<Page>(`/api/admin/audit?action=${encodeURIComponent(action)}`)
      .then(p => { if (alive) { setRows(p.rows); setNext(p.next) } })
      .catch(() => { if (alive) setFailed(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [action, tick])

  async function loadMore() {
    if (!next) return
    setMore(true)
    try {
      const p = await api.get<Page>(`/api/admin/audit?action=${encodeURIComponent(action)}&before=${encodeURIComponent(next)}`)
      setRows(r => [...r, ...p.rows]); setNext(p.next)
    } catch { setFailed(true) }
    setMore(false)
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <h2 style={{ color: '#fff', fontFamily: 'Montserrat', fontSize: 20, margin: '0 0 6px' }}>Audit log</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.8, margin: '0 0 14px' }}>
        A read-only record of sensitive actions (settings, keys, withdrawals, documents). It cannot be edited from here.
      </p>
      <form onSubmit={e => { e.preventDefault(); setAction(input.trim()) }} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Filter by action, e.g. WITHDRAWAL or SETTINGS" style={inputCss} />
        <button type="submit" style={{ ...btn('gold'), width: 110 }}>Filter</button>
      </form>
      {loading ? <Skeleton /> : failed ? <ErrorState english onRetry={() => setTick(t => t + 1)} /> : (
        <div style={{ display: 'grid', gap: 8 }}>
          {rows.length === 0 ? <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>No entries.</div> : null}
          {rows.map(r => {
            const k = `${r.id}`
            return (
              <div key={k} style={{ ...cardCss, cursor: r.meta ? 'pointer' : 'default' }} onClick={() => r.meta && setOpen(open === k ? null : k)}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Pill text={r.action} color="#D4AF37" />
                  <span style={{ color: '#fff', fontSize: 13 }}>{r.actor}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginInlineStart: 'auto', fontFamily: 'Montserrat' }}>{new Date(r.at).toLocaleString('en-GB')}</span>
                </div>
                {r.entity ? <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 4 }}>{r.entity}{r.entity_id !== '' ? ` · ${r.entity_id}` : ''}</div> : null}
                {open === k && r.meta ? <pre style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(r.meta, null, 2)}</pre> : null}
              </div>
            )
          })}
          {next ? <button type="button" disabled={more} onClick={loadMore} style={btn('ghost', more)}>{more ? 'Loading…' : 'Load more'}</button> : null}
        </div>
      )}
    </div>
  )
}
