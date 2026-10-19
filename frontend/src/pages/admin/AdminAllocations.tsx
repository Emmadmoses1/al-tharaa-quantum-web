import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Briefcase, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Sheet from '../../components/ui/Sheet'
import { Pill, KV, inputCss, btn, labelCss, cardGrid } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

/* eslint-disable @typescript-eslint/no-explicit-any */
const COLOR: Record<string, string> = { pending: '#9ca3af', active: '#10b981', matured: '#D4AF37', completed: '#818cf8', cancelled: '#ef4444' }
const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 3 })

export default function AdminAllocations() {
  const { profile } = useAuth()
  const canSettle = ['finance', 'admin', 'super_admin'].includes(profile?.role || '')
  const qc = useQueryClient()
  const [sel, setSel] = useState<any>(null)
  const [pct, setPct] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-allocations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_allocations')
        .select('*, profiles(full_name,email), investment_opportunities(id,name,name_ar,currency,status)')
        .order('created_at', { ascending: false }).limit(500)
      if (error) throw error
      return (data || []) as any[]
    },
  })

  const groups = new Map<string, any>()
  for (const a of data || []) {
    if (a.status !== 'active' && a.status !== 'matured') continue
    const o = a.investment_opportunities
    if (!o) continue
    const g = groups.get(o.id) || { id: o.id, name: o.name_ar || o.name, status: o.status, count: 0, total: 0 }
    g.count++; g.total += Number(a.amount_invested)
    groups.set(o.id, g)
  }
  const open = [...groups.values()]
  const p = Number(pct)
  const valid = pct.trim() !== '' && Number.isFinite(p) && p >= -100 && p <= 1000

  async function settle() {
    if (!window.confirm(`Pay out ${sel.name} at ${p}% to ${sel.count} investor(s)? This cannot be undone.`)) return
    setBusy(true); setErr(null)
    const { error } = await supabase.rpc('admin_settle_opportunity', {
      p_opportunity_id: sel.id, p_return_percent: p, p_note: note.trim() || null,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    qc.invalidateQueries({ queryKey: ['admin-allocations'] })
    qc.invalidateQueries({ queryKey: ['admin-opportunities'] })
    setSel(null)
  }

  const total = (data || []).reduce((s, a) => s + Number(a.amount_invested || 0), 0)
  const activeN = (data || []).filter(a => a.status === 'active').length

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>Investments</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 14 }}>
        Investor allocations. Settle an opportunity when it ends to pay investors back into their balance.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
        {[['Total', String((data || []).length)], ['Active', String(activeN)], ['Invested', `${fmt(total)}`]].map(([l, v]) => (
          <div key={l} style={{ background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 12, padding: '12px 10px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#D4AF37', fontFamily: 'Montserrat', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>{l}</div>
          </div>
        ))}
      </div>

      {open.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', letterSpacing: 1, marginBottom: 8 }}>READY TO SETTLE</div>
          <div style={{ ...cardGrid, marginBottom: 22 }}>
            {open.map(g => (
              <button key={g.id} onClick={() => { setSel(g); setPct(''); setNote(''); setErr(null) }} style={{
                background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, padding: 14, textAlign: 'left', cursor: 'pointer', width: '100%',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Cairo' }}>{g.name}</div>
                  <Pill text={g.status} />
                </div>
                <div style={{ fontSize: 12, color: '#D4AF37', fontWeight: 700, fontFamily: 'Montserrat' }}>
                  {g.count} investor{g.count > 1 ? 's' : ''} · {fmt(g.total)} USDT
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', letterSpacing: 1, marginBottom: 8 }}>ALL ALLOCATIONS</div>
      {isLoading ? (
        <div style={cardGrid}>{[1, 2, 3].map(i => <Skeleton key={i} height={80} borderRadius={14} />)}</div>
      ) : isError ? (
        <ErrorState english onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat', fontSize: 13 }}>
          <Briefcase size={30} color="rgba(212,175,55,0.2)" style={{ marginBottom: 10 }} /><div>No investments yet</div>
        </div>
      ) : (
        <div style={cardGrid}>
          {data.map(a => {
            const inv = Number(a.amount_invested), cur = Number(a.current_value ?? inv), gain = cur - inv
            return (
              <div key={a.id} style={{ background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 14, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Cairo', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.profiles?.full_name || a.profiles?.email || 'Unknown'}</div>
                  <Pill text={a.status} color={COLOR[a.status]} />
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.investment_opportunities?.name_ar || a.investment_opportunities?.name || '—'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Montserrat', fontSize: 12 }}>
                  <span style={{ color: '#D4AF37', fontWeight: 700 }}>{fmt(inv)} {a.currency}</span>
                  <span style={{ color: gain === 0 ? 'rgba(255,255,255,0.4)' : gain > 0 ? '#10b981' : '#ef4444' }}>
                    now {fmt(cur)}{gain !== 0 && ` (${gain > 0 ? '+' : ''}${fmt(gain)})`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Sheet open={!!sel} title="Settle opportunity" onClose={() => setSel(null)}>
        {sel && (
          <>
            <KV k="Opportunity" v={sel.name} />
            <KV k="Investors" v={String(sel.count)} />
            <KV k="Invested" v={`${fmt(sel.total)} USDT`} />

            <div style={{ display: 'flex', gap: 10, padding: '11px 12px', margin: '14px 0 0', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 10 }}>
              <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 11, color: 'rgba(245,158,11,0.9)', fontFamily: 'Montserrat', lineHeight: 1.6 }}>
                Enter the REAL final result of this investment. Investors are credited immediately and can then withdraw. Only settle when the funds to pay them exist.
              </span>
            </div>

            {canSettle ? (
              <>
                <label style={labelCss}>FINAL RETURN % (negative for a loss)</label>
                <input type="number" inputMode="decimal" value={pct} onChange={e => setPct(e.target.value)} style={inputCss} placeholder="e.g. 8.5 or -12" />
                {valid && <KV k="Total payout" v={`${fmt(sel.total * (1 + p / 100))} USDT`} />}
                <label style={labelCss}>NOTE (optional)</label>
                <input value={note} onChange={e => setNote(e.target.value)} style={inputCss} placeholder="Shown in the audit log" />
                {err && <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 12, color: '#ef4444', fontFamily: 'Montserrat' }}>{err}</div>}
                <div style={{ marginTop: 16 }}>
                  <button disabled={!valid || busy} onClick={settle} style={btn('gold', !valid || busy)}>{busy ? 'Working…' : 'Settle and pay investors'}</button>
                </div>
              </>
            ) : <div style={{ marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>Your role cannot settle investments.</div>}
          </>
        )}
      </Sheet>
    </div>
  )
}
