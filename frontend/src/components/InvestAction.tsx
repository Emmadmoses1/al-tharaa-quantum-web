import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { InvestmentOpportunity } from '../hooks/useData'

const OK_CURRENCIES = ['USDT', 'USD']

export default function InvestAction({ opp, amount, onDone }: {
  opp: InvestmentOpportunity
  amount: number
  onDone: () => void
}) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const { data: balance, isLoading } = useQuery({
    queryKey: ['inv-usdt-balance', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ledger_entries').select('balance_after')
        .eq('user_id', user!.id).eq('ledger_type', 'investment').eq('asset', 'USDT')
        .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1)
      if (error) throw error
      return data && data.length ? Number(data[0].balance_after) : 0
    },
  })

  const min = Number(opp.minimum_investment)
  const left = Math.max(Number(opp.target_amount) - Number(opp.amount_raised), 0)
  const bal = balance ?? 0

  async function invest() {
    setBusy(true); setErr(null)
    const { error } = await supabase.rpc('invest_in_opportunity', {
      p_opportunity_id: opp.id, p_amount: amount,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    qc.invalidateQueries()
    setDone(true)
  }

  const box = (color: string): CSSProperties => ({
    padding: '12px 14px', borderRadius: 10, fontSize: 12, fontFamily: 'Cairo', lineHeight: 1.8,
    background: `${color}14`, border: `1px solid ${color}40`, color, marginBottom: 12,
  })

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <CheckCircle2 size={44} color="#10b981" style={{ marginBottom: 10 }} />
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: 'Cairo', marginBottom: 6 }}>تم تنفيذ الاستثمار</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', marginBottom: 16 }}>
          خُصم المبلغ من رصيدك الاستثماري وأُضيف إلى محفظتك.
        </div>
        <button className="btn-gold" onClick={onDone} style={{ width: '100%', minHeight: 48, fontSize: 15 }}>عرض محفظتي</button>
      </div>
    )
  }

  if (!OK_CURRENCIES.includes(opp.currency)) {
    return <div style={box('#f59e0b')}>هذه الفرصة مسعّرة بعملة ({opp.currency}). التمويل متاح حالياً للفرص المسعّرة بـ USDT فقط.</div>
  }

  if (amount < min) {
    return (
      <button className="btn-gold" disabled style={{ width: '100%', minHeight: 48, fontSize: 14, opacity: 0.4, cursor: 'not-allowed' }}>
        {`الحد الأدنى ${opp.currency} ${min.toLocaleString()}`}
      </button>
    )
  }

  if (amount > left) {
    return <div style={box('#ef4444')}>المتبقي للتمويل {left.toLocaleString()} {opp.currency} فقط. قلّل المبلغ.</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 14px', borderRadius: 10, marginBottom: 12, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo' }}>
          <Wallet size={15} color="#D4AF37" /> رصيدك الاستثماري
        </span>
        <span dir="ltr" style={{ fontSize: 14, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat' }}>
          {isLoading ? '…' : `${bal.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDT`}
        </span>
      </div>

      {!isLoading && bal < amount ? (
        <>
          <div style={box('#f59e0b')}>
            رصيدك الاستثماري لا يكفي. تحتاج {amount.toLocaleString()} USDT. أودع في «الاستثمار» بعملة USDT ثم عُد إلى هنا بعد تأكيد الإيداع.
          </div>
          <Link to="/dashboard/deposit" className="btn-gold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, textDecoration: 'none', fontSize: 15 }}>
            إيداع للاستثمار
          </Link>
        </>
      ) : (
        <>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: 'Cairo', lineHeight: 1.8, marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ width: 20, height: 20, marginTop: 2, accentColor: '#D4AF37', flexShrink: 0 }} />
            أفهم أن الاستثمار ينطوي على مخاطر فقدان رأس المال، وأن العوائد المتوقعة غير مضمونة.
          </label>
          {err && <div style={box('#ef4444')}>{err}</div>}
          <button className="btn-gold" disabled={!agree || busy || isLoading} onClick={invest}
            style={{ width: '100%', minHeight: 48, fontSize: 15, opacity: !agree || busy ? 0.5 : 1, cursor: !agree || busy ? 'not-allowed' : 'pointer' }}>
            {busy ? 'جارٍ التنفيذ…' : 'تأكيد الاستثمار'}
          </button>
        </>
      )}
    </div>
  )
}
