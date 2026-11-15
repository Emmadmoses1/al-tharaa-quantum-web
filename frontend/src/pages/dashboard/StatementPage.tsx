import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { LogoMark } from '../../components/Logo'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useSite } from '../../lib/useSite'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

type Row = { id: string; ledger_type: string; entry_type: string; asset: string; amount: number; balance_before: number; balance_after: number; description: string | null; created_at: string }

const LEDGER: Record<string, string> = { investment: 'محفظة الاستثمار', trading: 'محفظة التداول' }
const ENTRY: Record<string, string> = { credit: 'إيداع / إضافة', debit: 'سحب / خصم', fee: 'رسوم', adjustment: 'تعديل' }

function months() {
  const out: { key: string; label: string; from: Date; to: Date }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    out.push({ key: `${from.getFullYear()}-${from.getMonth()}`, label: from.toLocaleDateString('ar', { month: 'long', year: 'numeric' }), from, to })
  }
  return out
}

// Monthly account statement built only from the user's real ledger entries. Printable.
export default function StatementPage() {
  const { user } = useAuth()
  const { data: site } = useSite()
  const list = useMemo(months, [])
  const [mk, setMk] = useState(list[0].key)
  const m = list.find(x => x.key === mk) || list[0]
  const co = site?.invoice

  const prof = useQuery({
    queryKey: ['billing-name', user?.id], enabled: !!user?.id, staleTime: 60000,
    queryFn: async () => (await supabase.from('profiles').select('full_name').eq('id', user!.id).maybeSingle()).data?.full_name as string | null,
  })
  const q = useQuery({
    queryKey: ['statement', user?.id, mk], enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('ledger_entries')
        .select('id, ledger_type, entry_type, asset, amount, balance_before, balance_after, description, created_at')
        .eq('user_id', user!.id).gte('created_at', m.from.toISOString()).lt('created_at', m.to.toISOString())
        .order('created_at', { ascending: true }).order('id', { ascending: true }).limit(1000)
      if (error) throw error
      return (data || []) as Row[]
    },
  })

  const groups = useMemo(() => {
    const g = new Map<string, { ledger: string; asset: string; open: number; close: number; credit: number; debit: number }>()
    for (const r of q.data || []) {
      const k = `${r.ledger_type}:${r.asset}`
      const cur = g.get(k) || { ledger: r.ledger_type, asset: r.asset, open: Number(r.balance_before), close: 0, credit: 0, debit: 0 }
      cur.close = Number(r.balance_after)
      if (r.entry_type === 'credit') cur.credit += Math.abs(Number(r.amount))
      else if (r.entry_type === 'debit' || r.entry_type === 'fee') cur.debit += Math.abs(Number(r.amount))
      g.set(k, cur)
    }
    return Array.from(g.values())
  }, [q.data])

  const th = { textAlign: 'right', padding: '6px 4px', borderBottom: '1px solid #ddd', fontSize: 11, color: '#666' } as const
  const td = { padding: '6px 4px', borderBottom: '1px solid #f0f0f0', fontSize: 12 } as const

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <style>{`@media print { body * { visibility: hidden } .stmt-print, .stmt-print * { visibility: visible } .stmt-print { position: absolute; left: 0; top: 0; width: 100% } .no-print { display: none !important } }`}</style>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={mk} onChange={e => setMk(e.target.value)} style={{ background: 'rgba(11,11,11,0.6)', color: '#fff', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8, padding: '9px 12px', fontFamily: 'Cairo', fontSize: 13 }}>
          {list.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
        </select>
        <button type="button" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'Cairo', cursor: 'pointer' }}>
          <Printer size={14} /> طباعة / PDF
        </button>
      </div>
      {q.isLoading ? <Skeleton height={300} borderRadius={14} /> : q.isError ? <ErrorState onRetry={q.refetch} /> : (
        <div className="stmt-print" style={{ background: '#fff', color: '#1a1a1a', borderRadius: 14, padding: 28, direction: 'rtl', fontFamily: 'Cairo' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <LogoMark size={40} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#9a7b12' }}>{co?.company_name || 'AL THARAA QUANTUM'}</div>
              <div style={{ fontSize: 11, color: '#777' }}>{co?.address || ''}</div>
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>كشف حساب · Account statement</div>
          <div style={{ fontSize: 12, color: '#555', margin: '4px 0 16px' }}>{prof.data || user?.email} — {m.label}</div>

          {groups.length === 0 ? <div style={{ padding: '24px 0', textAlign: 'center', color: '#777', fontSize: 13 }}>لا توجد حركات في هذا الشهر.</div> : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                <thead><tr><th style={th}>المحفظة</th><th style={th}>العملة</th><th style={th}>رصيد البداية</th><th style={th}>إضافات</th><th style={th}>خصومات</th><th style={th}>رصيد النهاية</th></tr></thead>
                <tbody>{groups.map(g => (
                  <tr key={`${g.ledger}${g.asset}`}>
                    <td style={td}>{LEDGER[g.ledger] || g.ledger}</td><td style={td}>{g.asset}</td>
                    <td style={td}>{g.open.toFixed(4)}</td><td style={{ ...td, color: '#0a8a5c' }}>+{g.credit.toFixed(4)}</td>
                    <td style={{ ...td, color: '#c0392b' }}>-{g.debit.toFixed(4)}</td><td style={{ ...td, fontWeight: 700 }}>{g.close.toFixed(4)}</td>
                  </tr>
                ))}</tbody>
              </table>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>الحركات</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>التاريخ</th><th style={th}>النوع</th><th style={th}>الوصف</th><th style={th}>المبلغ</th><th style={th}>الرصيد</th></tr></thead>
                <tbody>{(q.data || []).map(r => (
                  <tr key={r.id}>
                    <td style={td}>{new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                    <td style={td}>{ENTRY[r.entry_type] || r.entry_type} · {r.asset}</td>
                    <td style={{ ...td, color: '#666' }}>{r.description || '—'}</td>
                    <td style={td}>{r.entry_type === 'credit' ? '+' : r.entry_type === 'debit' || r.entry_type === 'fee' ? '-' : ''}{Math.abs(Number(r.amount)).toFixed(4)}</td>
                    <td style={td}>{Number(r.balance_after).toFixed(4)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </>
          )}
          <p style={{ fontSize: 10, color: '#999', marginTop: 18, lineHeight: 1.8 }}>هذا الكشف مستخرج من سجل حركات حسابك الفعلي. {co?.footer || ''}</p>
        </div>
      )}
    </div>
  )
}
