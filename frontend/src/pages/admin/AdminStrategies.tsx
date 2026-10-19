import { useState } from 'react'
import { Bot, Shield, TrendingUp, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

const STRATEGIES = [
  {
    id: '1', name: 'Quantum Momentum', nameAr: 'كوانتوم مومنتم',
    risk: 'moderate', timeframe: '1h',
    assets: ['BTC', 'ETH'],
    maxPositionSize: 5, maxDailyLoss: 3, maxOpenPositions: 3,
    stopLoss: 2.5, takeProfit: 5.0, isEnabled: false,
    description: 'Momentum-based strategy using volume and price action signals.',
  },
  {
    id: '2', name: 'Quantum Trend', nameAr: 'كوانتوم ترند',
    risk: 'moderate', timeframe: '4h',
    assets: ['BTC', 'ETH', 'USDT'],
    maxPositionSize: 8, maxDailyLoss: 4, maxOpenPositions: 2,
    stopLoss: 3.0, takeProfit: 8.0, isEnabled: false,
    description: 'Trend-following strategy using moving averages and market structure.',
  },
  {
    id: '3', name: 'Quantum Conservative', nameAr: 'كوانتوم المحافظ',
    risk: 'conservative', timeframe: '1d',
    assets: ['BTC', 'ETH'],
    maxPositionSize: 3, maxDailyLoss: 1.5, maxOpenPositions: 2,
    stopLoss: 1.5, takeProfit: 3.0, isEnabled: false,
    description: 'Low-risk strategy focused on capital preservation with minimal exposure.',
  },
  {
    id: '4', name: 'Quantum Balanced', nameAr: 'كوانتوم المتوازن',
    risk: 'moderate', timeframe: '4h',
    assets: ['BTC', 'ETH'],
    maxPositionSize: 6, maxDailyLoss: 3, maxOpenPositions: 3,
    stopLoss: 2.0, takeProfit: 6.0, isEnabled: false,
    description: 'Balanced risk-reward strategy suitable for most market conditions.',
  },
  {
    id: '5', name: 'Quantum Scalper', nameAr: 'كوانتوم سكالبر',
    risk: 'aggressive', timeframe: '15m',
    assets: ['BTC'],
    maxPositionSize: 4, maxDailyLoss: 5, maxOpenPositions: 5,
    stopLoss: 1.0, takeProfit: 2.0, isEnabled: false,
    description: 'High-frequency short-term scalping on Bitcoin with tight risk controls.',
  },
  {
    id: '6', name: 'Quantum Swing', nameAr: 'كوانتوم سوينغ',
    risk: 'moderate', timeframe: '1d',
    assets: ['BTC', 'ETH'],
    maxPositionSize: 10, maxDailyLoss: 3, maxOpenPositions: 2,
    stopLoss: 4.0, takeProfit: 12.0, isEnabled: false,
    description: 'Multi-day swing trading strategy capturing larger market movements.',
  },
  {
    id: '7', name: 'Quantum Growth', nameAr: 'كوانتوم النمو',
    risk: 'aggressive', timeframe: '4h',
    assets: ['BTC', 'ETH'],
    maxPositionSize: 12, maxDailyLoss: 6, maxOpenPositions: 4,
    stopLoss: 3.5, takeProfit: 15.0, isEnabled: false,
    description: 'Growth-focused strategy with higher risk tolerance for experienced users.',
  },
]

const RISK_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  conservative: { bg: 'rgba(16,185,129,0.1)', text: '#10b981', label: 'Conservative' },
  moderate: { bg: 'rgba(212,175,55,0.1)', text: '#D4AF37', label: 'Moderate' },
  aggressive: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', label: 'Aggressive' },
}

export default function AdminStrategies() {
  const [strategies, setStrategies] = useState(STRATEGIES)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [globalStop, setGlobalStop] = useState(false)

  function toggleEnabled(id: string) {
    if (globalStop) return
    setStrategies(s => s.map(x =>
      x.id === id ? { ...x, isEnabled: !x.isEnabled } : x
    ))
  }

  function updateParam(id: string, key: string, val: number) {
    setStrategies(s => s.map(x =>
      x.id === id ? { ...x, [key]: val } : x
    ))
  }

  const enabledCount = strategies.filter(s => s.isEnabled).length

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 24,
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{
            fontSize: 22, fontWeight: 800,
            fontFamily: 'Montserrat', color: '#fff', marginBottom: 4,
          }}>AI Strategies</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>
            Configure and manage AI trading strategies and risk parameters
          </p>
        </div>

        {/* Global emergency stop */}
        <button
          onClick={() => {
            setGlobalStop(g => !g)
            if (!globalStop) setStrategies(s => s.map(x => ({ ...x, isEnabled: false })))
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: globalStop
              ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${globalStop
              ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: 8, padding: '10px 18px',
            cursor: 'pointer', color: '#ef4444',
            fontSize: 12, fontFamily: 'Montserrat', fontWeight: 700,
            transition: 'all 0.2s',
          }}
        >
          <Shield size={15} />
          {globalStop ? '⚠ GLOBAL STOP ACTIVE' : 'Global Emergency Stop'}
        </button>
      </div>

      {/* Status bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        gap: 14, marginBottom: 24,
      }} className="strategy-stats">
        {[
          { label: 'Total Strategies', value: strategies.length.toString(), color: '#D4AF37' },
          { label: 'Enabled', value: enabledCount.toString(), color: '#10b981' },
          { label: 'Disabled', value: (strategies.length - enabledCount).toString(), color: '#6b7280' },
          { label: 'Global Status', value: globalStop ? 'STOPPED' : 'OPERATIONAL', color: globalStop ? '#ef4444' : '#10b981' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'rgba(20,20,20,0.8)',
            border: '1px solid rgba(212,175,55,0.08)',
            borderRadius: 10, padding: '16px',
          }}>
            <div style={{
              fontSize: 22, fontWeight: 800,
              fontFamily: 'Montserrat', color: s.color, marginBottom: 4,
            }}>{s.value}</div>
            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,0.4)',
              fontFamily: 'Montserrat',
            }}>{s.label}</div>
          </div>
        ))}
      </div>

      {globalStop && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10, padding: '14px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertTriangle size={16} color="#ef4444" />
          <span style={{ fontSize: 12, color: '#ef4444', fontFamily: 'Montserrat', fontWeight: 600 }}>
            GLOBAL EMERGENCY STOP ACTIVE — All strategies disabled. No new positions will be opened.
          </span>
        </div>
      )}

      {/* Strategies list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {strategies.map(s => {
          const isExpanded = expanded === s.id
          const rc = RISK_COLORS[s.risk]

          return (
            <div key={s.id} style={{
              background: 'rgba(20,20,20,0.8)',
              border: `1px solid ${s.isEnabled ? 'rgba(16,185,129,0.2)' : 'rgba(212,175,55,0.08)'}`,
              borderRadius: 12, overflow: 'hidden',
              transition: 'all 0.2s',
            }}>
              {/* Header row */}
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                cursor: 'pointer',
                gap: 12,
              }} onClick={() => setExpanded(isExpanded ? null : s.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: s.isEnabled
                      ? 'rgba(16,185,129,0.1)' : 'rgba(44,44,44,0.5)',
                    border: `1px solid ${s.isEnabled ? 'rgba(16,185,129,0.2)' : 'rgba(212,175,55,0.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Bot size={16} color={s.isEnabled ? '#10b981' : 'rgba(255,255,255,0.3)'} />
                  </div>
                  <div>
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      color: '#fff', fontFamily: 'Montserrat', marginBottom: 2,
                    }}>{s.name}</div>
                    <div style={{
                      fontSize: 12, color: 'rgba(255,255,255,0.35)',
                      fontFamily: 'Cairo',
                    }}>{s.nameAr} • {s.timeframe} • {s.assets.join(', ')}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    fontFamily: 'Montserrat',
                    color: rc.text, background: rc.bg,
                    padding: '3px 8px', borderRadius: 4,
                  }}>{rc.label.toUpperCase()}</span>

                  {/* Enable toggle */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleEnabled(s.id) }}
                    disabled={globalStop}
                    style={{
                      width: 44, height: 24, borderRadius: 12,
                      background: s.isEnabled ? '#10b981' : 'rgba(44,44,44,0.8)',
                      border: `1px solid ${s.isEnabled ? '#10b981' : 'rgba(212,175,55,0.2)'}`,
                      cursor: globalStop ? 'not-allowed' : 'pointer',
                      position: 'relative', transition: 'all 0.3s', padding: 0,
                      opacity: globalStop ? 0.4 : 1,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 2,
                      right: s.isEnabled ? 2 : undefined,
                      left: s.isEnabled ? undefined : 2,
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#fff', transition: 'all 0.3s',
                    }} />
                  </button>

                  {isExpanded
                    ? <ChevronUp size={16} color="rgba(255,255,255,0.4)" />
                    : <ChevronDown size={16} color="rgba(255,255,255,0.4)" />
                  }
                </div>
              </div>

              {/* Expanded params */}
              {isExpanded && (
                <div style={{
                  padding: '0 20px 20px',
                  borderTop: '1px solid rgba(212,175,55,0.07)',
                }}>
                  <p style={{
                    fontSize: 12, color: 'rgba(255,255,255,0.4)',
                    fontFamily: 'Montserrat', lineHeight: 1.6,
                    margin: '14px 0',
                  }}>{s.description}</p>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3,1fr)',
                    gap: 12,
                  }} className="params-grid">
                    {[
                      { key: 'maxPositionSize', label: 'Max Position Size %', value: s.maxPositionSize, step: 0.5 },
                      { key: 'maxDailyLoss', label: 'Max Daily Loss %', value: s.maxDailyLoss, step: 0.5 },
                      { key: 'maxOpenPositions', label: 'Max Open Positions', value: s.maxOpenPositions, step: 1 },
                      { key: 'stopLoss', label: 'Stop Loss %', value: s.stopLoss, step: 0.1 },
                      { key: 'takeProfit', label: 'Take Profit %', value: s.takeProfit, step: 0.5 },
                    ].map(param => (
                      <div key={param.key}>
                        <label style={{
                          display: 'block', fontSize: 10, fontWeight: 700,
                          color: 'rgba(255,255,255,0.35)',
                          fontFamily: 'Montserrat', letterSpacing: 1, marginBottom: 7,
                        }}>{param.label.toUpperCase()}</label>
                        <input
                          type="number"
                          value={param.value}
                          step={param.step}
                          min={0}
                          onChange={e => updateParam(s.id, param.key, parseFloat(e.target.value))}
                          style={{
                            width: '100%',
                            background: 'rgba(11,11,11,0.6)',
                            border: '1px solid rgba(212,175,55,0.15)',
                            borderRadius: 6, padding: '9px 12px',
                            color: '#fff', fontSize: 13,
                            fontFamily: 'Montserrat', outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div style={{
                    marginTop: 14,
                    padding: '10px 14px',
                    background: 'rgba(245,158,11,0.05)',
                    border: '1px solid rgba(245,158,11,0.1)',
                    borderRadius: 8,
                  }}>
                    <div style={{
                      fontSize: 10, color: 'rgba(245,158,11,0.6)',
                      fontFamily: 'Montserrat', lineHeight: 1.6,
                    }}>
                      ⚠ Connect a live exchange/broker API before enabling any strategy.
                      Risk parameters are enforced server-side. Changes here require
                      backend restart to take effect in production.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style>{`
        @media (max-width: 1024px) { .strategy-stats { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 640px) {
          .strategy-stats { grid-template-columns: 1fr 1fr !important; }
          .params-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  )
}
