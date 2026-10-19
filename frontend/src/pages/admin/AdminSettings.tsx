import { useState } from 'react'
import { Save, AlertTriangle, Globe, Shield, Bell, Database } from 'lucide-react'

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    platformName: 'Al Tharaa Quantum',
    platformNameAr: 'الثراء كوانتوم',
    supportEmail: 'support@altharaaquantum.com',
    minDepositUSDT: '50',
    minWithdrawalUSDT: '20',
    withdrawalFeePercent: '0.1',
    investmentFeePercent: '1.5',
    maintenanceMode: false,
    registrationOpen: true,
    kycRequired: true,
    twoFactorRequired: false,
    emailNotifications: true,
    pushNotifications: false,
    maxLoginAttempts: '5',
    sessionTimeoutMinutes: '60',
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState('general')

  function setS(key: string, val: string | boolean) {
    setSettings(s => ({ ...s, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 700))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(11,11,11,0.6)',
    border: '1px solid rgba(212,175,55,0.15)', borderRadius: 7,
    padding: '10px 13px', color: '#fff', fontSize: 12,
    fontFamily: 'Montserrat', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 10, fontWeight: 700,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Montserrat', letterSpacing: 1, marginBottom: 7,
  }

  const sections = [
    { key: 'general', label: 'General', icon: <Globe size={14} /> },
    { key: 'security', label: 'Security', icon: <Shield size={14} /> },
    { key: 'fees', label: 'Fees & Limits', icon: <Database size={14} /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 800,
          fontFamily: 'Montserrat', color: '#fff', marginBottom: 4,
        }}>Platform Settings</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>
          Global configuration for Al Tharaa Quantum
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }} className="settings-grid">
        {/* Sidebar */}
        <div style={{
          background: 'rgba(20,20,20,0.8)',
          border: '1px solid rgba(212,175,55,0.08)',
          borderRadius: 12, padding: '12px 0',
          height: 'fit-content',
        }}>
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              style={{
                width: '100%', background: activeSection === s.key
                  ? 'rgba(212,175,55,0.08)' : 'transparent',
                border: 'none',
                borderLeft: `2px solid ${activeSection === s.key ? '#D4AF37' : 'transparent'}`,
                padding: '10px 16px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 9,
                color: activeSection === s.key
                  ? '#D4AF37' : 'rgba(255,255,255,0.45)',
                fontSize: 12, fontFamily: 'Montserrat',
                fontWeight: activeSection === s.key ? 600 : 400,
                transition: 'all 0.15s', textAlign: 'left',
              }}
            >
              {s.icon}{s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          background: 'rgba(20,20,20,0.8)',
          border: '1px solid rgba(212,175,55,0.08)',
          borderRadius: 12, padding: '24px',
        }}>
          {/* General */}
          {activeSection === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{
                fontSize: 14, fontWeight: 700,
                fontFamily: 'Montserrat', color: '#fff', marginBottom: 4,
              }}>General Settings</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>PLATFORM NAME (EN)</label>
                  <input type="text" value={settings.platformName}
                    onChange={e => setS('platformName', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>PLATFORM NAME (AR)</label>
                  <input type="text" value={settings.platformNameAr}
                    onChange={e => setS('platformNameAr', e.target.value)}
                    style={{ ...inputStyle, direction: 'rtl', fontFamily: 'Cairo' }} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>SUPPORT EMAIL</label>
                <input type="email" value={settings.supportEmail}
                  onChange={e => setS('supportEmail', e.target.value)}
                  style={{ ...inputStyle, direction: 'ltr' }} />
              </div>

              <div style={{ borderTop: '1px solid rgba(212,175,55,0.07)', paddingTop: 18 }}>
                <h3 style={{
                  fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
                  fontFamily: 'Montserrat', marginBottom: 14,
                }}>PLATFORM MODE</h3>

                {[
                  { key: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Take platform offline for maintenance', danger: true },
                  { key: 'registrationOpen', label: 'Registration Open', desc: 'Allow new user registrations', danger: false },
                  { key: 'kycRequired', label: 'KYC Required', desc: 'Require KYC before deposits/withdrawals', danger: false },
                ].map(item => (
                  <div key={item.key} style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: '1px solid rgba(212,175,55,0.05)',
                    gap: 16,
                  }}>
                    <div>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: '#fff',
                        fontFamily: 'Montserrat', marginBottom: 3,
                      }}>{item.label}</div>
                      <div style={{
                        fontSize: 11, color: 'rgba(255,255,255,0.35)',
                        fontFamily: 'Montserrat',
                      }}>{item.desc}</div>
                    </div>
                    <SettingToggle
                      value={settings[item.key as keyof typeof settings] as boolean}
                      onChange={v => setS(item.key, v)}
                      danger={item.danger}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security */}
          {activeSection === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{
                fontSize: 14, fontWeight: 700,
                fontFamily: 'Montserrat', color: '#fff', marginBottom: 4,
              }}>Security Settings</h2>

              <div>
                <div style={{
                  background: 'rgba(245,158,11,0.06)',
                  border: '1px solid rgba(245,158,11,0.12)',
                  borderRadius: 8, padding: '12px 14px', marginBottom: 18,
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                  <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{
                    fontSize: 11, color: 'rgba(245,158,11,0.7)',
                    fontFamily: 'Montserrat', lineHeight: 1.6,
                  }}>
                    Security changes take effect immediately. Changing session timeout
                    will log out active users.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                  <div>
                    <label style={labelStyle}>MAX LOGIN ATTEMPTS</label>
                    <input type="number" value={settings.maxLoginAttempts} min="3" max="10"
                      onChange={e => setS('maxLoginAttempts', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>SESSION TIMEOUT (MINUTES)</label>
                    <input type="number" value={settings.sessionTimeoutMinutes} min="15"
                      onChange={e => setS('sessionTimeoutMinutes', e.target.value)} style={inputStyle} />
                  </div>
                </div>

                {[
                  { key: 'twoFactorRequired', label: 'Require 2FA for All Users', desc: 'Force all users to enable two-factor authentication', danger: false },
                ].map(item => (
                  <div key={item.key} style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 0', gap: 16,
                  }}>
                    <div>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: '#fff',
                        fontFamily: 'Montserrat', marginBottom: 3,
                      }}>{item.label}</div>
                      <div style={{
                        fontSize: 11, color: 'rgba(255,255,255,0.35)',
                        fontFamily: 'Montserrat',
                      }}>{item.desc}</div>
                    </div>
                    <SettingToggle
                      value={settings[item.key as keyof typeof settings] as boolean}
                      onChange={v => setS(item.key, v)}
                      danger={item.danger}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fees */}
          {activeSection === 'fees' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{
                fontSize: 14, fontWeight: 700,
                fontFamily: 'Montserrat', color: '#fff', marginBottom: 4,
              }}>Fees & Limits</h2>

              <div style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.12)',
                borderRadius: 8, padding: '12px 14px', marginBottom: 4,
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <AlertTriangle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{
                  fontSize: 11, color: 'rgba(239,68,68,0.7)',
                  fontFamily: 'Montserrat', lineHeight: 1.6,
                }}>
                  Fee changes must be reflected in user-facing disclosures before taking effect.
                  Never retroactively apply new fees to existing transactions.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { key: 'minDepositUSDT', label: 'MIN DEPOSIT (USDT)', type: 'number' },
                  { key: 'minWithdrawalUSDT', label: 'MIN WITHDRAWAL (USDT)', type: 'number' },
                  { key: 'withdrawalFeePercent', label: 'WITHDRAWAL FEE %', type: 'number' },
                  { key: 'investmentFeePercent', label: 'INVESTMENT FEE %', type: 'number' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={labelStyle}>{field.label}</label>
                    <input
                      type={field.type}
                      value={settings[field.key as keyof typeof settings] as string}
                      onChange={e => setS(field.key, e.target.value)}
                      style={inputStyle}
                      step="0.01" min="0"
                      onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(212,175,55,0.15)'}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeSection === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{
                fontSize: 14, fontWeight: 700,
                fontFamily: 'Montserrat', color: '#fff', marginBottom: 4,
              }}>Notification Settings</h2>

              {[
                { key: 'emailNotifications', label: 'Email Notifications', desc: 'Send transactional emails to users' },
                { key: 'pushNotifications', label: 'Push Notifications', desc: 'Send push notifications via Firebase' },
              ].map(item => (
                <div key={item.key} style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: '1px solid rgba(212,175,55,0.06)',
                  gap: 16,
                }}>
                  <div>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: '#fff',
                      fontFamily: 'Montserrat', marginBottom: 3,
                    }}>{item.label}</div>
                    <div style={{
                      fontSize: 11, color: 'rgba(255,255,255,0.35)',
                      fontFamily: 'Montserrat',
                    }}>{item.desc}</div>
                  </div>
                  <SettingToggle
                    value={settings[item.key as keyof typeof settings] as boolean}
                    onChange={v => setS(item.key, v)}
                    danger={false}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Save button */}
          <div style={{
            marginTop: 24, paddingTop: 20,
            borderTop: '1px solid rgba(212,175,55,0.07)',
            display: 'flex', justifyContent: 'flex-end',
          }}>
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
              {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .settings-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function SettingToggle({
  value, onChange, danger,
}: {
  value: boolean; onChange: (v: boolean) => void; danger: boolean
}) {
  const onColor = danger ? '#ef4444' : '#10b981'
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, flexShrink: 0,
        background: value ? onColor : 'rgba(44,44,44,0.8)',
        border: `1px solid ${value ? onColor : 'rgba(212,175,55,0.2)'}`,
        cursor: 'pointer', position: 'relative',
        transition: 'all 0.3s', padding: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2,
        right: value ? 2 : undefined,
        left: value ? undefined : 2,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'all 0.3s',
      }} />
    </button>
  )
}
