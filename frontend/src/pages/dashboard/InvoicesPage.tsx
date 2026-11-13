import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer, Copy, ArrowDownToLine, ArrowUpFromLine, Receipt } from 'lucide-react'
import { LogoMark } from '../../components/Logo'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useSite } from '../../lib/useSite'
import { useLocalMoney } from '../../lib/useLocalMoney'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

type Invoice = {
  id: string; number: string; asset: string; network: string | null; amount: number; txid: string | null; purpose: string | null
  usd_value: number | null; rate: number | null; status: string; issued_at: string
}
type Withdrawal = {
  id: string; asset: string; network: string; amount: number; fees: number | null; net_amount: number | null
  destination_address: string; txid: string | null; created_at: string; updated_at: string | null
}
type Doc = {
  key: string; kind: 'deposit' | 'withdrawal'; number: string; date: string; asset: string; network: string | null
  gross: number; fee: number; net: number; usd: number | null; rate: number | null; ref: string | null; purpose: string | null; address: string | null
}

const n = (v: unknown, d = 8) => Number(v).toLocaleString('en-US', { maximumFractionDigits: d })
const card: React.CSSProperties = { background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 14, padding: 16 }
const STABLE = ['USDT', 'USDC', 'USD']

function useDocs() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['billing-docs', user?.id], enabled: !!user?.id, staleTime: 0,
    queryFn: async () => {
      const [i, w] = await Promise.all([
        supabase.from('invoices').select('*').eq('user_id', user!.id).order('issued_at', { ascending: false }).limit(100),
        supabase.from('withdrawals').select('*').eq('user_id', user!.id).eq('status', 'completed').order('created_at', { ascending: false }).limit(100),
      ])
      if (i.error) throw i.error
      if (w.error) throw w.error
      const dep: Doc[] = ((i.data || []) as Invoice[]).map(v => ({
        key: v.id, kind: 'deposit', number: v.number, date: v.issued_at, asset: v.asset, network: v.network, gross: Number(v.amount), fee: 0, net: Number(v.amount),
        usd: v.usd_value, rate: v.rate, ref: v.txid, purpose: v.purpose, address: null,
      }))
      const wd: Doc[] = ((w.data || []) as Withdrawal[]).map(v => {
        const fee = Number(v.fees || 0), net = Number(v.net_amount ?? Number(v.amount) - fee)
        return {
          key: `w-${v.id}`, kind: 'withdrawal', number: `WR-${v.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`, date: v.updated_at || v.created_at, asset: v.asset, network: v.network,
          gross: Number(v.amount), fee, net, usd: STABLE.includes(v.asset) ? net : null, rate: STABLE.includes(v.asset) ? 1 : null, ref: v.txid, purpose: null, address: v.destination_address,
        }
      })
      return [...dep, ...wd].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    },
  })
}

export default function InvoicesPage() {
  const q = useDocs()
  const [tab, setTab] = useState<'all' | 'deposit' | 'withdrawal'>('all')
  const list = (q.data || []).filter(d => tab === 'all' || d.kind === tab)
  const tabs: ['all' | 'deposit' | 'withdrawal', string][] = [['all', 'الكل'], ['deposit', 'الإيداعات'], ['withdrawal', 'السحوبات']]
  return (
    <div style={{ direction: 'rtl', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}>الفواتير والإيصالات</h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', marginBottom: 16, lineHeight: 1.9 }}>تُصدر فاتورة تلقائياً عند تأكيد كل إيداع، وإيصال عند إرسال كل سحب. يمكنك طباعتها أو حفظها بصيغة PDF.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {tabs.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} style={{ padding: '8px 16px', borderRadius: 999, cursor: 'pointer', fontFamily: 'Cairo', fontWeight: 700, fontSize: 12, background: tab === k ? 'rgba(212,175,55,0.14)' : 'transparent', border: `1px solid ${tab === k ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`, color: tab === k ? '#D4AF37' : 'rgba(255,255,255,0.6)' }}>{l}</button>
        ))}
      </div>
      {q.isLoading ? <Skeleton height={120} borderRadius={14} /> : q.isError ? <ErrorState onRetry={q.refetch} /> : !list.length ? (
        <div style={{ ...card, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', fontSize: 13, padding: 28 }}>
          <Receipt size={26} color="rgba(212,175,55,0.5)" style={{ marginBottom: 8 }} />
          <div>لا توجد مستندات بعد</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {list.map(d => (
            <Link key={d.key} to={`/dashboard/invoices/${d.key}`} style={{ ...card, textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: d.kind === 'deposit' ? 'rgba(16,185,129,0.12)' : 'rgba(212,175,55,0.12)' }}>
                  {d.kind === 'deposit' ? <ArrowDownToLine size={18} color="#10b981" /> : <ArrowUpFromLine size={18} color="#D4AF37" />}
                </div>
                <div>
                  <div style={{ color: '#fff', fontFamily: 'Cairo', fontWeight: 700, fontSize: 13 }}>{d.kind === 'deposit' ? 'فاتورة إيداع' : 'إيصال سحب'}</div>
                  <div dir="ltr" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Montserrat', marginTop: 2, textAlign: 'right' }}>{d.number} · {new Date(d.date).toLocaleDateString('en-GB')}</div>
                </div>
              </div>
              <div style={{ textAlign: 'left', direction: 'ltr' }}>
                <div style={{ color: d.kind === 'deposit' ? '#10b981' : '#D4AF37', fontFamily: 'Montserrat', fontWeight: 800 }}>{d.kind === 'deposit' ? '+' : '-'}{n(d.gross)} {d.asset}</div>
                {d.usd != null && <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontFamily: 'Montserrat' }}>≈ ${n(d.usd, 2)}</div>}
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
  const local = useLocalMoney()
  const q = useDocs()
  const prof = useQuery({
    queryKey: ['billing-name', user?.id], enabled: !!user?.id, staleTime: 60000,
    queryFn: async () => (await supabase.from('profiles').select('full_name').eq('id', user!.id).maybeSingle()).data?.full_name as string | null,
  })
  const [copied, setCopied] = useState(false)
  const d = q.data?.find(x => x.key === id)
  const co = site?.invoice

  if (q.isLoading) return <Skeleton height={300} borderRadius={14} />
  if (q.isError) return <ErrorState onRetry={q.refetch} />
  if (!d) return <div style={{ ...card, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo' }}>المستند غير موجود. <Link to="/dashboard/invoices" style={{ color: '#D4AF37' }}>رجوع</Link></div>

  const isDep = d.kind === 'deposit'
  const title = isDep ? ['INVOICE', 'فاتورة إيداع'] : ['WITHDRAWAL RECEIPT', 'إيصال سحب']
  const loc = d.usd != null ? local(d.usd) : null
  const asset = `${d.asset}${d.network ? ` (${d.network})` : ''}`
  const lines: [string, string, string][] = [
    [isDep ? `Deposit to ${d.purpose || 'trading'} wallet` : 'Withdrawal to external wallet', isDep ? `إيداع إلى محفظة ${d.purpose === 'investment' ? 'الاستثمار' : 'التداول'}` : 'سحب إلى محفظة خارجية', `${n(d.gross)} ${d.asset}`],
  ]
  if (!isDep && d.fee > 0) lines.push(['Network / service fee', 'رسوم الخدمة', `- ${n(d.fee)} ${d.asset}`])
  const meta: [string, string, string][] = [
    ['Document no.', 'رقم المستند', d.number], ['Date', 'التاريخ', new Date(d.date).toUTCString()],
    [isDep ? 'Billed to' : 'Issued to', isDep ? 'صادرة إلى' : 'صادر إلى', [prof.data, user?.email].filter(Boolean).join(' · ')],
    ['Asset / network', 'العملة / الشبكة', asset],
  ]
  if (d.rate != null && d.rate !== 1) meta.push(['Rate at confirmation', 'السعر وقت التأكيد', `1 ${d.asset} = ${n(d.rate, 4)} USD`])
  if (d.address) meta.push(['Destination address', 'عنوان الاستلام', d.address])
  meta.push([isDep ? 'Transaction' : 'Transaction hash', 'رقم المعاملة', d.ref || (isDep ? 'Confirmed by administrator' : 'Sent by the platform')])

  const copyRef = () => { if (d.ref) navigator.clipboard?.writeText(d.ref).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500) }).catch(() => undefined) }
  const td = (extra: React.CSSProperties = {}): React.CSSProperties => ({ padding: '10px 0', borderBottom: '1px solid #eee', verticalAlign: 'top', ...extra })

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <style>{`@media print{body *{visibility:hidden}.inv-print,.inv-print *{visibility:visible}.inv-print{position:absolute;left:0;top:0;width:100%;border-radius:0!important}.no-print{display:none!important}}`}</style>
      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 14, direction: 'rtl', flexWrap: 'wrap' }}>
        <Link to="/dashboard/invoices" className="btn-outline-gold" style={{ textDecoration: 'none', padding: '10px 18px', fontSize: 13 }}>رجوع</Link>
        <button type="button" className="btn-gold" onClick={() => window.print()} style={{ padding: '10px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Printer size={15} />طباعة / حفظ PDF</button>
        {d.ref && <button type="button" className="btn-outline-gold" onClick={copyRef} style={{ padding: '10px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Copy size={14} />{copied ? 'تم النسخ' : 'نسخ رقم المعاملة'}</button>}
      </div>
      <div className="inv-print" style={{ background: '#fff', color: '#111', borderRadius: 12, padding: '30px 28px', direction: 'ltr', fontFamily: 'Arial, sans-serif', borderTop: '6px solid #D4AF37' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoMark size={40} flat="#9a7b12" />
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#9a7b12', lineHeight: 1.2 }}>{co?.company_name || 'AL THARAA QUANTUM'}</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{co?.address}{co?.tax_id ? ` · Tax ID ${co.tax_id}` : ''}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1 }}>{title[0]}</div>
            <div style={{ fontSize: 13, color: '#666', direction: 'rtl' }}>{title[1]}</div>
            <div style={{ display: 'inline-block', marginTop: 8, padding: '3px 12px', border: '2px solid #15803d', color: '#15803d', borderRadius: 6, fontSize: 12, fontWeight: 800, letterSpacing: 1, transform: 'rotate(-3deg)' }}>{isDep ? 'PAID / CREDITED' : 'COMPLETED / SENT'}</div>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 22 }}>
          <tbody>
            {meta.map(([en, ar, v]) => (
              <tr key={en}>
                <td style={td({ color: '#666', width: '42%' })}>{en}<span style={{ color: '#999', direction: 'rtl', unicodeBidi: 'embed', marginLeft: 6, fontSize: 12 }}>{ar}</span></td>
                <td style={td({ textAlign: 'right', wordBreak: 'break-all' })}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 22 }}>
          <thead>
            <tr style={{ background: '#faf6e8' }}>
              <th style={{ textAlign: 'left', padding: '9px 10px', fontSize: 12 }}>Description · الوصف</th>
              <th style={{ textAlign: 'right', padding: '9px 10px', fontSize: 12 }}>Amount · المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(([en, ar, v]) => (
              <tr key={en}>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{en}<div style={{ color: '#888', fontSize: 12, direction: 'rtl', textAlign: 'left' }}>{ar}</div></td>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{v}</td>
              </tr>
            ))}
            <tr>
              <td style={{ padding: '12px 10px', fontWeight: 800 }}>{isDep ? 'Total credited' : 'Net amount sent'} · {isDep ? 'الإجمالي المضاف' : 'الصافي المرسل'}</td>
              <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800, fontSize: 16, color: '#9a7b12' }}>{n(d.net)} {d.asset}</td>
            </tr>
            {d.usd != null && (
              <tr>
                <td style={{ padding: '4px 10px 10px', color: '#666' }}>Value in USD · القيمة بالدولار</td>
                <td style={{ padding: '4px 10px 10px', textAlign: 'right', color: '#444' }}>≈ {n(d.usd, 2)} USD</td>
              </tr>
            )}
            {loc && (
              <tr>
                <td style={{ padding: '0 10px 10px', color: '#666' }}>In your currency · بعملتك (approx.)</td>
                <td style={{ padding: '0 10px 10px', textAlign: 'right', color: '#444' }}>≈ {loc}</td>
              </tr>
            )}
          </tbody>
        </table>
        <div style={{ fontSize: 11, color: '#888', marginTop: 22, lineHeight: 1.8, borderTop: '1px solid #eee', paddingTop: 12 }}>
          {co?.footer && <div>{co.footer}</div>}
          <div>This is a computer-generated document and does not require a signature. · وثيقة صادرة إلكترونياً ولا تحتاج إلى توقيع.</div>
        </div>
      </div>
    </div>
  )
}
