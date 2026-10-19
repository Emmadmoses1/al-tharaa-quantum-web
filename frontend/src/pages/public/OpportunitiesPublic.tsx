import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Clock, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PublicShell, { Notice } from '../../components/layout/PublicShell'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

/* eslint-disable @typescript-eslint/no-explicit-any */
const RISK: Record<string, [string, string]> = { low: ['منخفضة', '#10b981'], medium: ['متوسطة', '#f59e0b'], high: ['مرتفعة', '#ef4444'], very_high: ['مرتفعة جداً', '#dc2626'] }

export default function OpportunitiesPublic() {
  const { user } = useAuth()
  const q = useQuery({
    queryKey: ['public-opps'],
    queryFn: async () => {
      const { data, error } = await supabase.from('investment_opportunities').select('*')
        .in('status', ['open', 'funding']).order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as any[]
    },
  })
  const to = user ? '/dashboard/investments' : '/register'

  return (
    <PublicShell title="فرص الاستثمار" subtitle="فرص تُدرجها إدارة المنصة. اقرأ الشروط والمخاطر قبل الاشتراك.">
      <Notice>العوائد المستهدفة ليست مضمونة، وقد تخسر جزءاً من رأس مالك أو كله.</Notice>
      {q.isLoading ? (
        <div className="op-grid">{[1, 2, 3].map(i => <Skeleton key={i} height={240} borderRadius={16} />)}</div>
      ) : q.isError ? (
        <ErrorState message="تعذّر تحميل الفرص" onRetry={() => q.refetch()} />
      ) : !q.data || q.data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo' }}>
          <TrendingUp size={34} color="rgba(212,175,55,0.3)" style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>لا توجد فرص مفتوحة حالياً</div>
          <div style={{ fontSize: 13 }}>ستظهر الفرص هنا عند نشرها.</div>
        </div>
      ) : (
        <div className="op-grid">
          {q.data.map(o => {
            const pct = Number(o.target_amount) > 0 ? Math.min(100, Math.round((Number(o.amount_raised) / Number(o.target_amount)) * 100)) : 0
            const [riskT, riskC] = RISK[o.risk_level] || ['—', '#9ca3af']
            return (
              <Link key={o.id} to={to} className="glass-card" style={{ textDecoration: 'none', padding: 18, display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'Cairo' }}>{o.name_ar || o.name}</h3>
                  <span style={{ fontSize: 10, fontWeight: 700, color: riskC, background: `${riskC}1a`, borderRadius: 6, padding: '3px 8px', fontFamily: 'Cairo', alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>مخاطر {riskT}</span>
                </div>
                {o.location && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', display: 'flex', gap: 5, alignItems: 'center', marginBottom: 8 }}><MapPin size={12} />{o.location}</div>}
                <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', lineHeight: 1.8, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{o.description_ar || o.description}</p>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#D4AF37,#E8CC6A)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'Montserrat', color: 'rgba(255,255,255,0.5)', marginBottom: 12 }} dir="ltr">
                  <span>{pct}% funded</span><span>{Number(o.target_amount).toLocaleString()} {o.currency}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'Cairo', color: '#D4AF37' }}>
                  <span>الحد الأدنى: <b dir="ltr">{Number(o.minimum_investment).toLocaleString()} {o.currency}</b></span>
                  {o.duration_days && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} />{o.duration_days} يوم</span>}
                </div>
                {o.projected_return_min != null && o.projected_return_max != null && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', marginTop: 8 }}>
                    عائد مستهدف {Number(o.projected_return_min)}–{Number(o.projected_return_max)}% (غير مضمون)
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
      <style>{`.op-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}@media(max-width:640px){.op-grid{grid-template-columns:1fr}}`}</style>
    </PublicShell>
  )
}
