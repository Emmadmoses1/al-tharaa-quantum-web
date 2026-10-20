import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export type Turn = { deposited: number; traded: number; required: number; remaining: number; multiplier: number; eligible: boolean }

export function useTurnover(enabled = true) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['turnover', user?.id], enabled: !!user?.id && enabled, staleTime: 0, refetchInterval: 30000,
    queryFn: () => api.get<Turn>('/api/withdrawals/turnover'),
  })
}

const n = (v: number) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 })

export default function TurnoverCard() {
  const { data: t } = useTurnover()
  if (!t || (t.required === 0 && t.deposited === 0)) return null
  const pct = t.required > 0 ? Math.min(100, (t.traded / t.required) * 100) : 100
  const col = t.eligible ? '#10b981' : '#D4AF37'
  return (
    <div style={{ background: 'rgba(20,20,20,0.85)', border: `1px solid ${col}40`, borderRadius: 14, padding: 16, marginBottom: 16, direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 10, fontFamily: 'Cairo', fontSize: 13 }}>
        <b style={{ color: '#fff' }}>شرط السحب: التداول {t.multiplier} أضعاف الإيداع</b>
        <b style={{ color: col, fontFamily: 'Montserrat' }}>{pct.toFixed(0)}%</b>
      </div>
      <div style={{ height: 8, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: col, transition: 'width .4s' }} />
      </div>
      <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.9, color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo' }}>
        {t.eligible
          ? <span style={{ color: '#10b981' }}>أنت مؤهل للسحب من محفظة التداول.</span>
          : <span>المتبقي للتداول: <b style={{ color: '#D4AF37', fontFamily: 'Montserrat', direction: 'ltr', display: 'inline-block' }}>{n(t.remaining)} USDT</b></span>}
        <br />
        <span>تم تداول <b style={{ fontFamily: 'Montserrat', direction: 'ltr', display: 'inline-block' }}>{n(t.traded)}</b> من <b style={{ fontFamily: 'Montserrat', direction: 'ltr', display: 'inline-block' }}>{n(t.required)}</b> USDT (الصفقات المغلقة فقط).</span>
      </div>
    </div>
  )
}
