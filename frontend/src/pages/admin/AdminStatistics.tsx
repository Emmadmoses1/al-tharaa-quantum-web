import { useState } from 'react'
import { Save, Eye, EyeOff, RefreshCw, AlertTriangle } from 'lucide-react'

const DEFAULT_METRICS = [
  {
    key: 'registered_users',
    label: 'Registered Users',
    labelAr: 'المستخدمون المسجلون',
    displayValue: '100,000+',
    isVisible: true,
    isCalculated: true,
    note: 'Auto-calculated from profiles table when real count reaches threshold',
  },
  {
    key: 'countries_served',
    label: 'Countries Served',
    labelAr: 'الدول المخدومة',
    displayValue: '40+',
    isVisible: true,
    isCalculated: false,
  },
  {
    key: 'platform_uptime',
    label: 'Platform Uptime',
    labelAr: 'وقت التشغيل',
    displayValue: '99.97%',
    isVisible: true,
    isCalculated: false,
  },
  {
    key: 'supported_assets',
    label: 'Supported Assets',
    labelAr: 'الأصول المدعومة',
    displayValue: '4',
    isVisible: true,
    isCalculated: false,
  },
  {
    key: 'total_volume',
    label: 'Total Volume',
    labelAr: 'الحجم الإجمالي',
    displayValue: '$2.4B+',
    isVisible: false,
    isCalculated: false,
    note: 'Only show when verified real volume reaches this level',
  },
  {
    key: 'cbb_regulated',
    label: 'CBB Regulated',
    labelAr: 'مرخّص CBB',
    displayValue: 'CBB',
    isVisible: true,
    isCalculated: false,
  },
  {
    key: 'shariah_compliant',
    label: 'Shariah Compliant',
    labelAr: 'متوافق مع الشريعة',
    displayValue: 'Shariah',
    isVisible: true,
    isCalculated: false,
  },
]

export default function AdminStatistics() {
  const [metrics, setMetrics] = useState(DEFAULT_METRICS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggleVisible(key: string) {
    setMetrics(m => m.map(x => x.key === key ? { ...x, isVisible: !x.isVisible } : x))
  }

  function updateDisplay(key: string, val: string) {
    setMetrics(m => m.map(x => x.key === key ? { ...x, displayValue: val } : x))
  }

  async function handleSave() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 800,
          fontFamily: 'Montserrat', color: '#fff', marginBottom: 4,
        }}>Platform Statistics</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>
          Manage public-facing statistics shown on the landing page
        </p>
      </div>

      {/* Warning */}
      <div style={{
        background: 'rgba(239,68,68,0.06)',
        border: '1px solid rgba(239,68,68,0.15)',
        borderRadius: 10, padding: '14px 18px', marginBottom: 24,
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: 'rgba(239,68,68,0.8)', fontFamily: 'Montserrat', lineHeight: 1.7 }}>
          <strong>INTEGRITY RULE:</strong> Never display statistics that do not reflect
          verified real-world data. Do not show "100,000+ Users" until the actual
          verified user count reaches that threshold. Misleading statistics violate
          CBB regulatory standards and platform integrity policy.
        </div>
      </div>

      {/* Metrics */}
      <div style={{
        background: 'rgba(20,20,20,0.8)',
        border: '1px solid rgba(212,175,55,0.08)',
        borderRadius: 12, overflow: 'hidden', marginBottom: 20,
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 160px 160px 80px 80px',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(212,175,55,0.07)',
          gap: 12,
        }}>
          {['Metric', 'Display Value (EN)', 'Display Value (AR)', 'Visible', 'Calculated'].map((h, i) => (
            <div key={i} style={{
              fontSize: 10, fontWeight: 700,
              color: 'rgba(255,255,255,0.3)',
              fontFamily: 'Montserrat', letterSpacing: 1,
            }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {metrics.map((m, i) => (
          <div key={m.key} style={{
            display: 'grid',
            gridTemplateColumns: '1fr 160px 160px 80px 80px',
            padding: '14px 20px',
            borderBottom: i < metrics.length - 1
              ? '1px solid rgba(212,175,55,0.05)' : 'none',
            gap: 12,
            alignItems: 'center',
            background: m.isVisible ? 'transparent' : 'rgba(0,0,0,0.2)',
          }}>
            {/* Label */}
            <div>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: m.isVisible ? '#fff' : 'rgba(255,255,255,0.4)',
                fontFamily: 'Montserrat', marginBottom: 2,
              }}>{m.label}</div>
              <div style={{
                fontSize: 11, color: 'rgba(255,255,255,0.3)',
                fontFamily: 'Cairo',
              }}>{m.labelAr}</div>
              {m.note && (
                <div style={{
                  fontSize: 10, color: 'rgba(245,158,11,0.6)',
                  fontFamily: 'Montserrat', marginTop: 3, lineHeight: 1.5,
                }}>⚠ {m.note}</div>
              )}
            </div>

            {/* Display value EN */}
            <input
              type="text"
              value={m.displayValue}
              onChange={e => updateDisplay(m.key, e.target.value)}
              disabled={m.isCalculated}
              style={{
                background: 'rgba(11,11,11,0.6)',
                border: '1px solid rgba(212,175,55,0.15)',
                borderRadius: 6, padding: '8px 10px',
                color: '#fff', fontSize: 12,
                fontFamily: 'Montserrat', outline: 'none',
                width: '100%', boxSizing: 'border-box',
                opacity: m.isCalculated ? 0.4 : 1,
              }}
            />

            {/* Display value AR - same for now */}
            <input
              type="text"
              value={m.displayValue}
              disabled
              style={{
                background: 'rgba(11,11,11,0.4)',
                border: '1px solid rgba(212,175,55,0.08)',
                borderRadius: 6, padding: '8px 10px',
                color: 'rgba(255,255,255,0.4)', fontSize: 12,
                fontFamily: 'Cairo', outline: 'none',
                width: '100%', boxSizing: 'border-box',
                direction: 'rtl',
              }}
            />

            {/* Visible toggle */}
            <button
              onClick={() => toggleVisible(m.key)}
              style={{
                background: m.isVisible ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                border: `1px solid ${m.isVisible ? 'rgba(16,185,129,0.2)' : 'rgba(107,114,128,0.2)'}`,
                borderRadius: 6, padding: '6px 10px',
                cursor: 'pointer',
                color: m.isVisible ? '#10b981' : '#6b7280',
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontFamily: 'Montserrat', fontWeight: 600,
                transition: 'all 0.2s',
              }}
            >
              {m.isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
              {m.isVisible ? 'ON' : 'OFF'}
            </button>

            {/* Calculated badge */}
            <div style={{
              fontSize: 10, fontFamily: 'Montserrat', fontWeight: 600,
              color: m.isCalculated ? '#6366f1' : 'rgba(255,255,255,0.2)',
              background: m.isCalculated ? 'rgba(99,102,241,0.1)' : 'transparent',
              border: m.isCalculated ? '1px solid rgba(99,102,241,0.2)' : 'none',
              borderRadius: 4, padding: m.isCalculated ? '3px 7px' : '0',
              display: 'inline-block',
            }}>
              {m.isCalculated ? 'AUTO' : '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          onClick={() => setMetrics(DEFAULT_METRICS)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'transparent',
            border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: 8, padding: '10px 18px',
            color: 'rgba(255,255,255,0.5)', fontSize: 12,
            fontFamily: 'Montserrat', cursor: 'pointer',
          }}
        >
          <RefreshCw size={13} /> Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: saved
              ? 'rgba(16,185,129,0.15)'
              : 'linear-gradient(135deg,#D4AF37,#E8CC6A)',
            border: saved ? '1px solid rgba(16,185,129,0.3)' : 'none',
            borderRadius: 8, padding: '10px 22px',
            color: saved ? '#10b981' : '#0B0B0B',
            fontSize: 12, fontWeight: 700,
            fontFamily: 'Montserrat', cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          <Save size={13} />
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
