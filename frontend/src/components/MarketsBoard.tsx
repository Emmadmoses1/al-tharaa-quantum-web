import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { api } from '../lib/api'
import { Skeleton } from './ui/Skeleton'
import { ErrorState } from './ui/ErrorState'

type Asset = { asset: string; pair: string; price: number; change_pct: number; high: number; low: number; volume_usdt: number; spark: number[] }
type Data = { updated_at: string; assets: Asset[]; stale: boolean }

const usd = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: n < 10 ? 4 : 2 })
const compact = (n: number) => Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n)

function Spark({ v, up }: { v: number[]; up: boolean }) {
  if (v.length < 2) return null
  const w = 160, h = 44
  const min = Math.min(...v), max = Math.max(...v), rng = max - min || 1
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * w},${h - ((x - min) / rng) * (h - 4) - 2}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={up ? '#10b981' : '#ef4444'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default function MarketsBoard() {
  const q = useQuery({ queryKey: ['markets'], queryFn: () => api.get<Data>('/api/markets'), refetchInterval: 30000, staleTime: 15000 })

  if (q.isLoading) return <div className="mb-grid">{[1, 2].map(i => <Skeleton key={i} height={210} borderRadius={16} />)}<Style /></div>
  if (q.isError || !q.data) return <ErrorState message="بيانات السوق غير متاحة الآن" onRetry={() => q.refetch()} />

  return (
    <div>
      <div className="mb-grid">
        {q.data.assets.map(a => {
          const up = a.change_pct >= 0
          return (
            <div key={a.asset} className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: 'Montserrat' }} dir="ltr">{a.pair}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: up ? '#10b981' : '#ef4444', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700 }} dir="ltr">
                  {up ? <TrendingUp size={15} /> : <TrendingDown size={15} />}{up ? '+' : ''}{a.change_pct.toFixed(2)}%
                </div>
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#D4AF37', fontFamily: 'Montserrat', marginBottom: 8 }} dir="ltr">${usd(a.price)}</div>
              <Spark v={a.spark} up={up} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
                {[['أعلى 24س', usd(a.high)], ['أدنى 24س', usd(a.low)], ['حجم 24س', `$${compact(a.volume_usdt)}`]].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>{l}</div>
                    <div style={{ fontSize: 12, color: '#fff', fontFamily: 'Montserrat', fontWeight: 600 }} dir="ltr">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo', marginTop: 12, lineHeight: 1.8 }}>
        المصدر: بيانات Binance العامة، وتتحدث كل 30 ثانية تقريباً.
        {q.data.stale && ' (البيانات المعروضة قديمة مؤقتاً لتعذّر الاتصال بالمصدر.)'}
        {' '}الأسعار للاطلاع فقط وليست عرضاً للبيع أو الشراء.
      </div>
      <Style />
    </div>
  )
}

function Style() {
  return <style>{`.mb-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:640px){.mb-grid{grid-template-columns:1fr}}`}</style>
}
