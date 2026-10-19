import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowUpCircle, Shield } from 'lucide-react'
import { useAdminWithdrawals } from '../../hooks/useData'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Sheet from '../../components/ui/Sheet'
import { Pill, Chips, KV, inputCss, btn, ago, labelCss, cardGrid, cardCss } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

const FILTERS = ['all', 'pending', 'approved', 'processing', 'completed', 'rejected']

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function AdminWithdrawals() {
  const { profile } = useAuth()
  const canReview = ['finance', 'admin', 'super_admin'].includes(profile?.role || '')
  const qc = useQueryClient()
  const [filter, setFilter] = useState('pending')
  const [sel, setSel] = useState<any>(null)
  const [note, setNote] = useState('')
  const [txid, setTxid] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const { data, isLoading, isError, refetch } = useAdminWithdrawals(filter === 'all' ? undefined : filter)

  function openSheet(w: any) { setSel(w); setNote(w.admin_note || ''); setTxid(w.txid || ''); setErr(null) }

  async function act(action: 'approve' | 'processing' | 'complete' | 'reject') {
    if (action === 'reject' && !window.confirm('Reject this withdrawal?')) return
    setBusy(true); setErr(null)
    const { error } = await supabase.rpc('admin_review_withdrawal', {
      p_id: sel.id, p_action: action, p_note: note.trim() || null, p_txid: txid.trim() || null,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    qc.invalidateQueries({ queryKey: ['admin-withdrawals'] })
    qc.invalidateQueries({ queryKey: ['admin-stats'] })
    setSel(null)
  }

  const p = sel?.profiles as { full_name?: string; email?: string } | undefined
  const live = sel && ['pending', 'approved', 'processing'].includes(sel.status)

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>Withdrawals</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 14 }}>
        Review, send, then record the transaction hash.
      </p>

      <div style={{ display: 'flex', gap: 10, padding: '11px 14px', marginBottom: 14, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10 }}>
        <Shield size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 11, color: 'rgba(239,68,68,0.85)', fontFamily: 'Montserrat', lineHeight: 1.6 }}>
          Approve checks the user's ledger balance. Complete debits the ledger, so only use it after the funds were actually sent.
        </span>
      </div>

      <Chips options={FILTERS} value={filter} onChange={setFilter} />

      {isLoading ? (
        <div style={cardGrid}>{[1, 2, 3].map(i => <Skeleton key={i} height={88} borderRadius={14} />)}</div>
      ) : isError ? (
        <ErrorState english onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat', fontSize: 13 }}>
          <ArrowUpCircle size={30} color="rgba(212,175,55,0.2)" style={{ marginBottom: 10 }} /><div>No withdrawals here</div>
        </div>
      ) : (
        <div style={cardGrid}>
          {(data as any[]).map(w => (
            <button key={w.id} onClick={() => openSheet(w)} style={cardCss}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Cairo', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {w.profiles?.full_name || w.profiles?.email || 'Unknown'}
                </div>
                <Pill text={w.status} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Montserrat' }}>
                <span style={{ fontSize: 13, color: '#D4AF37', fontWeight: 700 }}>{Number(w.amount)} {w.asset}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{w.network} · {ago(w.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!sel} title="Withdrawal" onClose={() => setSel(null)}>
        {sel && (
          <>
            <KV k="User" v={p?.full_name || p?.email || 'Unknown'} />
            <KV k="Email" v={p?.email || '—'} />
            <KV k="From" v={sel.withdrawal_type === 'trading' ? 'Trading balance' : 'Investment redemption'} />
            <KV k="Amount" v={`${Number(sel.amount)} ${sel.asset}`} />
            <KV k="Fee" v={`${Number(sel.fees)} ${sel.asset}`} />
            <KV k="Send to user" v={`${Number(sel.net_amount)} ${sel.asset}`} />
            <KV k="Network" v={sel.network} />
            <KV k="Destination" v={sel.destination_address} copy={sel.destination_address} />
            <KV k="Status" v={sel.status} />
            {sel.txid && <KV k="Hash" v={sel.txid} copy={sel.txid} />}
            {sel.admin_note && !live && <KV k="Note" v={sel.admin_note} />}

            {live && canReview && (
              <>
                {['approved', 'processing'].includes(sel.status) && (
                  <>
                    <label style={labelCss}>TRANSACTION HASH (needed to complete)</label>
                    <input value={txid} onChange={e => setTxid(e.target.value)} style={inputCss} dir="ltr" placeholder="Hash of the payout" />
                  </>
                )}
                <label style={labelCss}>NOTE (required to reject)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} style={{ ...inputCss, resize: 'vertical' }} placeholder="Shown to the user if rejected" />
              </>
            )}
            {err && <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 12, color: '#ef4444', fontFamily: 'Montserrat' }}>{err}</div>}

            {live && canReview && (
              <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                {sel.status === 'pending' && <button disabled={busy} onClick={() => act('approve')} style={btn('gold', busy)}>Approve</button>}
                {sel.status === 'approved' && <button disabled={busy} onClick={() => act('processing')} style={btn('ghost', busy)}>Mark as processing</button>}
                {['approved', 'processing'].includes(sel.status) && (
                  <button disabled={busy || !txid.trim()} onClick={() => act('complete')} style={btn('green', busy || !txid.trim())}>Complete: funds sent</button>
                )}
                <button disabled={busy} onClick={() => act('reject')} style={btn('red', busy)}>Reject</button>
              </div>
            )}
            {live && !canReview && <div style={{ marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>Your role cannot review withdrawals.</div>}
          </>
        )}
      </Sheet>
    </div>
  )
}
