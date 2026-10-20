import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import MarketsBoard from '../../components/MarketsBoard'
import { useWalletBalances } from '../../hooks/useWallet'
import PriceChart from '../../components/PriceChart'
import { buildLevels } from '../../lib/chartLevels'
import { SIGNAL_COLOR, SIGNAL_AR } from '../../lib/ai'

/* eslint-disable @typescript-eslint/no-explicit-any */
const OK_IV = ['15m', '1h', '4h', '1d']
const num = (n: unknown) => (n == null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }))

export default function MarketsDash() {
  const [asset, setAsset] = useState('BTC')
  const [interval, setInterval] = useState('1h')
  const [selId, setSelId] = useState<string | null>(null)
  const wallet = useWalletBalances()
  const tbal = wallet.data?.find(w => w.ledger_type === 'trading' && w.asset === 'USDT')?.balance ?? 0

  const signals = useQuery({
    queryKey: ['signals-chart'], staleTime: 0, refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from('ai_signals').select('*').eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order('created_at', { ascending: false }).limit(30)
      if (error) throw error
      return (data || []) as any[]
    },
  })
  const positions = useQuery({ queryKey: ['positions-chart'], staleTime: 0, refetchInterval: 20000, queryFn: () => api.get<any[]>('/api/trade/positions') })

  const sel = signals.data?.find(s => s.id === selId)
  const levels = buildLevels(asset, sel ? [sel] : signals.data, positions.data)

  function pick(s: any) {
    setSelId(s.id); setAsset(s.asset)
    if (OK_IV.includes(s.timeframe)) setInterval(s.timeframe)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div style={{ direction: 'rtl', maxWidth: 940, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}>الأسواق</h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', marginBottom: 18, lineHeight: 1.9 }}>
        أسعار ورسوم بيانية حية. تظهر على الرسم منطقة دخول الإشارة ووقف الخسارة والأهداف وصفقاتك المفتوحة.
      </p>

      <div className="glass-card" style={{ padding: '12px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>رصيد محفظة التداول</div>
          <b style={{ fontSize: 20, color: '#D4AF37', fontFamily: 'Montserrat', direction: 'ltr', display: 'inline-block' }}>{num(tbal)} USDT</b></div>
        <Link to="/dashboard/deposit" className="btn-gold" style={{ textDecoration: 'none', padding: '9px 18px', fontSize: 12 }}>إيداع</Link>
      </div>

      <MarketsBoard />

      <div className="glass-card" style={{ padding: 14, marginTop: 18 }}>
        <PriceChart asset={asset} interval={interval} onAsset={a => { setAsset(a); setSelId(null) }} onInterval={setInterval} levels={levels} />
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#D4AF37', margin: '26px 0 6px' }}>الإشارات النشطة</h2>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', marginBottom: 12 }}>اضغط على إشارة لعرض مستوياتها على الرسم.</p>
      {signals.isLoading ? null : !signals.data?.length ? (
        <div className="glass-card" style={{ padding: 18, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', fontSize: 13 }}>لا توجد إشارات نشطة الآن. يحدّثها المحرك تلقائياً.</div>
      ) : (
        <div className="md-sig">
          {signals.data.map(s => {
            const c = SIGNAL_COLOR[s.signal] || '#9ca3af'
            return (
              <button key={s.id} type="button" onClick={() => pick(s)} className="glass-card" style={{
                padding: 14, textAlign: 'right', cursor: 'pointer', width: '100%', display: 'block',
                borderColor: selId === s.id ? '#D4AF37' : undefined,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <b style={{ color: '#fff', fontFamily: 'Montserrat' }} dir="ltr">{s.asset}/USDT · {s.timeframe}</b>
                  <span style={{ fontSize: 11, fontWeight: 700, color: c, background: `${c}1a`, borderRadius: 6, padding: '3px 9px', fontFamily: 'Cairo' }}>{SIGNAL_AR[s.signal] || s.signal}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 11.5, fontFamily: 'Montserrat', color: 'rgba(255,255,255,0.55)' }} dir="ltr">
                  <span>Entry {num(s.entry_zone_low)}–{num(s.entry_zone_high)}</span>
                  <span style={{ color: '#ef4444' }}>SL {num(s.stop_loss)}</span>
                  <span style={{ color: '#10b981' }}>TP1 {num(s.take_profit_1)}</span>
                  <span>{s.confidence_percent != null ? `${num(s.confidence_percent)}%` : ''}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
        <Link to="/dashboard/signals" className="btn-gold" style={{ textDecoration: 'none', padding: '12px 22px', fontSize: 14 }}>فتح صفقة من الإشارات</Link>
        <Link to="/dashboard/ai" className="btn-outline-gold" style={{ textDecoration: 'none', padding: '12px 22px', fontSize: 14 }}>ذكاء السوق</Link>
      </div>
      <style>{`.md-sig{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:640px){.md-sig{grid-template-columns:1fr}}`}</style>
    </div>
  )
}
