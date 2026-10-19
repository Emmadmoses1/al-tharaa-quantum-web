import { useState } from 'react'
import { Shield, AlertTriangle, Save } from 'lucide-react'

export default function AdminRisk() {
  const [params, setParams] = useState({
    max_position_size_percent: 10,
    max_portfolio_exposure_percent: 50,
    max_daily_loss_percent: 5,
    max_drawdown_percent: 20,
    max_open_positions: 5,
    stop_loss_required: true,
    take_profit_required: false,
    emergency_stop_enabled: false,
    ai_trading_globally_enabled: true,
    max_single_trade_usdt: 10000,
    min_balance_to_trade_usdt: 50,
  })
  const [saved, setSaved] = useState(false)

  function setP(key: string, val: number | boolean) {
    setParams(p => ({ ...p, [key]: val }))
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(11,11,11,0.6)',
    border: '1px solid rgba(212,175,55,0.15)', borderRadius: 7,
    padding: '10px 13px', color: '#fff', fontSize: 13,
    fontFamily: 'Montserrat', outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 10, fontWeight: 700,
    color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat',
    letterSpacing: 1, marginBottom: 7,
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>
          Risk Controls
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>
          Global AI trading risk parameters — applied to all strategies
        </p>
      </div>

      {/* Critical warning */}
      <div style={{
        background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 10, padding: '16px 18px', marginBottom: 24,
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <Shield size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', fontFamily: 'Montserrat', marginBottom: 6 }}>
            CRITICAL — PRODUCTION RISK ENGINE
          </div>
          <div style={{ fontSize: 11, color: 'rgba(239,68,68,0.75)', fontFamily: 'Montserrat', lineHeight: 1.7 }}>
            These parameters control the AI trading risk engine.
            Changes take effect immediately for all users.
            The risk engine MUST be connected to production before enabling live trading.
            These settings are UI representations — wire to backend risk engine before deployment.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="risk-grid">
        {/* Position limits */}
        <div style={{
          background: 'rgba(20,20,20,0.8)',
          border: '1px solid rgba(212,175,55,0.08)',
          borderRadius: 12, padding: 24,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Montserrat', color: '#fff', marginBottom: 20 }}>
            Position & Exposure Limits
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'max_position_size_percent', label: 'MAX POSITION SIZE (%)', min: 0.5, max: 100, step: 0.5 },
              { key: 'max_portfolio_exposure_percent', label: 'MAX PORTFOLIO EXPOSURE (%)', min: 1, max: 100, step: 1 },
              { key: 'max_open_positions', label: 'MAX OPEN POSITIONS', min: 1, max: 50, step: 1 },
              { key: 'max_single_trade_usdt', label: 'MAX SINGLE TRADE (USDT)', min: 10, max: 1000000, step: 10 },
              { key: 'min_balance_to_trade_usdt', label: 'MIN BALANCE TO TRADE (USDT)', min: 1, max: 10000, step: 1 },
            ].map(field => (
              <div key={field.key}>
                <label style={labelStyle}>{field.label}</label>
                <input
                  type="number"
                  value={params[field.key as keyof typeof params] as number}
                  min={field.min} max={field.max} step={field.step}
                  onChange={e => setP(field.key, Number(e.target.value))}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(212,175,55,0.15)'}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Loss limits */}
        <div style={{
          background: 'rgba(20,20,20,0.8)',
          border: '1px solid rgba(212,175,55,0.08)',
          borderRadius: 12, padding: 24,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Montserrat', color: '#fff', marginBottom: 20 }}>
            Loss Limits & Toggles
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'max_daily_loss_percent', label: 'MAX DAILY LOSS (%)', min: 0.1, max: 100, step: 0.1 },
              { key: 'max_drawdown_percent', label: 'MAX DRAWDOWN (%)', min: 1, max: 100, step: 1 },
            ].map(field => (
              <div key={field.key}>
                <label style={labelStyle}>{field.label}</label>
                <input
                  type="number"
                  value={params[field.key as keyof typeof params] as number}
                  min={field.min} max={field.max} step={field.step}
                  onChange={e => setP(field.key, Number(e.target.value))}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(212,175,55,0.15)'}
                />
              </div>
            ))}

            <div style={{ borderTop: '1px solid rgba(212,175,55,0.07)', paddingTop: 16 }}>
              {[
                { key: 'stop_loss_required', label: 'Require Stop Loss', desc: 'All positions must have stop loss', danger: false },
                { key: 'take_profit_required', label: 'Require Take Profit', desc: 'All positions must have take profit', danger: false },
                { key: 'ai_trading_globally_enabled', label: 'AI Trading Globally Enabled', desc: 'Master switch for all AI trading', danger: false },
                { key: 'emergency_stop_enabled', label: 'GLOBAL EMERGENCY STOP', desc: 'Immediately halt all AI trading', danger: true },
              ].map(toggle => (
                <div key={toggle.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 0',
                  borderBottom: '1px solid rgba(212,175,55,0.05)',
                  gap: 16,
                }}>
                  <div>
                    <div style={{
                      fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat',
                      color: toggle.danger ? '#ef4444' : '#fff',
                    }}>
                      {toggle.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat', marginTop: 2 }}>
                      {toggle.desc}
                    </div>
                  </div>
                  <button
                    onClick={() => setP(toggle.key, !(params[toggle.key as keyof typeof params] as boolean))}
                    style={{
                      width: 42, height: 23, borderRadius: 12, flexShrink: 0,
                      background: (params[toggle.key as keyof typeof params] as boolean)
                        ? (toggle.danger ? '#ef4444' : '#10b981')
                        : 'rgba(44,44,44,0.8)',
                      border: `1px solid ${(params[toggle.key as keyof typeof params] as boolean)
                        ? (toggle.danger ? '#ef4444' : '#10b981')
                        : 'rgba(212,175,55,0.2)'}`,
                      cursor: 'pointer', position: 'relative', transition: 'all 0.3s', padding: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 2,
                      right: (params[toggle.key as keyof typeof params] as boolean) ? 2 : undefined,
                      left: (params[toggle.key as keyof typeof params] as boolean) ? undefined : 2,
                      width: 17, height: 17, borderRadius: '50%',
                      background: '#fff', transition: 'all 0.3s',
                    }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={handleSave} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: saved ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg,#D4AF37,#E8CC6A)',
          border: saved ? '1px solid rgba(16,185,129,0.3)' : 'none',
          borderRadius: 8, padding: '11px 22px',
          color: saved ? '#10b981' : '#0B0B0B',
          fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat', cursor: 'pointer',
        }}>
          <Save size={13} />
          {saved ? '✓ Saved!' : 'Save Risk Parameters'}
        </button>
      </div>

      <style>{`@media (max-width:768px) { .risk-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
