import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Power, AlertOctagon, TrendingUp, TrendingDown, Activity, Shield, BarChart2, ChevronDown, Radio, Gauge } from 'lucide-react'
import { useTradingPortfolio, useTrades, useStrategies } from '../../hooks/useData'
import { CardSkeleton, Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { PageStyles, PageHeader, Pill, Empty } from '../../components/PageKit'

const RISK_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  conservative: { bg: 'rgba(16,185,129,0.1)', text: '#10b981', label: 'محافظ' },
  moderate: { bg: 'rgba(212,175,55,0.1)', text: '#D4AF37', label: 'متوسط' },
  aggressive: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', label: 'عدواني' },
}
const usdt = (v: unknown) => `${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`

export default function TradingPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'overview' | 'signals' | 'history'>('overview')
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null)
  const [riskLevel, setRiskLevel] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate')
  const [strategyOpen, setStrategyOpen] = useState(false)
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: portfolio, isLoading: portLoading, isError: portError, refetch: portRefetch } = useTradingPortfolio()
  const { data: trades, isLoading: tradesLoading } = useTrades()
  const { data: strategies, isLoading: stratLoading } = useStrategies()

  const isAiEnabled = portfolio?.ai_status === 'active'
  const isEmergencyStopped = portfolio?.ai_status === 'emergency_stopped'

  async function handleEmergencyStop() {
    if (!user?.id) return
    await supabase.from('trading_portfolios').update({ ai_status: 'emergency_stopped', updated_at: new Date().toISOString() }).eq('user_id', user.id)
    await supabase.from('audit_logs').insert({
      user_id: user.id, action: 'EMERGENCY_STOP', entity: 'trading_portfolio', metadata: { triggered_at: new Date().toISOString() },
    })
    qc.invalidateQueries({ queryKey: ['trading-portfolio'] })
    setShowEmergencyConfirm(false)
  }

  async function handleSaveSettings() {
    if (!user?.id || !selectedStrategy) return
    setSaving(true)
    const { error } = await supabase.from('trading_portfolios').upsert({
      user_id: user.id, ai_status: 'active', active_strategy_id: selectedStrategy, risk_level: riskLevel, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (!error) qc.invalidateQueries({ queryKey: ['trading-portfolio'] })
    setSaving(false)
  }

  const selectedStrategyObj = strategies?.find(s => s.id === selectedStrategy)
    || (portfolio?.active_strategy_id ? strategies?.find(s => s.id === portfolio.active_strategy_id) : null)

  const openTrades = (trades || []).filter(t => t.status === 'open')
  const closedTrades = (trades || []).filter(t => t.status === 'closed')
  const pnl = Number(portfolio?.realized_pnl || 0)
  const statusColor = isEmergencyStopped ? '#ef4444' : isAiEnabled ? '#10b981' : '#9ca3af'
  const statusText = isEmergencyStopped ? 'إيقاف طارئ مفعّل' : isAiEnabled ? 'نشط' : 'غير مفعّل'
  const blocked = !selectedStrategy || saving || isEmergencyStopped

  const stats = [
    { label: 'الرصيد المتاح', value: portfolio ? usdt(portfolio.available_balance) : '—', icon: <Shield size={18} color="#D4AF37" />, c: '#fff' },
    { label: 'إجمالي الصفقات', value: String(portfolio?.total_trades || 0), icon: <BarChart2 size={18} color="#D4AF37" />, c: '#fff' },
    { label: 'الربح/الخسارة المحقق', value: portfolio ? `${pnl >= 0 ? '+' : ''}${usdt(pnl)}` : '—', icon: pnl >= 0 ? <TrendingUp size={18} color="#10b981" /> : <TrendingDown size={18} color="#ef4444" />, c: pnl >= 0 ? '#10b981' : '#ef4444' },
    { label: 'أقصى تراجع', value: portfolio ? `${Number(portfolio.max_drawdown || 0).toFixed(2)}%` : '—', icon: <TrendingDown size={18} color="#ef4444" />, c: '#fff' },
  ]

  return (
    <div style={{ direction: 'rtl' }} translate="no" className="notranslate">
      <PageStyles />
      <style>{`
        .tr-two{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}
        .tr-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:13px 14px;background:rgba(44,44,44,.3);border:1px solid rgba(212,175,55,.08);border-radius:12px}
        @media (max-width:860px){.tr-two{grid-template-columns:1fr}}
      `}</style>
      <PageHeader icon={<Bot size={22} color="#D4AF37" />} title="مركز التداول الذكي" sub="إدارة التداول الآلي. الأداء السابق لا يضمن النتائج المستقبلية."
        right={!isEmergencyStopped ? (
          <button type="button" onClick={() => setShowEmergencyConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '10px 18px', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontFamily: 'Cairo', fontWeight: 700 }}>
            <AlertOctagon size={16} /> إيقاف طارئ
          </button>
        ) : <Pill color="#ef4444">تم تفعيل الإيقاف الطارئ</Pill>} />

      {showEmergencyConfirm && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(8px)' }}>
          <div className="pk-panel" style={{ padding: 30, maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <AlertOctagon size={44} color="#ef4444" style={{ margin: '0 auto 16px' }} />
            <h2 className="pk-h2" style={{ fontSize: 18, marginBottom: 10 }}>تأكيد الإيقاف الطارئ</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', lineHeight: 1.9, margin: '0 0 22px' }}>سيتوقف الذكاء الاصطناعي فوراً عن فتح صفقات جديدة. الصفقات المفتوحة حالياً ستبقى كما هي.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setShowEmergencyConfirm(false)} className="btn-outline-gold" style={{ flex: 1, fontSize: 13 }}>إلغاء</button>
              <button type="button" onClick={handleEmergencyStop} style={{ flex: 1, background: '#ef4444', border: 'none', borderRadius: 10, padding: 12, color: '#fff', fontSize: 13, fontFamily: 'Cairo', fontWeight: 700, cursor: 'pointer' }}>تأكيد الإيقاف</button>
            </div>
          </div>
        </div>
      )}

      <div className="pk-tabs">
        {([['overview', 'نظرة عامة'], ['signals', 'الإشارات'], ['history', 'سجل الصفقات']] as const).map(([k, l]) => (
          <button key={k} type="button" className={`pk-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          {portLoading ? (
            <div className="pk-tiles">{[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}</div>
          ) : portError ? <ErrorState onRetry={portRefetch} /> : (
            <div className="pk-tiles">
              {stats.map(s => (
                <div key={s.label} className="pk-tile">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <small style={{ margin: 0 }}>{s.label}</small>{s.icon}
                  </div>
                  <b style={{ color: s.c, fontSize: 17 }}>{s.value}</b>
                </div>
              ))}
            </div>
          )}

          <div className="tr-two">
            <div className="pk-panel">
              <h2 className="pk-h2">إعدادات الذكاء الاصطناعي</h2>
              <div className="tr-row" style={{ marginBottom: 16, background: statusColor + '10', borderColor: statusColor + '33' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Bot size={18} color={statusColor} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Cairo', color: '#fff' }}>التداول بالذكاء الاصطناعي</div>
                    <div style={{ fontSize: 11, fontFamily: 'Cairo', color: statusColor }}>{statusText}</div>
                  </div>
                </div>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor, boxShadow: isAiEnabled && !isEmergencyStopped ? `0 0 10px ${statusColor}` : 'none' }} />
              </div>

              <div style={{ marginBottom: 16, position: 'relative' }}>
                <span className="pk-lbl">الاستراتيجية</span>
                <button type="button" onClick={() => setStrategyOpen(!strategyOpen)} className="pk-input"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'right', cursor: 'pointer', fontFamily: 'Cairo', fontSize: 13, color: selectedStrategyObj ? '#fff' : 'rgba(255,255,255,0.35)' }}>
                  <span>{selectedStrategyObj?.description_ar || selectedStrategyObj?.name || 'اختر استراتيجية'}</span>
                  <ChevronDown size={16} color="#D4AF37" style={{ transform: strategyOpen ? 'rotate(180deg)' : 'none', transition: '.2s' }} />
                </button>
                {strategyOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4, background: '#141414', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, overflow: 'hidden', maxHeight: 240, overflowY: 'auto' }}>
                    {stratLoading ? <div style={{ padding: 16 }}><Skeleton height={20} /></div> : (strategies || []).map(s => {
                      const rc = RISK_COLORS[s.risk_level] || RISK_COLORS.moderate
                      const on = selectedStrategy === s.id || portfolio?.active_strategy_id === s.id
                      return (
                        <button key={s.id} type="button" onClick={() => { setSelectedStrategy(s.id); setStrategyOpen(false) }}
                          style={{ width: '100%', padding: '11px 14px', background: on ? 'rgba(212,175,55,0.08)' : 'transparent', border: 'none', borderBottom: '1px solid rgba(212,175,55,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div>
                            <div style={{ fontSize: 13, color: '#fff', fontFamily: 'Cairo', textAlign: 'right' }}>{s.description_ar || s.name}</div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', textAlign: 'right' }}>{s.name} • {s.timeframe}</div>
                          </div>
                          <span style={{ fontSize: 10, fontFamily: 'Cairo', fontWeight: 700, color: rc.text, background: rc.bg, padding: '2px 8px', borderRadius: 6, flexShrink: 0 }}>{rc.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 18 }}>
                <span className="pk-lbl">مستوى المخاطرة</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['conservative', 'moderate', 'aggressive'] as const).map(k => {
                    const rc = RISK_COLORS[k]
                    const on = riskLevel === k
                    return (
                      <button key={k} type="button" onClick={() => setRiskLevel(k)} style={{ flex: 1, padding: '10px 4px', cursor: 'pointer', borderRadius: 10, fontSize: 12, fontFamily: 'Cairo', fontWeight: 700, transition: 'all .2s',
                        background: on ? rc.bg : 'rgba(44,44,44,0.3)', border: `1px solid ${on ? rc.text + '66' : 'rgba(212,175,55,0.1)'}`, color: on ? rc.text : 'rgba(255,255,255,0.45)' }}>{rc.label}</button>
                    )
                  })}
                </div>
              </div>

              <button type="button" className="btn-gold" onClick={handleSaveSettings} disabled={blocked}
                style={{ width: '100%', fontSize: 13, padding: 12, opacity: blocked ? 0.5 : 1, cursor: blocked ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Power size={15} />{saving ? 'جارٍ الحفظ...' : isAiEnabled ? 'تحديث الإعدادات' : 'تفعيل التداول الذكي'}
              </button>
            </div>

            <div className="pk-panel">
              <h2 className="pk-h2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Gauge size={16} color="#D4AF37" />ملخص المحفظة</h2>
              {portfolio ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {[
                    ['مستوى المخاطرة', RISK_COLORS[portfolio.risk_level]?.label || '—'],
                    ['رأس المال المخصص', usdt(portfolio.allocated_capital)],
                    ['صفقات رابحة', `${portfolio.winning_trades} / ${portfolio.total_trades}`],
                    ['ر/خ غير محقق', usdt(portfolio.unrealized_pnl)],
                  ].map(([k, v]) => (
                    <div key={k} className="tr-row">
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo' }}>{k}</span>
                      <b className="pk-mono" style={{ fontSize: 13, color: '#D4AF37' }}>{v}</b>
                    </div>
                  ))}
                </div>
              ) : <Empty icon={<Bot size={22} color="rgba(212,175,55,0.5)" />} text="فعّل التداول الذكي لتظهر بيانات محفظتك هنا" />}
              <div className="pk-note" style={{ marginTop: 14, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)', color: 'rgba(245,158,11,0.85)' }}>
                التداول ينطوي على مخاطر وقد تخسر جزءاً من رأس المال. لا تستثمر ما لا تتحمل خسارته.
              </div>
            </div>
          </div>

          <div className="pk-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="pk-h2" style={{ margin: 0 }}>الصفقات المفتوحة</h2>
              <Pill color="#D4AF37">{openTrades.length} صفقات</Pill>
            </div>
            {openTrades.length === 0 ? (
              <Empty icon={<Activity size={22} color="rgba(212,175,55,0.5)" />} text="لا توجد صفقات مفتوحة">
                <Link to="/dashboard/signals" className="btn-outline-gold" style={{ textDecoration: 'none', fontSize: 12, padding: '8px 18px' }}>تصفح الإشارات</Link>
              </Empty>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {openTrades.map(t => {
                  const buy = t.side === 'buy'
                  const c = buy ? '#10b981' : '#ef4444'
                  return (
                    <div key={t.id} className="tr-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, fontFamily: 'Montserrat', color: c, background: c + '1a', border: `1px solid ${c}33` }}>{t.side.toUpperCase()}</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Montserrat' }}>{t.asset}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>دخول: <span className="pk-mono">{Number(t.executed_price || 0).toFixed(2)}</span></div>
                        </div>
                      </div>
                      <b className="pk-mono" style={{ fontSize: 13, color: '#D4AF37' }}>{Number(t.quantity).toFixed(4)}</b>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'signals' && (
        <div className="pk-panel">
          <Empty icon={<Radio size={24} color="rgba(212,175,55,0.6)" />} text="إشارات السوق الحية وفتح الصفقات متاحة في صفحة الإشارات. الإشارات للاطلاع وليست نصيحة مالية.">
            <Link to="/dashboard/signals" className="btn-gold" style={{ textDecoration: 'none', fontSize: 13, padding: '10px 24px' }}>فتح صفحة الإشارات</Link>
          </Empty>
        </div>
      )}

      {tab === 'history' && (
        <div className="pk-panel">
          <h2 className="pk-h2">سجل الصفقات</h2>
          {tradesLoading ? (
            <div style={{ display: 'grid', gap: 8 }}>{[1, 2, 3].map(i => <Skeleton key={i} height={58} borderRadius={12} />)}</div>
          ) : closedTrades.length === 0 ? (
            <Empty icon={<BarChart2 size={22} color="rgba(212,175,55,0.5)" />} text="لا يوجد نشاط تداول بعد" />
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {closedTrades.map(t => {
                const p = Number(t.realized_pnl || 0)
                const buy = t.side === 'buy'
                return (
                  <div key={t.id} className="tr-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Pill color={buy ? '#10b981' : '#ef4444'}>{t.side.toUpperCase()}</Pill>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Montserrat' }}>{t.asset}</span>
                    </div>
                    <b className="pk-mono" style={{ fontSize: 14, color: p >= 0 ? '#10b981' : '#ef4444' }}>{p >= 0 ? '+' : ''}{p.toFixed(4)} USDT</b>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
