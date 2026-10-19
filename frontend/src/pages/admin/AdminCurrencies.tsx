import { useState } from 'react'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

const INITIAL_CURRENCIES = [
  { code: 'BHD', name: 'Bahraini Dinar', nameAr: 'دينار بحريني', symbol: 'BD', decimals: 3, active: true, isDefault: true },
  { code: 'USD', name: 'US Dollar', nameAr: 'دولار أمريكي', symbol: '$', decimals: 2, active: true, isDefault: false },
  { code: 'EUR', name: 'Euro', nameAr: 'يورو', symbol: '€', decimals: 2, active: true, isDefault: false },
  { code: 'GBP', name: 'British Pound', nameAr: 'جنيه إسترليني', symbol: '£', decimals: 2, active: true, isDefault: false },
  { code: 'SAR', name: 'Saudi Riyal', nameAr: 'ريال سعودي', symbol: 'SR', decimals: 2, active: true, isDefault: false },
  { code: 'AED', name: 'UAE Dirham', nameAr: 'درهم إماراتي', symbol: 'AED', decimals: 2, active: true, isDefault: false },
  { code: 'QAR', name: 'Qatari Riyal', nameAr: 'ريال قطري', symbol: 'QR', decimals: 2, active: true, isDefault: false },
  { code: 'KWD', name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي', symbol: 'KD', decimals: 3, active: true, isDefault: false },
  { code: 'OMR', name: 'Omani Rial', nameAr: 'ريال عماني', symbol: 'OMR', decimals: 3, active: true, isDefault: false },
  { code: 'NGN', name: 'Nigerian Naira', nameAr: 'نيرة نيجيرية', symbol: '₦', decimals: 2, active: true, isDefault: false },
]

const EXCHANGE_RATES: Record<string, number> = {
  'BHD/USD': 2.6530,
  'BHD/EUR': 2.4310,
  'BHD/GBP': 2.0890,
  'BHD/SAR': 9.9500,
  'BHD/AED': 9.7420,
  'BHD/QAR': 9.6620,
  'BHD/KWD': 0.8120,
  'BHD/OMR': 1.0210,
  'BHD/NGN': 4380.00,
}

export default function AdminCurrencies() {
  const [currencies, setCurrencies] = useState(INITIAL_CURRENCIES)
  const [activeTab, setActiveTab] = useState<'currencies' | 'rates'>('currencies')
  const [rates, setRates] = useState(EXCHANGE_RATES)
  const [ratesUpdated, setRatesUpdated] = useState(false)

  function toggleActive(code: string) {
    setCurrencies(c => c.map(x =>
      x.code === code && !x.isDefault
        ? { ...x, active: !x.active }
        : x
    ))
  }

  function updateRate(key: string, val: string) {
    const num = parseFloat(val)
    if (!isNaN(num)) setRates(r => ({ ...r, [key]: num }))
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 800,
          fontFamily: 'Montserrat', color: '#fff', marginBottom: 4,
        }}>Currencies & Exchange Rates</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>
          Manage supported display currencies and exchange rates
        </p>
      </div>

      <div style={{
        background: 'rgba(245,158,11,0.06)',
        border: '1px solid rgba(245,158,11,0.12)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 24,
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 11, color: 'rgba(245,158,11,0.7)', fontFamily: 'Montserrat', lineHeight: 1.7 }}>
          Exchange rates are for display purposes only. Original transaction currencies
          are never overwritten. Connect a live rate provider for production use.
        </span>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 20,
        borderBottom: '1px solid rgba(212,175,55,0.1)',
      }}>
        {[
          { key: 'currencies', label: 'Currencies' },
          { key: 'rates', label: 'Exchange Rates' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            style={{
              background: 'none', border: 'none',
              borderBottom: `2px solid ${activeTab === tab.key ? '#D4AF37' : 'transparent'}`,
              padding: '10px 20px', cursor: 'pointer',
              color: activeTab === tab.key ? '#D4AF37' : 'rgba(255,255,255,0.4)',
              fontSize: 12, fontFamily: 'Montserrat',
              fontWeight: activeTab === tab.key ? 700 : 400,
              marginBottom: -1, transition: 'all 0.2s',
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* Currencies tab */}
      {activeTab === 'currencies' && (
        <div style={{
          background: 'rgba(20,20,20,0.8)',
          border: '1px solid rgba(212,175,55,0.08)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '80px 1fr 140px 60px 70px 70px',
            padding: '12px 20px',
            borderBottom: '1px solid rgba(212,175,55,0.07)',
            gap: 12,
          }}>
            {['Code', 'Name', 'Arabic Name', 'Symbol', 'Decimals', 'Status'].map((h, i) => (
              <div key={i} style={{
                fontSize: 10, fontWeight: 700,
                color: 'rgba(255,255,255,0.3)',
                fontFamily: 'Montserrat', letterSpacing: 1,
              }}>{h}</div>
            ))}
          </div>

          {currencies.map((c, i) => (
            <div key={c.code} style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 140px 60px 70px 70px',
              padding: '13px 20px',
              borderBottom: i < currencies.length - 1
                ? '1px solid rgba(212,175,55,0.05)' : 'none',
              gap: 12, alignItems: 'center',
              background: c.active ? 'transparent' : 'rgba(0,0,0,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: c.active ? '#D4AF37' : 'rgba(255,255,255,0.3)',
                  fontFamily: 'Montserrat',
                }}>{c.code}</span>
                {c.isDefault && (
                  <span style={{
                    fontSize: 8, background: 'rgba(212,175,55,0.15)',
                    color: '#D4AF37', padding: '1px 5px',
                    borderRadius: 3, fontFamily: 'Montserrat', fontWeight: 700,
                  }}>DEFAULT</span>
                )}
              </div>
              <div style={{
                fontSize: 12, color: c.active ? '#fff' : 'rgba(255,255,255,0.35)',
                fontFamily: 'Montserrat',
              }}>{c.name}</div>
              <div style={{
                fontSize: 12, color: c.active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
                fontFamily: 'Cairo', direction: 'rtl',
              }}>{c.nameAr}</div>
              <div style={{
                fontSize: 12, color: 'rgba(255,255,255,0.5)',
                fontFamily: 'Montserrat',
              }}>{c.symbol}</div>
              <div style={{
                fontSize: 12, color: 'rgba(255,255,255,0.5)',
                fontFamily: 'Montserrat',
              }}>{c.decimals}</div>
              <button
                onClick={() => toggleActive(c.code)}
                disabled={c.isDefault}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: c.active ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                  border: `1px solid ${c.active ? 'rgba(16,185,129,0.2)' : 'rgba(107,114,128,0.2)'}`,
                  borderRadius: 6, padding: '5px 9px',
                  cursor: c.isDefault ? 'not-allowed' : 'pointer',
                  color: c.active ? '#10b981' : '#6b7280',
                  fontSize: 10, fontFamily: 'Montserrat', fontWeight: 600,
                  opacity: c.isDefault ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {c.active
                  ? <><CheckCircle size={11} /> Active</>
                  : <><XCircle size={11} /> Inactive</>
                }
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Rates tab */}
      {activeTab === 'rates' && (
        <div>
          <div style={{
            background: 'rgba(20,20,20,0.8)',
            border: '1px solid rgba(212,175,55,0.08)',
            borderRadius: 12, overflow: 'hidden', marginBottom: 16,
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 160px',
              padding: '12px 20px',
              borderBottom: '1px solid rgba(212,175,55,0.07)', gap: 12,
            }}>
              {['Currency Pair', 'Rate (Base: BHD)', 'Last Updated'].map((h, i) => (
                <div key={i} style={{
                  fontSize: 10, fontWeight: 700,
                  color: 'rgba(255,255,255,0.3)',
                  fontFamily: 'Montserrat', letterSpacing: 1,
                }}>{h}</div>
              ))}
            </div>

            {Object.entries(rates).map(([pair, rate], i) => {
              const [base, quote] = pair.split('/')
              return (
                <div key={pair} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 160px',
                  padding: '12px 20px',
                  borderBottom: i < Object.keys(rates).length - 1
                    ? '1px solid rgba(212,175,55,0.05)' : 'none',
                  gap: 12, alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: '#D4AF37', fontFamily: 'Montserrat',
                    }}>{base}</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>/</span>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: '#fff', fontFamily: 'Montserrat',
                    }}>{quote}</span>
                  </div>
                  <input
                    type="number"
                    value={rate}
                    step="0.0001"
                    onChange={e => updateRate(pair, e.target.value)}
                    style={{
                      background: 'rgba(11,11,11,0.6)',
                      border: '1px solid rgba(212,175,55,0.15)',
                      borderRadius: 6, padding: '8px 12px',
                      color: '#fff', fontSize: 13,
                      fontFamily: 'Montserrat', outline: 'none',
                      width: '100%', boxSizing: 'border-box',
                    }}
                  />
                  <div style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.25)',
                    fontFamily: 'Montserrat',
                  }}>Manual — not live</div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setRatesUpdated(true); setTimeout(() => setRatesUpdated(false), 2000) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: ratesUpdated
                  ? 'rgba(16,185,129,0.15)'
                  : 'linear-gradient(135deg,#D4AF37,#E8CC6A)',
                border: ratesUpdated ? '1px solid rgba(16,185,129,0.3)' : 'none',
                borderRadius: 8, padding: '10px 22px',
                color: ratesUpdated ? '#10b981' : '#0B0B0B',
                fontSize: 12, fontWeight: 700,
                fontFamily: 'Montserrat', cursor: 'pointer',
              }}
            >
              {ratesUpdated ? '✓ Updated!' : 'Update Rates'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
