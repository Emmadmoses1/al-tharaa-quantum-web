import { useState } from 'react'
import {
  Bot, Power, AlertOctagon, TrendingUp, TrendingDown,
  Activity, Shield, BarChart2, ChevronDown,
} from 'lucide-react'
import {
  useTradingPortfolio, useTrades, useStrategies,
} from '../../hooks/useData'
import { CardSkeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useQueryClient } from '@tanstack/react-query'

const RISK_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  conservative: { bg: 'rgba(16,185,129,0.1)', text: '#10b981', label: 'محافظ' },
  moderate: { bg: 'rgba(212,175,55,0.1)', text: '#D4AF37', label: 'متوسط' },
  aggressive: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', label: 'عدواني' },
}

function SystemHealthItem({ label, status }: { label: string; status: 'online' | 'offline' | 'unknown' }) {
  const colors = { online: '#10b981', offline: '#ef4444', unknown: '#6b7280' }
  const labels = { online: 'متصل', offline: 'غير متصل', unknown: 'غير معروف' }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid rgba(212,175,55,0.06)',
    }}>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo' }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: colors[status],
          boxShadow: status === 'online' ? `0 0 8px ${colors[status]}` : 'none',
        }} />
        <span style={{ fontSize: 12, color: colors[status], fontFamily: 'Montserrat', fontWeight: 600 }}>
          {labels[status]}
        </span>
      </div>
    </div>
  )
}

export default function TradingPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'signals' | 'history'>('overview')
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null)
  const [riskLevel, setRiskLevel] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate')
  const [strategyOpen, setStrategyOpen] = useState(false)
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  const {
    data: portfolio,
    isLoading: portLoading,
    isError: portError,
    refetch: portRefetch,
  } = useTradingPortfolio()

  const { data: trades, isLoading: tradesLoading } = useTrades()
  const { data: strategies, isLoading: stratLoading } = useStrategies()

  const isAiEnabled = portfolio?.ai_status === 'active'
  const isEmergencyStopped = portfolio?.ai_status === 'emergency_stopped'

  async function handleEmergencyStop() {
    if (!user?.id) return
    await supabase.from('trading_portfolios').update({
      ai_status: 'emergency_stopped',
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id)
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'EMERGENCY_STOP',
      entity: 'trading_portfolio',
      metadata: { triggered_at: new Date().toISOString() },
    })
    qc.invalidateQueries({ queryKey: ['trading-portfolio'] })
    setShowEmergencyConfirm(false)
  }

  async function handleSaveSettings() {
    if (!user?.id || !selectedStrategy) return
    setSaving(true)
    const { error: portfolioErr } = await supabase
      .from('trading_portfolios')
      .upsert({
        user_id: user.id,
        ai_status: 'active',
        active_strategy_id: selectedStrategy,
        risk_level: riskLevel,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (!portfolioErr) {
      qc.invalidateQueries({ queryKey: ['trading-portfolio'] })
    }
    setSaving(false)
  }

  const selectedStrategyObj = strategies?.find(s => s.id === selectedStrategy)
    || (portfolio?.active_strategy_id
      ? strategies?.find(s => s.id === portfolio.active_strategy_id)
      : null)

  const openTrades = (trades || []).filter(t => t.status === 'open')
  const closedTrades = (trades || []).filter(t => t.status === 'closed')

  return (
    <div style={{ direction: 'rtl' }}>
      {/* Header */}
      <div style={{
        marginBottom: 28,
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}>
            مركز التداول بالذكاء الاصطناعي
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo' }}>
            إدارة استراتيجيات التداول الآلي — الأداء السابق لا يضمن المستقبل
          </p>
        </div>

        {!isEmergencyStopped ? (
          <button
            onClick={() => setShowEmergencyConfirm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px 18px',
              cursor: 'pointer', color: '#ef4444',
              fontSize: 13, fontFamily: 'Cairo', fontWeight: 600,
            }}
          >
            <AlertOctagon size={16} /> إيقاف طارئ
          </button>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8, padding: '10px 18px',
            color: '#ef4444', fontSize: 13, fontFamily: 'Cairo',
          }}>
            <AlertOctagon size={16} /> تم تفعيل الإيقاف الطارئ
          </div>
        )}
      </div>

      {/* Emergency confirm modal */}
      {showEmergencyConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          zIndex: 1000, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 24, backdropFilter: 'blur(8px)',
        }}>
          <div className="glass-card" style={{ padding: 32, maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <AlertOctagon size={44} color="#ef4444" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 10 }}>
              تأكيد الإيقاف الطارئ
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', lineHeight: 1.8, marginBottom: 24 }}>
              سيتوقف الذكاء الاصطناعي فوراً عن فتح صفقات جديدة.
              الصفقات المفتوحة حالياً ستبقى كما هي.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowEmergencyConfirm(false)}
                className="btn-outline-gold" style={{ flex: 1, fontSize: 13 }}>
                إلغاء
              </button>
              <button onClick={handleEmergencyStop} style={{
                flex: 1, background: '#ef4444', border: 'none',
                borderRadius: 8, padding: '12px', color: '#fff',
                fontSize: 13, fontFamily: 'Cairo', fontWeight: 700, cursor: 'pointer',
              }}>
                تأكيد الإيقاف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 24,
        borderBottom: '1px solid rgba(212,175,55,0.1)',
      }}>
        {[
          { key: 'overview', label: 'نظرة عامة' },
          { key: 'signals', label: 'إشارات الذكاء الاصطناعي' },
          { key: 'history', label: 'سجل الصفقات' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            style={{
              background: 'none', border: 'none',
              borderBottom: `2px solid ${activeTab === tab.key ? '#D4AF37' : 'transparent'}`,
              padding: '12px 20px', cursor: 'pointer',
              color: activeTab === tab.key ? '#D4AF37' : 'rgba(255,255,255,0.45)',
              fontSize: 14, fontFamily: 'Cairo',
              fontWeight: activeTab === tab.key ? 700 : 400,
              transition: 'all 0.2s', marginBottom: -1,
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stats */}
          {portLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
              {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : portError ? (
            <ErrorState onRetry={portRefetch} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }} className="trade-stats">
              {[
                {
                  label: 'الرصيد المتاح',
                  value: portfolio ? `USDT ${Number(portfolio.available_balance).toFixed(2)}` : '—',
                  icon: <Shield size={18} color="#D4AF37" />,
                },
                {
                  label: 'إجمالي الصفقات',
                  value: String(portfolio?.total_trades || 0),
                  icon: <BarChart2 size={18} color="#D4AF37" />,
                },
                {
                  label: 'الربح/الخسارة المحقق',
                  value: portfolio ? `USDT ${Number(portfolio.realized_pnl).toFixed(2)}` : '—',
                  icon: <TrendingUp size={18} color="#10b981" />,
                },
                {
                  label: 'أقصى تراجع',
                  value: portfolio ? `${Number(portfolio.max_drawdown).toFixed(2)}%` : '—',
                  icon: <TrendingDown size={18} color="#ef4444" />,
                },
              ].map((s, i) => (
                <div key={i} className="glass-card" style={{ padding: 20 }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'rgba(212,175,55,0.08)',
                      border: '1px solid rgba(212,175,55,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{s.icon}</div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="trade-two-col">
            {/* AI Controls */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', marginBottom: 20 }}>
                إعدادات الذكاء الاصطناعي
              </h2>

              {/* Status */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 10, marginBottom: 16,
                background: isAiEnabled ? 'rgba(16,185,129,0.08)' : 'rgba(44,44,44,0.3)',
                border: `1px solid ${isAiEnabled ? 'rgba(16,185,129,0.2)' : 'rgba(212,175,55,0.1)'}`,
                transition: 'all 0.3s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Bot size={18} color={isAiEnabled ? '#10b981' : 'rgba(255,255,255,0.4)'} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Cairo', color: '#fff' }}>
                      التداول بالذكاء الاصطناعي
                    </div>
                    <div style={{
                      fontSize: 11, fontFamily: 'Cairo',
                      color: isEmergencyStopped ? '#ef4444'
                        : isAiEnabled ? '#10b981' : 'rgba(255,255,255,0.35)',
                    }}>
                      {isEmergencyStopped ? 'إيقاف طارئ مفعّل'
                        : isAiEnabled ? 'نشط' : 'غير مفعّل'}
                    </div>
                  </div>
                </div>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: isEmergencyStopped ? '#ef4444'
                    : isAiEnabled ? '#10b981' : '#6b7280',
                  boxShadow: isAiEnabled && !isEmergencyStopped
                    ? '0 0 10px #10b981' : 'none',
                }} />
              </div>

              {/* Strategy selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block', fontSize: 12,
                  color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', marginBottom: 8,
                }}>الاستراتيجية</label>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setStrategyOpen(!strategyOpen)}
                    style={{
                      width: '100%', background: 'rgba(11,11,11,0.5)',
                      border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8,
                      padding: '11px 14px', color: selectedStrategyObj ? '#fff' : 'rgba(255,255,255,0.3)',
                      fontSize: 13, fontFamily: 'Cairo', cursor: 'pointer',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', textAlign: 'right',
                    }}
                  >
                    <span>{selectedStrategyObj?.description_ar || selectedStrategyObj?.name || 'اختر استراتيجية'}</span>
                    <ChevronDown size={16} color="#D4AF37" style={{
                      transform: strategyOpen ? 'rotate(180deg)' : 'none',
                      transition: '0.2s',
                    }} />
                  </button>

                  {strategyOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      zIndex: 50, marginTop: 4,
                      background: '#141414',
                      border: '1px solid rgba(212,175,55,0.2)',
                      borderRadius: 8, overflow: 'hidden',
                      maxHeight: 240, overflowY: 'auto',
                    }}>
                      {stratLoading ? (
                        <div style={{ padding: 16, fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', textAlign: 'center' }}>
                          جارٍ التحميل...
                        </div>
                      ) : (
                        (strategies || []).map(s => {
                          const rc = RISK_COLORS[s.risk_level] || RISK_COLORS.moderate
                          return (
                            <button
                              key={s.id}
                              onClick={() => { setSelectedStrategy(s.id); setStrategyOpen(false) }}
                              style={{
                                width: '100%', padding: '10px 14px',
                                background: selectedStrategy === s.id || portfolio?.active_strategy_id === s.id
                                  ? 'rgba(212,175,55,0.08)' : 'transparent',
                                border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between',
                                borderBottom: '1px solid rgba(212,175,55,0.06)',
                              }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.05)'}
                              onMouseLeave={e => {
                                if (selectedStrategy !== s.id)
                                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                              }}
                            >
                              <div>
                                <div style={{ fontSize: 13, color: '#fff', fontFamily: 'Cairo', textAlign: 'right' }}>
                                  {s.description_ar || s.name}
                                </div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', textAlign: 'right' }}>
                                  {s.name} • {s.timeframe}
                                </div>
                              </div>
                              <span style={{
                                fontSize: 9, fontFamily: 'Cairo', fontWeight: 600,
                                color: rc.text, background: rc.bg,
                                padding: '2px 7px', borderRadius: 4,
                                flexShrink: 0,
                              }}>
                                {rc.label}
                              </span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Risk */}
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block', fontSize: 12,
                  color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', marginBottom: 8,
                }}>مستوى المخاطرة</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { key: 'conservative', label: 'محافظ' },
                    { key: 'moderate', label: 'متوسط' },
                    { key: 'aggressive', label: 'عدواني' },
                  ].map(r => {
                    const rc = RISK_COLORS[r.key]
                    return (
                      <button
                        key={r.key}
                        onClick={() => setRiskLevel(r.key as typeof riskLevel)}
                        style={{
                          flex: 1, padding: '8px 4px',
                          background: riskLevel === r.key ? rc.bg : 'rgba(44,44,44,0.3)',
                          border: `1px solid ${riskLevel === r.key ? rc.text + '50' : 'rgba(212,175,55,0.1)'}`,
                          borderRadius: 7, cursor: 'pointer',
                          color: riskLevel === r.key ? rc.text : 'rgba(255,255,255,0.4)',
                          fontSize: 11, fontFamily: 'Cairo', fontWeight: 600,
                          transition: 'all 0.2s',
                        }}
                      >{r.label}</button>
                    )
                  })}
                </div>
              </div>

              <button
                className="btn-gold"
                onClick={handleSaveSettings}
                disabled={!selectedStrategy || saving || isEmergencyStopped}
                style={{
                  width: '100%', fontSize: 13, padding: '12px',
                  opacity: (!selectedStrategy || saving || isEmergencyStopped) ? 0.5 : 1,
                  cursor: (!selectedStrategy || saving || isEmergencyStopped) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Power size={15} />
                {saving ? 'جارٍ الحفظ...'
                  : isAiEnabled ? 'تحديث الإعدادات' : 'تفعيل التداول الذكي'}
              </button>
            </div>

            {/* System health */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', marginBottom: 20 }}>
                حالة النظام
              </h2>
              <SystemHealthItem label="بيانات السوق" status="unknown" />
              <SystemHealthItem label="محرك الذكاء الاصطناعي" status="unknown" />
              <SystemHealthItem label="منفذ الأوامر" status="unknown" />
              <SystemHealthItem label="قاعدة البيانات" status="online" />
              <SystemHealthItem label="محرك إدارة المخاطر" status="unknown" />

              <div style={{
                marginTop: 16, padding: '10px 14px',
                background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.12)',
                borderRadius: 8,
              }}>
                <p style={{ fontSize: 11, color: 'rgba(245,158,11,0.7)', fontFamily: 'Cairo', lineHeight: 1.7, margin: 0 }}>
                  يتطلب التداول الفعلي ربط مزود بيانات السوق ومنفذ الصرف من لوحة الإدارة.
                </p>
              </div>

              {/* Portfolio summary if available */}
              {portfolio && (
                <div style={{ marginTop: 16, borderTop: '1px solid rgba(212,175,55,0.08)', paddingTop: 16 }}>
                  {[
                    { label: 'الرأس المال المخصص', value: `USDT ${Number(portfolio.allocated_capital).toFixed(2)}` },
                    { label: 'صفقات رابحة', value: `${portfolio.winning_trades} / ${portfolio.total_trades}` },
                    { label: 'ر/خ غير محقق', value: `USDT ${Number(portfolio.unrealized_pnl).toFixed(2)}` },
                  ].map((row, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: i < 2 ? '1px solid rgba(212,175,55,0.06)' : 'none',
                    }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>{row.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#D4AF37', fontFamily: 'Montserrat' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Open positions */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 20,
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff' }}>
                الصفقات المفتوحة
              </h2>
              <div style={{
                background: 'rgba(44,44,44,0.4)',
                border: '1px solid rgba(212,175,55,0.1)',
                borderRadius: 6, padding: '4px 10px',
                fontSize: 11, color: 'rgba(255,255,255,0.4)',
                fontFamily: 'Montserrat',
              }}>
                {openTrades.length} صفقات
              </div>
            </div>
            {openTrades.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '48px 24px', gap: 12, textAlign: 'center',
              }}>
                <div style={{
                  width: 52, height: 52,
                  background: 'rgba(212,175,55,0.05)',
                  border: '1px solid rgba(212,175,55,0.1)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Activity size={22} color="rgba(212,175,55,0.3)" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo' }}>
                  لا توجد صفقات مفتوحة
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {openTrades.map(trade => (
                  <div key={trade.id} style={{
                    padding: '14px 16px',
                    background: 'rgba(44,44,44,0.3)',
                    border: '1px solid rgba(212,175,55,0.08)',
                    borderRadius: 10,
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: trade.side === 'buy'
                          ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${trade.side === 'buy' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700,
                        color: trade.side === 'buy' ? '#10b981' : '#ef4444',
                        fontFamily: 'Montserrat',
                      }}>
                        {trade.side.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Montserrat' }}>
                          {trade.asset}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat' }}>
                          دخول: {Number(trade.executed_price || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat' }}>
                        {Number(trade.quantity).toFixed(4)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Signals */}
      {activeTab === 'signals' && (
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}>
            إشارات الذكاء الاصطناعي
          </h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo', marginBottom: 24 }}>
            الإشارات للاطلاع فقط — ليست نصيحة مالية
          </p>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '48px 24px', gap: 12, textAlign: 'center',
          }}>
            <div style={{
              width: 52, height: 52,
              background: 'rgba(212,175,55,0.05)',
              border: '1px solid rgba(212,175,55,0.1)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BarChart2 size={22} color="rgba(212,175,55,0.3)" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo' }}>
              لا توجد إشارات نشطة
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cairo', maxWidth: 280 }}>
              إشارات الذكاء الاصطناعي تظهر هنا عند توفر بيانات السوق
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', marginBottom: 20 }}>
            سجل الصفقات
          </h2>
          {tradesLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  height: 60, background: 'rgba(44,44,44,0.3)',
                  borderRadius: 10, animation: 'shimmer 1.5s infinite',
                }} />
              ))}
            </div>
          ) : closedTrades.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '48px 24px', gap: 12, textAlign: 'center',
            }}>
              <div style={{
                width: 52, height: 52,
                background: 'rgba(212,175,55,0.05)',
                border: '1px solid rgba(212,175,55,0.1)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BarChart2 size={22} color="rgba(212,175,55,0.3)" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo' }}>
                لا يوجد نشاط تداول بعد
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {closedTrades.map(trade => (
                <div key={trade.id} style={{
                  padding: '14px 16px',
                  background: 'rgba(44,44,44,0.3)',
                  border: '1px solid rgba(212,175,55,0.08)',
                  borderRadius: 10,
                  display: 'flex', justifyContent: 'space-between', gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: trade.side === 'buy' ? '#10b981' : '#ef4444',
                      background: trade.side === 'buy'
                        ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      padding: '3px 8px', borderRadius: 4, fontFamily: 'Montserrat',
                    }}>
                      {trade.side.toUpperCase()}
                    </span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Montserrat' }}>
                      {trade.asset}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, fontFamily: 'Montserrat',
                    color: (trade.realized_pnl || 0) >= 0 ? '#10b981' : '#ef4444',
                  }}>
                    {(trade.realized_pnl || 0) >= 0 ? '+' : ''}
                    {Number(trade.realized_pnl || 0).toFixed(4)} USDT
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @media (max-width:1024px) { .trade-stats{grid-template-columns:1fr 1fr !important;} }
        @media (max-width:768px) {
          .trade-stats{grid-template-columns:1fr 1fr !important;}
          .trade-two-col{grid-template-columns:1fr !important;}
        }
      `}</style>
    </div>
  )
}
