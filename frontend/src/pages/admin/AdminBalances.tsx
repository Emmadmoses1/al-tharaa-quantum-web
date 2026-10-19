import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import Sheet from '../../components/ui/Sheet'
import { KV, inputCss, btn, labelCss, cardGrid, cardCss } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

type Bal = { ledger_type: 'investment' | 'trading'; asset: string; balance: number }
type U = { id: string; email: string | null; full_name: string | null; balances: Bal[] }
type Tot = { ledger_type: string; asset: string; total: number; users: number }
type Resp = { users: U[]; totals: Tot[] }

const n = (v: number) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 8 })
const ASSETS = ['USDT', 'USDC', 'BTC', 'ETH']

export default function AdminBalances() {
  const { profile } = useAuth()
  const canAdjust = ['finance', 'admin', 'super_admin'].includes(profile?.role || '')
  const qc = useQueryClient()
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState<U | null>(null)
  const [ledger, setLedger] = useState<'trading' | 'investment'>('trading')
  const [asset, setAsset] = useState('USDT')
  const [dir, setDir] = useState<'credit' | 'debit'>('credit')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const q = useQuery({
    queryKey: ['admin-balances', search], staleTime: 0, refetchInterval: 30000,
    queryFn: () => api.get<Resp>(`/api/admin/balances?search=${encodeURIComponent(search)}`),
  })

  const current = sel?.balances.find(b => b.ledger_type === ledger && b.asset === asset)?.balance ?? 0
  const amt = Number(amount)
  const valid = amt > 0 && reason.trim().length >= 5 && (dir === 'credit' || amt <= current)

  function open(u: U) { setSel(u); setAmount(''); setReason(''); setErr(null); setDir('credit') }

  async function submit() {
    if (!sel) return
    const label = `${dir === 'credit' ? 'ADD' : 'REMOVE'} ${amt} ${asset} ${dir === 'credit' ? 'to' : 'from'} ${sel.email || sel.full_name}?`
    if (!window.confirm(label)) return
    setBusy(true); setErr(null)
    try {
      await api.post('/api/admin/balances/adjust', {
        user_id: sel.id, ledger_type: ledger, asset, amount: dir === 'credit' ? amt : -amt, reason: reason.trim(),
      })
      await qc.invalidateQueries({ queryKey: ['admin-balances'] })
      setSel(null)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setBusy(false)
  }

  const live = q.data?.users.find(u => u.id === sel?.id) || sel

  return (
    <div translate="no" className="notranslate">
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>User Balances</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 14, lineHeight: 1.7 }}>
        What the platform owes users, per wallet. Compare the totals with what your deposit wallets actually hold.
      </p>

      {q.data && q.data.totals.length > 0 && (
        <div style={{ ...cardCss, cursor: 'default', marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', letterSpacing: 1, marginBottom: 6 }}>TOTAL USER BALANCES</div>
          {q.data.totals.map(t => <KV key={t.ledger_type + t.asset} k={`${t.ledger_type} · ${t.asset} (${t.users} users)`} v={n(t.total)} />)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') setSearch(input.trim()) }}
          placeholder="Search name or email" style={{ ...inputCss, flex: 1 }} />
        <button onClick={() => setSearch(input.trim())} style={{ ...btn('gold'), width: 90 }}>Search</button>
      </div>

      {q.isLoading ? <div style={cardGrid}>{[1, 2, 3].map(i => <Skeleton key={i} height={80} borderRadius={14} />)}</div>
        : q.isError || !q.data ? <ErrorState english onRetry={q.refetch} />
        : q.data.users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat', fontSize: 13 }}>
            <Users size={28} color="rgba(212,175,55,0.2)" style={{ marginBottom: 8 }} /><div>No users found</div>
          </div>
        ) : (
          <div style={cardGrid}>
            {q.data.users.map(u => (
              <button key={u.id} onClick={() => open(u)} style={cardCss}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Cairo', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || u.email || 'Unknown'}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                {u.balances.filter(b => b.balance > 0).length === 0
                  ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat' }}>No balance</div>
                  : u.balances.filter(b => b.balance > 0).map(b => (
                    <div key={b.ledger_type + b.asset} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Montserrat', fontSize: 12 }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>{b.ledger_type}</span>
                      <span style={{ color: '#D4AF37', fontWeight: 700 }}>{n(b.balance)} {b.asset}</span>
                    </div>
                  ))}
              </button>
            ))}
          </div>
        )}

      <Sheet open={!!sel} title="User balance" onClose={() => setSel(null)}>
        {live && (
          <>
            <KV k="User" v={live.full_name || '—'} />
            <KV k="Email" v={live.email || '—'} />
            {live.balances.length === 0 ? <KV k="Balances" v="None yet" /> : live.balances.map(b => <KV key={b.ledger_type + b.asset} k={`${b.ledger_type} · ${b.asset}`} v={n(b.balance)} />)}

            {canAdjust ? (
              <>
                <label style={labelCss}>ADJUST BALANCE</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <button onClick={() => setDir('credit')} style={btn(dir === 'credit' ? 'green' : 'ghost')}>Add (+)</button>
                  <button onClick={() => setDir('debit')} style={btn(dir === 'debit' ? 'red' : 'ghost')}>Remove (−)</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <select value={ledger} onChange={e => setLedger(e.target.value as 'trading' | 'investment')} style={inputCss}>
                    <option value="trading">trading</option><option value="investment">investment</option>
                  </select>
                  <select value={asset} onChange={e => setAsset(e.target.value)} style={inputCss}>
                    {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', margin: '8px 0 0' }}>Current: {n(current)} {asset}</div>
                <input type="text" inputMode="decimal" dir="ltr" value={amount} placeholder="Amount"
                  onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))} style={{ ...inputCss, marginTop: 8 }} />
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (required, saved in audit log)" style={{ ...inputCss, marginTop: 8 }} />
                {err && <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 12, color: '#ef4444', fontFamily: 'Montserrat' }}>{err}</div>}
                <button disabled={!valid || busy} onClick={submit} style={{ ...btn('gold', !valid || busy), marginTop: 14 }}>{busy ? 'Working…' : 'Apply adjustment'}</button>
              </>
            ) : <div style={{ marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>Your role cannot adjust balances.</div>}
          </>
        )}
      </Sheet>
    </div>
  )
}
