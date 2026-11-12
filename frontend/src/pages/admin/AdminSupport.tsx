import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Pill, Chips, inputCss, btn, cardCss, ago } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'

type T = { id: number; user_id: string; email: string; name: string; subject: string; message: string; status: 'open' | 'answered' | 'closed'; admin_reply: string | null; created_at: string }
const COLORS: Record<T['status'], string> = { open: '#f59e0b', answered: '#10b981', closed: '#6b7280' }

export default function AdminSupport() {
  const [status, setStatus] = useState('open')
  const [rows, setRows] = useState<T[] | null>(null)
  const [reply, setReply] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState<number | null>(null)
  const [err, setErr] = useState('')
  const load = useCallback(() => { api.get<T[]>(`/api/admin/support?status=${status}`).then(setRows).catch(() => setErr('Failed to load')) }, [status])
  useEffect(() => { setRows(null); load() }, [load])

  async function send(t: T) {
    const text = (reply[t.id] || '').trim()
    if (text.length < 2) return
    setBusy(t.id); setErr('')
    try { await api.post(`/api/admin/support/${t.id}/reply`, { reply: text }); setReply(r => ({ ...r, [t.id]: '' })); load() }
    catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setBusy(null)
  }
  async function close(t: T) { try { await api.post(`/api/admin/support/${t.id}/close`, {}); load() } catch { setErr('Failed') } }

  return (
    <div style={{ maxWidth: 860 }}>
      <h2 style={{ color: '#fff', fontFamily: 'Montserrat', fontSize: 20, margin: '0 0 12px' }}>Support</h2>
      <Chips value={status} onChange={setStatus} options={['open', 'answered', 'closed']} />
      {err ? <div style={{ color: '#ef4444', fontSize: 13, margin: '8px 0' }}>{err}</div> : null}
      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        {rows === null ? <Skeleton /> : rows.length === 0 ? <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>No tickets.</div> : rows.map(t => (
          <div key={t.id} style={{ ...cardCss, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <b style={{ color: '#fff', fontSize: 14 }}>#{t.id} · {t.subject}</b>
              <Pill text={t.status} color={COLORS[t.status]} />
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginInlineStart: 'auto' }}>{ago(t.created_at)}</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{t.name} · {t.email}</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{t.message}</div>
            {t.admin_reply ? <div style={{ background: 'rgba(212,175,55,0.08)', borderRadius: 8, padding: 10, color: '#fff', fontSize: 13, whiteSpace: 'pre-wrap' }}><b style={{ color: '#D4AF37' }}>Reply: </b>{t.admin_reply}</div> : null}
            {t.status !== 'closed' ? (
              <>
                <textarea value={reply[t.id] || ''} onChange={e => setReply(r => ({ ...r, [t.id]: e.target.value }))} rows={3} placeholder="Write a reply (the user is emailed)" style={{ ...inputCss, resize: 'vertical' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                  <button type="button" disabled={busy === t.id} onClick={() => send(t)} style={btn('gold', busy === t.id)}>{busy === t.id ? 'Sending…' : 'Send reply'}</button>
                  <button type="button" onClick={() => close(t)} style={btn('ghost')}>Close</button>
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
