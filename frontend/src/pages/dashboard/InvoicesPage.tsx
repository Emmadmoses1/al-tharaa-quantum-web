import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useSite } from '../../lib/useSite'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

type Invoice = {
  id: string; number: string; asset: string; network: string | null; amount: number; txid: string | null; purpose: string | null
  usd_value: number | null; rate: number | null; status: string; issued_at: string
}
const n = (v: unknown, d = 8) => Number(v).toLocaleString('en-US', { maximumFractionDigits: d })
const card: React.CSSProperties = { background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 14, padding: 16 }

function useInvoices() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['invoices', user?.id], enabled: !!user?.id, staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('*').eq('user_id', user!.id).order('issued_at', { ascending: false }).limit(100)
      if (error) throw error
      return (data || []) as Invoice[]
    },
  })
}

export default function InvoicesPage() {
  const q = useInvoices()
  return (
    <div style={{ direction: 'rtl', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}>الفواتير</h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', marginBottom: 18, lineHeight: 1.9 }}>تُصدر فاتورة تلقائياً عند تأكيد كل إيداع، وتُرسل إلى بريدك أيضاً.</p>
      {q.isLoading ? <Skeleton height={120} borderRadius={14} /> : q.isError ? <ErrorState onRetry={q.refetch} /> : !q.data?.length ? (
        <div style={{ ...card, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', fontSize: 13 }}>لا توجد فواتير بعد</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {q.data.map(i => (
            <Link key={i.id} to={`/dashboard/invoices/${i.id}`} style={{ ...card, textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div>
                <div style={{ color: '#fff', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14 }}>{i.number}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Montserrat', marginTop: 2 }}>{new Date(i.issued_at).toLocaleString('en-GB')}</div>
              </div>
              <div style={{ textAlign: 'left', direction: 'ltr' }}>
                <div style={{ color: '#D4AF37', fontFamily: 'Montserrat', fontWeight: 800 }}>{n(i.amount)} {i.asset}</div>
                {i.usd_value != null && <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontFamily: 'Montserrat' }}>≈ ${n(i.usd_value, 2)}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function InvoiceDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { data: site } = useSite()
  const q = useInvoices()
  const inv = q.data?.find(i => i.id === id)
  const co = site?.invoice

  if (q.isLoading) return <Skeleton height={300} borderRadius={14} />
  if (q.isError) return <ErrorState onRetry={q.refetch} />
  if (!inv) return <div style={{ ...card, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo' }}>الفاتورة غير موجودة. <Link to="/dashboard/invoices" style={{ color: '#D4AF37' }}>رجوع</Link></div>

  const rows: [string, string][] = [
    ['Invoice no.', inv.number], ['Date', new Date(inv.issued_at).toUTCString()], ['Billed to', user?.email || ''],
    ['Description', `Deposit to ${inv.purpose || 'trading'} wallet`], ['Asset / network', `${inv.asset}${inv.network ? ` (${inv.network})` : ''}`],
    ['Amount received', `${n(inv.amount)} ${inv.asset}`], ['Rate at confirmation', inv.rate != null ? `1 ${inv.asset} = ${n(inv.rate, 4)} USD` : '-'],
    ['Value', inv.usd_value != null ? `${n(inv.usd_value, 2)} USD` : '-'], ['Transaction', inv.txid || 'Confirmed by administrator'], ['Status', 'PAID / CREDITED'],
  ]
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <style>{`@media print{body *{visibility:hidden}.inv-print,.inv-print *{visibility:visible}.inv-print{position:absolute;left:0;top:0;width:100%;box-shadow:none!important}.no-print{display:none!important}}`}</style>
      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 14, direction: 'rtl' }}>
        <Link to="/dashboard/invoices" className="btn-outline-gold" style={{ textDecoration: 'none', padding: '10px 18px', fontSize: 13 }}>رجوع</Link>
        <button type="button" className="btn-gold" onClick={() => window.print()} style={{ padding: '10px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Printer size={15} />طباعة / حفظ PDF</button>
      </div>
      <div className="inv-print" style={{ background: '#fff', color: '#111', borderRadius: 12, padding: 28, direction: 'ltr', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#9a7b12' }}>{co?.company_name || 'AL THARAA QUANTUM'}</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>INVOICE</div>
        </div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 18 }}>{co?.address}{co?.tax_id ? ` · Tax ID ${co.tax_id}` : ''}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}><td style={{ padding: '9px 0', color: '#666', borderBottom: '1px solid #eee', width: '38%' }}>{k}</td><td style={{ padding: '9px 0', borderBottom: '1px solid #eee', textAlign: 'right', wordBreak: 'break-all', fontWeight: k === 'Amount received' || k === 'Value' ? 700 : 400 }}>{v}</td></tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 12, color: '#777', marginTop: 18 }}>{co?.footer}</div>
      </div>
    </div>
  )
}
