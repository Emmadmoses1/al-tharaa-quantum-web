import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Target, Trash2, CheckCircle2 } from 'lucide-react'
import { api } from '../../lib/api'
import { useWalletBalances } from '../../hooks/useWallet'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

type Goal = { id: string; name: string; target_usd: number; deadline: string | null; created_at: string }

const card = { background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 14, padding: 18 } as const
const inp = { width: '100%', background: 'rgba(11,11,11,0.5)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' } as const

// Personal savings goals. Progress = your real USDT/USDC balance across wallets. Goals never move money.
export default function GoalsPage() {
  const qc = useQueryClient()
  const bal = useWalletBalances()
  const q = useQuery({ queryKey: ['goals'], queryFn: () => api.get<Goal[]>('/api/goals') })
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const total = (bal.data || []).filter(b => b.asset === 'USDT' || b.asset === 'USDC').reduce((s, b) => s + b.balance, 0)

  async function add() {
    setBusy(true); setErr('')
    try {
      await api.post('/api/goals', { name, target_usd: Number(target), deadline: deadline || null })
      setName(''); setTarget(''); setDeadline('')
      await qc.invalidateQueries({ queryKey: ['goals'] })
    } catch (e) { setErr(e instanceof Error ? e.message : 'تعذّر الحفظ') }
    setBusy(false)
  }
  async function del(id: string) {
    if (!window.confirm('حذف هذا الهدف؟')) return
    try { await api.post(`/api/goals/${id}/delete`, {}); await qc.invalidateQueries({ queryKey: ['goals'] }) } catch { /* shown on retry */ }
  }

  if (q.isLoading) return <Skeleton height={260} borderRadius={14} />
  if (q.isError) return <ErrorState onRetry={q.refetch} />
  const goals = q.data || []

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'grid', gap: 14 }}>
      <div>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'Cairo', margin: 0 }}><Target size={20} color="#D4AF37" /> أهدافي</h1>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', lineHeight: 1.9, margin: '6px 0 0' }}>
          حدّد مبلغاً تريد الوصول إليه. يُقاس التقدم برصيدك الفعلي الحالي من USDT وUSDC في محافظك (${total.toFixed(2)}). الأهداف للمتابعة فقط ولا تنقل أي أموال.
        </p>
      </div>

      <div style={{ ...card, display: 'grid', gap: 10 }}>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="اسم الهدف (مثال: سفر، سيارة)" style={inp} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input type="number" min="1" value={target} onChange={e => setTarget(e.target.value)} placeholder="المبلغ المستهدف بالدولار" style={{ ...inp, flex: 1, minWidth: 150 }} />
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ ...inp, flex: 1, minWidth: 150 }} />
        </div>
        <button type="button" onClick={add} disabled={busy || name.trim().length < 2 || !(Number(target) > 0)} className="btn-gold" style={{ padding: '11px 0', fontFamily: 'Cairo', fontWeight: 700, opacity: busy || name.trim().length < 2 || !(Number(target) > 0) ? 0.5 : 1 }}>{busy ? '…' : 'إضافة هدف'}</button>
        {err && <div style={{ fontSize: 12, color: '#ef4444', fontFamily: 'Cairo' }}>{err}</div>}
      </div>

      {goals.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', fontSize: 13 }}>لا توجد أهداف بعد. أضف هدفك الأول أعلاه.</div>
      ) : goals.map(g => {
        const target = Number(g.target_usd)
        const pct = Math.min(100, Math.max(0, (total / target) * 100))
        const done = total >= target
        const days = g.deadline ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000) : null
        return (
          <div key={g.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ color: '#fff', fontFamily: 'Cairo', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                {done && <CheckCircle2 size={16} color="#10b981" />}{g.name}
              </div>
              <button type="button" onClick={() => del(g.id)} aria-label="حذف" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)' }}><Trash2 size={16} /></button>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', margin: '12px 0 8px', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: done ? '#10b981' : '#D4AF37', transition: 'width .4s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Montserrat', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              <span>${total.toFixed(2)} / ${target.toLocaleString()}</span>
              <span style={{ color: done ? '#10b981' : '#D4AF37', fontWeight: 700 }}>{pct.toFixed(0)}%</span>
            </div>
            {days !== null && !done && (
              <div style={{ fontSize: 11, color: days < 0 ? '#ef4444' : 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', marginTop: 6 }}>
                {days < 0 ? 'انتهى الموعد' : `متبقي ${days} يوم`} · المتبقي ${Math.max(0, target - total).toFixed(2)}
              </div>
            )}
            {done && <div style={{ fontSize: 12, color: '#10b981', fontFamily: 'Cairo', marginTop: 6 }}>تهانينا، وصلت إلى هدفك.</div>}
          </div>
        )
      })}
    </div>
  )
}
