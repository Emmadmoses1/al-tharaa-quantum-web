import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LifeBuoy } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Sheet from '../../components/ui/Sheet'
import { Pill, Chips, KV, inputCss, btn, ago, labelCss, cardGrid, cardCss } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

/* eslint-disable @typescript-eslint/no-explicit-any */
const COLOR: Record<string, string> = { open: '#f59e0b', in_progress: '#6366f1', resolved: '#10b981', closed: '#6b7280' }

export default function AdminSupport() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('open')
  const [sel, setSel] = useState<any>(null)
  const [reply, setReply] = useState('')
  const [status, setStatus] = useState('in_progress')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-tickets', filter],
    refetchInterval: 30000,
    queryFn: async () => {
      let q = supabase.from('support_tickets').select('*, profiles(full_name,email)').order('created_at', { ascending: false }).limit(100)
      if (filter !== 'all') q = q.eq('status', filter)
      const { data, error } = await q
      if (error) throw error
      return (data || []) as any[]
    },
  })

  function openSheet(t: any) { setSel(t); setReply(''); setStatus(t.status === 'open' ? 'in_progress' : t.status); setErr(null) }

  async function send() {
    setBusy(true); setErr(null)
    const { error } = await supabase.rpc('admin_reply_ticket', { p_id: sel.id, p_response: reply.trim() || null, p_status: status })
    setBusy(false)
    if (error) return setErr(error.message)
    qc.invalidateQueries({ queryKey: ['admin-tickets'] })
    setSel(null)
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>Support</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 14 }}>
        Tickets from users. Replies reach them as a notification.
      </p>
      <Chips options={['open', 'in_progress', 'resolved', 'closed', 'all']} value={filter} onChange={setFilter} />

      {isLoading ? (
        <div style={cardGrid}>{[1, 2, 3].map(i => <Skeleton key={i} height={88} borderRadius={14} />)}</div>
      ) : isError ? (
        <ErrorState english onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat', fontSize: 13 }}>
          <LifeBuoy size={30} color="rgba(212,175,55,0.2)" style={{ marginBottom: 10 }} /><div>No tickets here</div>
        </div>
      ) : (
        <div style={cardGrid}>
          {data.map(t => (
            <button key={t.id} onClick={() => openSheet(t)} style={cardCss}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Cairo', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                <Pill text={t.status} color={COLOR[t.status]} />
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'Montserrat' }}>
                {t.profiles?.full_name || t.profiles?.email || 'Unknown'} · {ago(t.created_at)}
              </div>
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!sel} title="Ticket" onClose={() => setSel(null)}>
        {sel && (
          <>
            <KV k="User" v={sel.profiles?.full_name || sel.profiles?.email || 'Unknown'} />
            <KV k="Email" v={sel.profiles?.email || '—'} />
            <KV k="Subject" v={sel.subject} />
            <div style={{ margin: '12px 0', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, fontSize: 13, color: '#fff', fontFamily: 'Cairo', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{sel.message}</div>
            {sel.admin_response && <KV k="Last reply" v={sel.admin_response} />}
            <label style={labelCss}>REPLY</label>
            <textarea value={reply} onChange={e => setReply(e.target.value)} rows={4} style={{ ...inputCss, resize: 'vertical' }} placeholder="Write your reply to the user" />
            <label style={labelCss}>SET STATUS</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={inputCss}>
              {['open', 'in_progress', 'resolved', 'closed'].map(s => <option key={s} value={s} style={{ background: '#141414' }}>{s.replace('_', ' ')}</option>)}
            </select>
            {err && <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 12, color: '#ef4444', fontFamily: 'Montserrat' }}>{err}</div>}
            <div style={{ marginTop: 16 }}>
              <button disabled={busy} onClick={send} style={btn('gold', busy)}>{busy ? 'Working…' : reply.trim() ? 'Send reply' : 'Update status'}</button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  )
}
