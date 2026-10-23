import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, Radio, Activity } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { useWalletBalances } from '../../hooks/useWallet'
import Sheet from '../../components/ui/Sheet'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'
import { PageStyles, PageHeader, Pill, Empty } from '../../components/PageKit'

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

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ background: 'rgba(44,44,44,0.3)', borderRadius: 10, padding: '9px 11px' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', marginBottom: 3 }}>{k}</div>
      <div className="pk-mono" style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{v}</div>
    </div>
  )
}

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

  return (
    <div style={{ direction: 'rtl' }} translate="no" className="notranslate">
      <PageStyles />
      <PageHeader icon={<Radio size={22} color="#D4AF37" />} title="إشارات الذكاء الاصطناعي"
        sub="تحليل فني (EMA وRSI وATR) يُحدَّث تلقائياً. الصفقات تُنفَّذ على رصيد محفظة التداول بسعر السوق."
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, padding: '10px 16px' }}>
            <Wallet size={20} color="#D4AF37" />
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo' }}>رصيد التداول</div>
              <div className="pk-mono" style={{ fontSize: 18, fontWeight: 800, color: '#D4AF37' }}>{num(balance, 2)} USDT</div>
            </div>
            <Link to="/dashboard/deposit" className="btn-gold" style={{ textDecoration: 'none', fontSize: 12, padding: '8px 14px' }}>إيداع</Link>
          </div>
        } />

      {ok && <div role="status" className="pk-note" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', marginBottom: 14 }}>{ok}</div>}
      {err && !sel && <div role="alert" className="pk-note" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', marginBottom: 14 }}>{err}</div>}

      <h2 className="pk-h2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={16} color="#D4AF37" />صفقاتي المفتوحة</h2>
      {positions.isLoading ? <Skeleton height={80} borderRadius={14} /> : positions.isError ? <ErrorState onRetry={positions.refetch} /> :
        !positions.data?.length ? (
          <div className="pk-panel"><Empty icon={<Activity size={22} color="rgba(212,175,55,0.5)" />} text="لا توجد صفقات مفتوحة" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
            {positions.data.map((p: any) => {
              const up = (p.pnl ?? 0) >= 0
              return (
                <div key={p.id} className="pk-panel" style={{ borderColor: (up ? '#10b981' : '#ef4444') + '44' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 800, color: '#fff', fontFamily: 'Montserrat', fontSize: 15 }}>{p.asset}/USDT</span>
                    <span className="pk-mono" style={{ fontWeight: 800, fontSize: 15, color: up ? '#10b981' : '#ef4444' }}>
                      {p.pnl == null ? '—' : `${up ? '+' : ''}${num(p.pnl, 2)} USDT`}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <Cell k="الدخول" v={num(p.executed_price)} />
                    <Cell k="السعر الحالي" v={num(p.price)} />
                    <Cell k="وقف الخسارة" v={num(p.stop_loss)} />
                    <Cell k="الهدف" v={num(p.take_profit)} />
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', marginBottom: 12 }}>المبلغ: <b className="pk-mono">{num(p.amount_usdt)} USDT</b></div>
                  <button type="button" disabled={busy} onClick={() => closeTrade(p.id)} className="btn-outline-gold" style={{ width: '100%', fontSize: 13 }}>إغلاق الصفقة</button>
                </div>
              )
            })}
          </div>
        )}

      <h2 className="pk-h2" style={{ margin: '26px 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}><Radio size={16} color="#D4AF37" />الإشارات الحالية</h2>
      {signals.isLoading ? <Skeleton height={140} borderRadius={14} /> : signals.isError ? <ErrorState onRetry={signals.refetch} /> :
        !signals.data?.length ? (
          <div className="pk-panel"><Empty icon={<Radio size={22} color="rgba(212,175,55,0.5)" />} text="لا توجد إشارات نشطة حالياً. يقوم المحرك بتحديثها تلقائياً." /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
            {signals.data.map(s => {
              const c = COLOR[s.signal] || COLOR.WAIT
              const conf = Math.max(0, Math.min(100, Number(s.confidence_percent) || 0))
              return (
                <div key={s.id} className="pk-panel" style={{ borderColor: c + '44', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="pk-ico" style={{ width: 40, height: 40, borderRadius: 12, background: c + '1a', borderColor: c + '55' }}>
                        {s.signal === 'SELL' ? <TrendingDown size={19} color={c} /> : <TrendingUp size={19} color={c} />}
                      </span>
                      <div>
                        <div style={{ fontWeight: 800, color: '#fff', fontFamily: 'Montserrat', fontSize: 15 }}>{s.asset}/USDT</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>{s.timeframe}</div>
                      </div>
                    </div>
                    <Pill color={c}>{SIG_AR[s.signal]}</Pill>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'Cairo', color: 'rgba(255,255,255,0.5)', marginBottom: 5 }}>
                      <span>مؤشر الثقة</span><b className="pk-mono" style={{ color: c }}>{num(s.confidence_percent, 0)}%</b>
                    </div>
                    <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                      <div style={{ width: `${conf}%`, height: '100%', background: c, borderRadius: 4, transition: 'width .6s' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <Cell k="منطقة الدخول" v={`${num(s.entry_zone_low)} – ${num(s.entry_zone_high)}`} />
                    <Cell k="وقف الخسارة" v={num(s.stop_loss)} />
                    <Cell k="الهدف 1" v={num(s.take_profit_1)} />
                    <Cell k="الهدف 2" v={num(s.take_profit_2)} />
                  </div>
                  <div style={{ fontSize: 12, fontFamily: 'Cairo', color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>المخاطرة: <b style={{ color: '#fff' }}>{RISK_AR[s.risk_level || ''] || '—'}</b></div>
                  {s.analysis_summary && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', lineHeight: 1.8, margin: '0 0 12px' }}>{s.analysis_summary}</p>}
                  <div style={{ marginTop: 'auto' }}>
                    {s.signal === 'BUY' ? (
                      <button type="button" onClick={() => openSheet(s)} className="btn-gold" style={{ width: '100%', fontSize: 13 }}>تداول هذه الإشارة</button>
                    ) : (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo' }}>التداول متاح على إشارات الشراء فقط</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cairo', lineHeight: 1.9, marginTop: 20 }}>الإشارات للاطلاع وليست نصيحة مالية. الأداء السابق لا يضمن النتائج المستقبلية.</p>

      <Sheet open={!!sel} title={sel ? `شراء ${sel.asset}/USDT` : ''} onClose={() => { setSel(null); setErr(null) }}>
        {sel && (
          <div style={{ direction: 'rtl', fontFamily: 'Cairo' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 2, marginBottom: 12 }}>
              <div>الدخول بسعر السوق الحالي (منطقة الإشارة: <b className="pk-mono">{num(sel.entry_zone_low)} – {num(sel.entry_zone_high)}</b>)</div>
              <div>وقف الخسارة <b className="pk-mono">{num(sel.stop_loss)}</b> · الهدف <b className="pk-mono">{num(sel.take_profit_1)}</b></div>
              <div>رسوم 0.1% عند الفتح و0.1% عند الإغلاق</div>
            </div>
            <label htmlFor="trade-amt" className="pk-lbl">المبلغ (USDT) — الأدنى 10</label>
            <input id="trade-amt" className="pk-input" type="text" inputMode="decimal" dir="ltr" autoComplete="off" value={amount} placeholder="0.00"
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))} />
            <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
              {[25, 50, 100].map(p => (
                <button key={p} type="button" className="pk-opt" onClick={() => setAmount(String(Math.floor(balance * p) / 100))}
                  style={{ flex: 1, padding: '8px 0', textAlign: 'center', fontSize: 12, color: '#D4AF37' }}>{p}%</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: amt > balance ? '#ef4444' : 'rgba(255,255,255,0.45)', marginBottom: 12 }}>المتاح: {num(balance, 2)} USDT</div>
            <div className="pk-note" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: 'rgba(245,158,11,0.9)', marginBottom: 12 }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 3 }} />
              <span>الإشارات ليست مضمونة وقد تخسر جزءاً أو كل المبلغ المستثمر. لا تتداول بمبلغ لا تتحمل خسارته.</span>
            </div>
            {err && <div className="pk-note" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', marginBottom: 12 }}>{err}</div>}
            <button type="button" onClick={openTrade} disabled={!amountOk || busy} className="btn-gold" style={{ width: '100%', fontSize: 14, opacity: !amountOk || busy ? 0.5 : 1 }}>
              {busy ? 'جارٍ التنفيذ...' : 'تأكيد الشراء'}
            </button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
