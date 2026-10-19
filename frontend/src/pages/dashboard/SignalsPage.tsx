import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Wallet, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { useWalletBalances } from '../../hooks/useWallet'
import Sheet from '../../components/ui/Sheet'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Signal = {
  id: string; asset: string; signal: 'BUY' | 'SELL' | 'HOLD' | 'WAIT'
  entry_zone_low: number | null; entry_zone_high: number | null; stop_loss: number | null
  take_profit_1: number | null; take_profit_2: number | null; risk_level: string | null
  confidence_percent: number | null; timeframe: string | null; analysis_summary: string | null
  expires_at: string | null; created_at: string
}

const COLOR: Record<string, string> = { BUY: '#10b981', SELL: '#ef4444', HOLD: '#D4AF37', WAIT: '#9ca3af' }
const SIG_AR: Record<string, string> = { BUY: 'شراء', SELL: 'تجنّب / خروج', HOLD: 'احتفاظ', WAIT: 'انتظار' }
const RISK_AR: Record<string, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'مرتفعة', very_high: 'مرتفعة جداً' }
const num = (n: unknown, d = 2) => (n == null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d }))
const mono: React.CSSProperties = { fontFamily: 'Montserrat', direction: 'ltr', display: 'inline-block' }

export default function SignalsPage() {
  const qc = useQueryClient()
  const wallet = useWalletBalances()
  const balance = wallet.data?.find(w => w.ledger_type === 'trading' && w.asset === 'USDT')?.balance ?? 0

  const [sel, setSel] = useState<Signal | null>(null)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const signals = useQuery({
    queryKey: ['signals-live'], staleTime: 0, refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from('ai_signals').select('*').eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order('created_at', { ascending: false }).limit(30)
      if (error) throw error
      return (data || []) as Signal[]
    },
  })

  const positions = useQuery({
    queryKey: ['positions-live'], staleTime: 0, refetchInterval: 20000,
    queryFn: () => api.get<any[]>('/api/trade/positions'),
  })

  function refresh() {
    qc.invalidateQueries({ queryKey: ['positions-live'] })
    qc.invalidateQueries({ queryKey: ['wallet-balances'] })
    qc.invalidateQueries({ queryKey: ['trading-portfolio'] })
    qc.invalidateQueries({ queryKey: ['trades'] })
  }

  function openSheet(s: Signal) { setSel(s); setAmount(''); setErr(null) }

  async function openTrade() {
    if (!sel) return
    setBusy(true); setErr(null)
    try {
      await api.post('/api/trade/open', { signal_id: sel.id, amount: Number(amount) })
      setSel(null); setOk('تم فتح الصفقة. ستُغلق تلقائياً عند وقف الخسارة أو الهدف الأول.'); refresh()
    } catch (e) { setErr(e instanceof Error ? e.message : 'فشل فتح الصفقة') }
    setBusy(false)
  }

  async function closeTrade(id: string) {
    if (!window.confirm('إغلاق الصفقة الآن بسعر السوق؟')) return
    setBusy(true); setOk(null)
    try { await api.post(`/api/trade/close/${id}`, {}); setOk('تم إغلاق الصفقة وإضافة الناتج لرصيدك.'); refresh() }
    catch (e) { setErr(e instanceof Error ? e.message : 'فشل الإغلاق') }
    setBusy(false)
  }

  const amt = Number(amount)
  const amountOk = amt >= 10 && amt <= balance
  const card: React.CSSProperties = { background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 14, padding: 18 }

  return (
    <div style={{ direction: 'rtl' }} translate="no" className="notranslate">
      <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}><span>إشارات الذكاء الاصطناعي</span></h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', marginBottom: 18, lineHeight: 1.8 }}>
        <span>تُحدَّث الإشارات تلقائياً من تحليل فني (EMA وRSI وATR). الصفقات تُنفَّذ داخل المنصة على رصيد محفظة التداول بسعر السوق الحالي.</span>
      </p>

      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Wallet size={22} color="#D4AF37" />
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}><span>رصيد محفظة التداول</span></div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#D4AF37', ...mono }}>{num(balance, 2)} USDT</div>
          </div>
        </div>
        <Link to="/dashboard/deposit" className="btn-gold" style={{ textDecoration: 'none', fontSize: 12, padding: '10px 18px' }}><span>إيداع</span></Link>
      </div>

      {ok && <div role="status" style={{ ...card, marginBottom: 14, color: '#10b981', fontFamily: 'Cairo', fontSize: 13, borderColor: 'rgba(16,185,129,0.3)' }}><span>{ok}</span></div>}

      <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', margin: '4px 0 10px' }}><span>صفقاتي المفتوحة</span></h2>
      {positions.isLoading ? <Skeleton height={80} borderRadius={14} /> : positions.isError ? <ErrorState onRetry={positions.refetch} /> :
        !positions.data?.length ? (
          <div style={{ ...card, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo', fontSize: 13 }}><span>لا توجد صفقات مفتوحة</span></div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {positions.data.map((p: any) => (
              <div key={p.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, color: '#fff', fontFamily: 'Montserrat' }}>{p.asset}/USDT</span>
                  <span style={{ fontWeight: 800, fontFamily: 'Montserrat', direction: 'ltr', color: (p.pnl ?? 0) >= 0 ? '#10b981' : '#ef4444' }}>
                    {p.pnl == null ? '—' : `${p.pnl >= 0 ? '+' : ''}${num(p.pnl, 2)} USDT`}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', marginBottom: 12 }}>
                  <span>الدخول: <b style={mono}>{num(p.executed_price)}</b></span>
                  <span>السعر الحالي: <b style={mono}>{num(p.price)}</b></span>
                  <span>وقف الخسارة: <b style={mono}>{num(p.stop_loss)}</b></span>
                  <span>الهدف: <b style={mono}>{num(p.take_profit)}</b></span>
                  <span>المبلغ: <b style={mono}>{num(p.amount_usdt)} USDT</b></span>
                </div>
                <button type="button" disabled={busy} onClick={() => closeTrade(p.id)} className="btn-outline-gold" style={{ width: '100%', fontSize: 13 }}><span>إغلاق الصفقة</span></button>
              </div>
            ))}
          </div>
        )}

      <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', margin: '22px 0 10px' }}><span>الإشارات الحالية</span></h2>
      {signals.isLoading ? <Skeleton height={140} borderRadius={14} /> : signals.isError ? <ErrorState onRetry={signals.refetch} /> :
        !signals.data?.length ? (
          <div style={{ ...card, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo', fontSize: 13, lineHeight: 1.9 }}>
            <span>لا توجد إشارات نشطة حالياً. يقوم المحرك بتحديثها تلقائياً.</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {signals.data.map(s => {
              const c = COLOR[s.signal] || COLOR.WAIT
              return (
                <div key={s.id} style={{ ...card, borderColor: c + '44' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {s.signal === 'SELL' ? <TrendingDown size={22} color={c} /> : <TrendingUp size={22} color={c} />}
                      <span style={{ fontWeight: 800, color: '#fff', fontFamily: 'Montserrat', fontSize: 16 }}>{s.asset}/USDT</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>{s.timeframe}</span>
                    </div>
                    <span style={{ background: c + '1f', color: c, borderRadius: 7, padding: '4px 12px', fontSize: 12, fontWeight: 800, fontFamily: 'Cairo' }}><span>{SIG_AR[s.signal]}</span></span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', marginBottom: 10 }}>
                    <span>منطقة الدخول: <b style={mono}>{num(s.entry_zone_low)} – {num(s.entry_zone_high)}</b></span>
                    <span>وقف الخسارة: <b style={mono}>{num(s.stop_loss)}</b></span>
                    <span>الهدف 1: <b style={mono}>{num(s.take_profit_1)}</b></span>
                    <span>الهدف 2: <b style={mono}>{num(s.take_profit_2)}</b></span>
                    <span>المخاطرة: <b>{RISK_AR[s.risk_level || ''] || '—'}</b></span>
                    <span>مؤشر الثقة: <b style={mono}>{num(s.confidence_percent, 0)}%</b></span>
                  </div>
                  {s.analysis_summary && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', lineHeight: 1.8, margin: '0 0 12px' }}><span>{s.analysis_summary}</span></p>}
                  {s.signal === 'BUY' ? (
                    <button type="button" onClick={() => openSheet(s)} className="btn-gold" style={{ width: '100%', fontSize: 13 }}><span>تداول هذه الإشارة</span></button>
                  ) : (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo' }}><span>التداول متاح على إشارات الشراء فقط</span></div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      <Sheet open={!!sel} title={sel ? `شراء ${sel.asset}/USDT` : ''} onClose={() => setSel(null)}>
        {sel && (
          <div style={{ direction: 'rtl', fontFamily: 'Cairo' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 2, marginBottom: 12 }}>
              <div>الدخول بسعر السوق الحالي (منطقة الإشارة: <b style={mono}>{num(sel.entry_zone_low)} – {num(sel.entry_zone_high)}</b>)</div>
              <div>وقف الخسارة <b style={mono}>{num(sel.stop_loss)}</b> · الهدف <b style={mono}>{num(sel.take_profit_1)}</b></div>
              <div>رسوم 0.1% عند الفتح و0.1% عند الإغلاق</div>
            </div>
            <label htmlFor="trade-amt" style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}><span>المبلغ (USDT) — الأدنى 10</span></label>
            <input id="trade-amt" type="text" inputMode="decimal" dir="ltr" autoComplete="off" value={amount} placeholder="0.00"
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(11,11,11,0.7)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 10, padding: '13px 14px', color: '#fff', fontSize: 16, fontFamily: 'Montserrat', outline: 'none' }} />
            <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
              {[25, 50, 100].map(p => (
                <button key={p} type="button" onClick={() => setAmount(String(Math.floor(balance * p) / 100))}
                  style={{ flex: 1, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: '8px 0', color: '#D4AF37', fontFamily: 'Montserrat', fontSize: 12, cursor: 'pointer' }}>{p}%</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: amt > balance ? '#ef4444' : 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
              <span>المتاح: {num(balance, 2)} USDT</span>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, marginBottom: 12 }}>
              <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 11, color: 'rgba(245,158,11,0.9)', lineHeight: 1.8 }}>الإشارات ليست مضمونة وقد تخسر جزءاً أو كل المبلغ المستثمر. لا تتداول بمبلغ لا تتحمل خسارته.</span>
            </div>
            {err && <div style={{ marginBottom: 12, padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 12, color: '#ef4444' }}><span>{err}</span></div>}
            <button type="button" onClick={openTrade} disabled={!amountOk || busy} className="btn-gold" style={{ width: '100%', fontSize: 14, opacity: !amountOk || busy ? 0.5 : 1 }}>
              <span>{busy ? 'جارٍ التنفيذ...' : 'تأكيد الشراء'}</span>
            </button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
