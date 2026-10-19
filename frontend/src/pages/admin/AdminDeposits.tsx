import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDownCircle, AlertTriangle } from 'lucide-react'
import { useAdminDeposits } from '../../hooks/useData'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Sheet from '../../components/ui/Sheet'
import { Pill, Chips, KV, inputCss, btn, ago, labelCss, cardGrid, cardCss } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

const FILTERS = ['all', 'awaiting_payment', 'detected', 'confirming', 'confirmed', 'rejected', 'expired']
const OPEN = ['awaiting_payment', 'detected', 'confirming']

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function AdminDeposits() {
  const { profile } = useAuth()
  const canConfirm = ['finance', 'admin', 'super_admin'].includes(profile?.role || '')
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [sel, setSel] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [txid, setTxid] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const { data, isLoading, isError, refetch } = useAdminDeposits(filter === 'all' ? undefined : filter)

  function openSheet(d: any) {
    setSel(d); setAmount(d.amount ? String(d.amount) : ''); setTxid(d.txid || ''); setErr(null)
  }
  function refresh() {
    qc.invalidateQueries({ queryKey: ['admin-deposits'] })
    qc.invalidateQueries({ queryKey: ['admin-stats'] })
  }

  async function confirmDeposit() {
    setBusy(true); setErr(null)
    const { error } = await supabase.rpc('admin_confirm_deposit', {
      p_deposit_id: sel.id, p_amount: Number(amount), p_txid: txid.trim() || null,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    refresh(); setSel(null)
  }

  async function reject() {
    if (!window.confirm('Reject this deposit?')) return
    setBusy(true); setErr(null)
    const { error } = await supabase.from('deposits')
      .update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', sel.id)
    if (!error) await supabase.from('audit_logs').insert({ user_id: profile?.id, action: 'DEPOSIT_REJECTED', entity: 'deposits', entity_id: sel.id })
    setBusy(false)
    if (error) return setErr(error.message)
    refresh(); setSel(null)
  }

  const p = sel?.profiles as { full_name?: string; email?: string } | undefined

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>Deposits</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 14 }}>
        Tap a deposit to review it. Refreshes every 15 seconds.
      </p>

      <div style={{ display: 'flex', gap: 10, padding: '11px 14px', marginBottom: 14, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10 }}>
        <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 11, color: 'rgba(245,158,11,0.85)', fontFamily: 'Montserrat', lineHeight: 1.6 }}>
          Confirm only after you check the hash on the blockchain explorer: right address, network, asset and amount.
        </span>
      </div>

      <Chips options={FILTERS} value={filter} onChange={setFilter} />

      {isLoading ? (
        <div style={cardGrid}>{[1, 2, 3].map(i => <Skeleton key={i} height={88} borderRadius={14} />)}</div>
      ) : isError ? (
        <ErrorState english onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat', fontSize: 13 }}>
          <ArrowDownCircle size={30} color="rgba(212,175,55,0.2)" style={{ marginBottom: 10 }} /><div>No deposits here</div>
        </div>
      ) : (
        <div style={cardGrid}>
          {(data as any[]).map(d => (
            <button key={d.id} onClick={() => openSheet(d)} style={cardCss}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Cairo', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.profiles?.full_name || d.profiles?.email || 'Unknown'}
                </div>
                <Pill text={d.status} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Montserrat' }}>
                <span style={{ fontSize: 12, color: '#D4AF37', fontWeight: 700 }}>{d.asset} · {d.network}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{d.purpose} · {ago(d.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!sel} title="Deposit" onClose={() => setSel(null)}>
        {sel && (
          <>
            <KV k="User" v={p?.full_name || p?.email || 'Unknown'} />
            <KV k="Email" v={p?.email || '—'} />
            <KV k="Asset" v={`${sel.asset} (${sel.network})`} />
            <KV k="Credits to" v={sel.purpose} />
            <KV k="Minimum" v={String(sel.minimum_deposit)} />
            <KV k="Status" v={sel.status} />
            <KV k="Amount" v={sel.amount ? String(sel.amount) : 'Not confirmed'} />
            <KV k="Our address" v={sel.wallet_address} copy={sel.wallet_address} />
            <KV k="User's hash" v={sel.txid || 'Not submitted'} copy={sel.txid || undefined} />

            {OPEN.includes(sel.status) && canConfirm && (
              <>
                <label style={labelCss}>AMOUNT RECEIVED ({sel.asset})</label>
                <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} style={inputCss} placeholder="Exact amount on-chain" />
                <label style={labelCss}>TRANSACTION HASH</label>
                <input value={txid} onChange={e => setTxid(e.target.value)} style={inputCss} dir="ltr" placeholder="Hash from the explorer" />
              </>
            )}
            {err && <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 12, color: '#ef4444', fontFamily: 'Montserrat' }}>{err}</div>}
            {OPEN.includes(sel.status) && canConfirm && (
              <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                <button disabled={busy || !amount} onClick={confirmDeposit} style={btn('gold', busy || !amount)}>{busy ? 'Working…' : 'Confirm and credit balance'}</button>
                <button disabled={busy} onClick={reject} style={btn('red', busy)}>Reject deposit</button>
              </div>
            )}
            {OPEN.includes(sel.status) && !canConfirm && (
              <div style={{ marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>Your role cannot confirm deposits.</div>
            )}
          </>
        )}
      </Sheet>
    </div>
  )
}
