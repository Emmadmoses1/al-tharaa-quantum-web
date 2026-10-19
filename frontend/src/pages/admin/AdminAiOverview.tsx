import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Bot, Activity, TrendingUp, Shield, AlertTriangle, Plus } from 'lucide-react'
import { Skeleton } from '../../components/ui/Skeleton'
import { useState } from 'react'

export default function AdminAiOverview() {
  const [showAddSignal, setShowAddSignal] = useState(false)
  const [form, setForm] = useState({
    asset: 'BTC', signal: 'BUY', timeframe: '1h',
    entry_zone_low: '', entry_zone_high: '',
    stop_loss: '', take_profit_1: '',
    risk_level: 'medium', confidence_percent: '70',
    analysis_summary: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const { data: signals, refetch: refetchSignals } = useQuery({
    queryKey: ['admin-ai-signals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data || []
    },
  })

  const { data: portfolios } = useQuery({
    queryKey: ['admin-trading-portfolios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_portfolios')
        .select('ai_status, realized_pnl, total_trades, winning_trades')
      if (error) throw error
      return data || []
    },
  })

  const activeAI = (portfolios || []).filter((p: Record<string, unknown>) => p.ai_status === 'active').length
  const totalPnl = (portfolios || []).reduce((s: number, p: Record<string, unknown>) => s + Number(p.realized_pnl || 0), 0)
  const totalTrades = (portfolios || []).reduce((s: number, p: Record<string, unknown>) => s + Number(p.total_trades || 0), 0)
  const totalWins = (portfolios || []).reduce((s: number, p: Record<string, unknown>) => s + Number(p.winning_trades || 0), 0)

  async function handleAddSignal() {
    setSaving(true)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { error } = await supabase.from('ai_signals').insert({
      asset: form.asset,
      signal: form.signal,
      timeframe: form.timeframe,
      entry_zone_low: form.entry_zone_low ? Number(form.entry_zone_low) : null,
      entry_zone_high: form.entry_zone_high ? Number(form.entry_zone_high) : null,
      stop_loss: form.stop_loss ? Number(form.stop_loss) : null,
      take_profit_1: form.take_profit_1 ? Number(form.take_profit_1) : null,
      risk_level: form.risk_level,
      confidence_percent: Number(form.confidence_percent),
      analysis_summary: form.analysis_summary || null,
      is_active: true,
      expires_at: expiresAt,
    })
    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => { setSaved(false); setShowAddSignal(false) }, 1500)
      refetchSignals()
    }
  }

  async function deactivateSignal(id: string) {
    await supabase.from('ai_signals').update({ is_active: false }).eq('id', id)
    refetchSignals()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(11,11,11,0.7)',
    border: '1px solid rgba(212,175,55,0.15)', borderRadius: 8,
    padding: '10px 14px', color: '#fff', fontSize: 12,
    fontFamily: 'Montserrat', outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 10, fontWeight: 700,
    color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat',
    letterSpacing: 1, marginBottom: 7,
  }

  const SIGNAL_COLORS: Record<string, string> = {
    BUY: '#10b981', SELL: '#ef4444', HOLD: '#D4AF37', WAIT: '#9ca3af',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>
            AI Trading Overview
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>
            Monitor AI trading activity and manage signals
          </p>
        </div>
        <button onClick={() => setShowAddSignal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg,#D4AF37,#E8CC6A)',
          border: 'none', borderRadius: 8, padding: '10px 18px',
          color: '#0B0B0B', fontSize: 12, fontWeight: 700,
          fontFamily: 'Montserrat', cursor: 'pointer',
        }}>
          <Plus size={15} /> Add Signal
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }} className="ai-stats">
        {[
          { label: 'Users with AI Active', value: String(activeAI), icon: <Bot size={18} color="#10b981" />, color: '#10b981' },
          { label: 'Total AI Trades', value: String(totalTrades), icon: <Activity size={18} color="#D4AF37" />, color: '#D4AF37' },
          { label: 'Win Rate', value: totalTrades > 0 ? `${Math.round((totalWins / totalTrades) * 100)}%` : '—', icon: <TrendingUp size={18} color="#D4AF37" />, color: '#D4AF37' },
          { label: 'Total Realized P&L', value: `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} USDT`, icon: <Shield size={18} color="#6366f1" />, color: '#6366f1' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'rgba(20,20,20,0.8)',
            border: '1px solid rgba(212,175,55,0.08)',
            borderRadius: 10, padding: '16px',
          }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: `${s.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{s.icon}</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Montserrat', color: s.color, marginBottom: 4 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Warning */}
      <div style={{
        background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 11, color: 'rgba(245,158,11,0.7)', fontFamily: 'Montserrat', lineHeight: 1.7 }}>
          AI signals are for informational purposes only. Connect a live exchange/broker API before enabling automated trading.
          All signals must be clearly marked as non-guaranteed.
        </span>
      </div>

      {/* Active Signals */}
      <div style={{
        background: 'rgba(20,20,20,0.8)',
        border: '1px solid rgba(212,175,55,0.08)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '80px 60px 60px 80px 100px 100px 80px 120px 80px',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(212,175,55,0.07)', gap: 10,
        }}>
          {['Asset', 'Signal', 'TF', 'Confidence', 'Entry Low', 'Entry High', 'Stop', 'Take Profit', 'Action'].map((h, i) => (
            <div key={i} style={{
              fontSize: 9, fontWeight: 700,
              color: 'rgba(255,255,255,0.3)',
              fontFamily: 'Montserrat', letterSpacing: 1,
            }}>{h}</div>
          ))}
        </div>

        {!signals || signals.length === 0 ? (
          <div style={{
            padding: '60px 24px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <Bot size={32} color="rgba(212,175,55,0.2)" />
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat' }}>
              No active signals — add one above
            </div>
          </div>
        ) : (
          (signals as Record<string, unknown>[]).map((sig, i) => {
            const color = SIGNAL_COLORS[sig.signal as string] || '#9ca3af'
            return (
              <div key={sig.id as string} style={{
                display: 'grid',
                gridTemplateColumns: '80px 60px 60px 80px 100px 100px 80px 120px 80px',
                padding: '12px 20px',
                borderBottom: i < signals.length - 1 ? '1px solid rgba(212,175,55,0.05)' : 'none',
                gap: 10, alignItems: 'center',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat' }}>
                  {sig.asset as string}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 800, fontFamily: 'Montserrat',
                  color, background: `${color}15`,
                  padding: '3px 8px', borderRadius: 4,
                }}>
                  {sig.signal as string}
                </span>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat' }}>
                  {sig.timeframe as string}
                </div>
                <div style={{ fontSize: 11, fontFamily: 'Montserrat', color: '#fff' }}>
                  {Number(sig.confidence_percent || 0).toFixed(0)}%
                </div>
                <div style={{ fontSize: 10, fontFamily: 'Montserrat', color: 'rgba(255,255,255,0.5)' }}>
                  {sig.entry_zone_low ? Number(sig.entry_zone_low).toFixed(2) : '—'}
                </div>
                <div style={{ fontSize: 10, fontFamily: 'Montserrat', color: 'rgba(255,255,255,0.5)' }}>
                  {sig.entry_zone_high ? Number(sig.entry_zone_high).toFixed(2) : '—'}
                </div>
                <div style={{ fontSize: 10, fontFamily: 'Montserrat', color: '#ef4444' }}>
                  {sig.stop_loss ? Number(sig.stop_loss).toFixed(2) : '—'}
                </div>
                <div style={{ fontSize: 10, fontFamily: 'Montserrat', color: '#10b981' }}>
                  {sig.take_profit_1 ? Number(sig.take_profit_1).toFixed(2) : '—'}
                </div>
                <button onClick={() => deactivateSignal(sig.id as string)} style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
                  color: '#ef4444', fontSize: 10, fontFamily: 'Montserrat',
                }}>
                  Deactivate
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Add Signal Modal */}
      {showAddSignal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
          zIndex: 500, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 24, backdropFilter: 'blur(8px)',
          overflowY: 'auto',
        }}>
          <div style={{
            background: '#141414', border: '1px solid rgba(212,175,55,0.15)',
            borderRadius: 16, padding: 32, maxWidth: 540, width: '100%',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 24 }}>
              Add AI Signal
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>ASSET</label>
                  <select value={form.asset} onChange={e => setForm(f => ({ ...f, asset: e.target.value }))}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    {['BTC', 'ETH', 'USDT', 'USDC'].map(a => (
                      <option key={a} value={a} style={{ background: '#141414' }}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>SIGNAL</label>
                  <select value={form.signal} onChange={e => setForm(f => ({ ...f, signal: e.target.value }))}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    {['BUY', 'SELL', 'HOLD', 'WAIT'].map(s => (
                      <option key={s} value={s} style={{ background: '#141414' }}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>TIMEFRAME</label>
                  <select value={form.timeframe} onChange={e => setForm(f => ({ ...f, timeframe: e.target.value }))}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    {['15m', '1h', '4h', '1d'].map(t => (
                      <option key={t} value={t} style={{ background: '#141414' }}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>ENTRY ZONE LOW</label>
                  <input type="number" value={form.entry_zone_low}
                    onChange={e => setForm(f => ({ ...f, entry_zone_low: e.target.value }))}
                    style={inputStyle} placeholder="e.g. 42000" />
                </div>
                <div>
                  <label style={labelStyle}>ENTRY ZONE HIGH</label>
                  <input type="number" value={form.entry_zone_high}
                    onChange={e => setForm(f => ({ ...f, entry_zone_high: e.target.value }))}
                    style={inputStyle} placeholder="e.g. 43000" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>STOP LOSS</label>
                  <input type="number" value={form.stop_loss}
                    onChange={e => setForm(f => ({ ...f, stop_loss: e.target.value }))}
                    style={inputStyle} placeholder="e.g. 40000" />
                </div>
                <div>
                  <label style={labelStyle}>TAKE PROFIT 1</label>
                  <input type="number" value={form.take_profit_1}
                    onChange={e => setForm(f => ({ ...f, take_profit_1: e.target.value }))}
                    style={inputStyle} placeholder="e.g. 46000" />
                </div>
                <div>
                  <label style={labelStyle}>RISK LEVEL</label>
                  <select value={form.risk_level} onChange={e => setForm(f => ({ ...f, risk_level: e.target.value }))}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    {['low', 'medium', 'high', 'very_high'].map(r => (
                      <option key={r} value={r} style={{ background: '#141414' }}>{r.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>CONFIDENCE %</label>
                  <input type="number" value={form.confidence_percent} min="0" max="100"
                    onChange={e => setForm(f => ({ ...f, confidence_percent: e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>ANALYSIS SUMMARY (optional)</label>
                <textarea
                  value={form.analysis_summary}
                  onChange={e => setForm(f => ({ ...f, analysis_summary: e.target.value }))}
                  rows={2}
                  placeholder="Brief analysis summary..."
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
                />
              </div>

              <div style={{
                padding: '10px 14px',
                background: 'rgba(245,158,11,0.05)',
                border: '1px solid rgba(245,158,11,0.1)',
                borderRadius: 7, fontSize: 10,
                color: 'rgba(245,158,11,0.6)', fontFamily: 'Montserrat', lineHeight: 1.6,
              }}>
                ⚠ This signal will be shown to all users as an AI-generated signal.
                Mark as illustrative — not guaranteed. Signal expires in 24 hours.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowAddSignal(false)} style={{
                flex: 1, background: 'transparent',
                border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8,
                padding: '11px', color: '#D4AF37',
                fontSize: 12, fontFamily: 'Montserrat', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleAddSignal} disabled={saving} style={{
                flex: 1, background: saved
                  ? 'rgba(16,185,129,0.2)'
                  : 'linear-gradient(135deg,#D4AF37,#E8CC6A)',
                border: saved ? '1px solid rgba(16,185,129,0.3)' : 'none',
                borderRadius: 8, padding: '11px',
                color: saved ? '#10b981' : '#0B0B0B',
                fontSize: 12, fontWeight: 700,
                fontFamily: 'Montserrat', cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}>
                {saved ? '✓ Added!' : saving ? 'Saving...' : 'Add Signal'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width:1024px) { .ai-stats { grid-template-columns: 1fr 1fr !important; } }
      `}</style>
    </div>
  )
}
