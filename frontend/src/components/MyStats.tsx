import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

type S = { count: number; wins: number; losses: number; win_rate: number; net: number; best: number; worst: number; series: number[] }

function Curve({ pts, color }: { pts: number[]; color: string }) {
  if (pts.length < 2) return null
  const w = 300, h = 70, min = Math.min(0, ...pts), max = Math.max(0, ...pts), span = max - min || 1
  const x = (i: number) => (i / (pts.length - 1)) * w
  const y = (v: number) => h - 4 - ((v - min) / span) * (h - 8)
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block' }}>
      <line x1="0" x2={w} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export default function MyStats() {
  const q = useQuery({ queryKey: ['my-stats'], staleTime: 60000, retry: 0, queryFn: () => api.get<S>('/api/my-stats') })
  const s = q.data
  if (!s || s.count === 0) return null
  const up = s.net >= 0
  const col = up ? '#10b981' : '#ef4444'
  const cell = (label: string, value: string, c = '#fff') => (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', fontSize: 11 }}>{label}</div>
      <div dir="ltr" style={{ color: c, fontFamily: 'Montserrat', fontWeight: 800, fontSize: 15, textAlign: 'right' }}>{value}</div>
    </div>
  )
  const sign = (n: number) => `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(2)}`
  return (
    <div className="dq-card" style={{ padding: 16, margin: '0 0 16px', direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <div style={{ color: '#fff', fontFamily: 'Cairo', fontWeight: 800, fontSize: 15 }}>أداؤك</div>
        <div dir="ltr" style={{ color: col, fontFamily: 'Montserrat', fontWeight: 900, fontSize: 20 }}>{sign(s.net)} USDT</div>
      </div>
      <Curve pts={s.series} color={col} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(90px,1fr))', gap: 12, marginTop: 12 }}>
        {cell('الصفقات المغلقة', String(s.count))}
        {cell('نسبة الربح', `${s.win_rate}%`, '#D4AF37')}
        {cell('أفضل نتيجة', sign(s.best), '#10b981')}
        {cell('أسوأ نتيجة', sign(s.worst), s.worst < 0 ? '#ef4444' : '#fff')}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Cairo', fontSize: 11, marginTop: 10 }}>تُحسب من صفقاتك المغلقة فقط. النتائج السابقة لا تعني نتائج مستقبلية.</div>
    </div>
  )
}
