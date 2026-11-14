import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer, Award } from 'lucide-react'
import { LogoMark } from '../../components/Logo'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useSite } from '../../lib/useSite'
import { useInvestmentPortfolio } from '../../hooks/useData'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

const d = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—')

// Printable investment certificate: a record of what the user invested, from real allocation data only.
export default function CertificatePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { data: site } = useSite()
  const q = useInvestmentPortfolio()
  const prof = useQuery({
    queryKey: ['billing-name', user?.id], enabled: !!user?.id, staleTime: 60000,
    queryFn: async () => (await supabase.from('profiles').select('full_name').eq('id', user!.id).maybeSingle()).data?.full_name as string | null,
  })
  const a = q.data?.find(x => x.id === id)
  const co = site?.invoice

  if (q.isLoading) return <Skeleton height={320} borderRadius={14} />
  if (q.isError) return <ErrorState onRetry={q.refetch} />
  if (!a) return <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', padding: 40 }}>الشهادة غير موجودة. <Link to="/dashboard/investments" style={{ color: '#D4AF37' }}>رجوع</Link></div>

  const name = a.investment_opportunities?.name_ar || a.investment_opportunities?.name || '—'
  const rows: [string, string, string][] = [
    ['Investor', 'المستثمر', prof.data || user?.email || '—'],
    ['Investment', 'الاستثمار', name],
    ['Amount invested', 'المبلغ المستثمر', `${a.currency} ${Number(a.amount_invested).toFixed(3)}`],
    ['Status', 'الحالة', a.status],
    ['Start date', 'تاريخ البدء', d(a.started_at || a.created_at)],
    ['Expected end', 'تاريخ الانتهاء المتوقع', d(a.expected_end_at)],
    ['Reference', 'المرجع', a.id.slice(0, 8).toUpperCase()],
  ]

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <style>{`@media print { body * { visibility: hidden } .cert-print, .cert-print * { visibility: visible } .cert-print { position: absolute; inset: 0; box-shadow: none !important } .no-print { display: none !important } }`}</style>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <Link to="/dashboard/investments" style={{ color: '#D4AF37', fontFamily: 'Cairo', fontSize: 13 }}>→ رجوع</Link>
        <button type="button" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, fontFamily: 'Cairo', cursor: 'pointer' }}>
          <Printer size={14} /> طباعة / PDF
        </button>
      </div>
      <div className="cert-print" style={{ background: '#fff', color: '#1a1a1a', borderRadius: 14, padding: 36, border: '6px double #D4AF37' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
          <LogoMark size={44} />
          <div style={{ fontSize: 20, fontWeight: 800, color: '#9a7b12' }}>{co?.company_name || 'AL THARAA QUANTUM'}</div>
        </div>
        <div style={{ textAlign: 'center', margin: '22px 0 6px' }}><Award size={34} color="#D4AF37" /></div>
        <div style={{ textAlign: 'center', fontSize: 24, fontWeight: 800, letterSpacing: 2 }}>INVESTMENT CERTIFICATE</div>
        <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, marginBottom: 22, fontFamily: 'Cairo' }}>شهادة استثمار</div>
        <div style={{ display: 'grid', gap: 0 }}>
          {rows.map(([en, ar, v]) => (
            <div key={en} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid #eee', fontSize: 14 }}>
              <span style={{ color: '#666' }}>{en} · <span style={{ fontFamily: 'Cairo' }}>{ar}</span></span>
              <span style={{ fontWeight: 700, textAlign: 'right' }}>{v}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#777', lineHeight: 1.8, marginTop: 20, textAlign: 'center', fontFamily: 'Cairo' }}>
          هذه الشهادة سجل لمبلغ الاستثمار وتاريخه ولا تمثل ضماناً لأي عائد.
          {co?.address ? ` ${co.address}` : ''}{co?.tax_id ? ` · ${co.tax_id}` : ''}
        </p>
        {co?.footer && <p style={{ fontSize: 11, color: '#999', textAlign: 'center', margin: 0 }}>{co.footer}</p>}
      </div>
    </div>
  )
}
