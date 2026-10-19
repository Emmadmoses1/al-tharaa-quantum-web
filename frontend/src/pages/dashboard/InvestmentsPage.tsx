import { useState } from 'react'
import {
  TrendingUp, MapPin, Clock,
  ChevronLeft, AlertTriangle,
} from 'lucide-react'
import {
  useOpportunities,
  useInvestmentPortfolio,
  type InvestmentOpportunity,
} from '../../hooks/useData'
import { CardSkeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'
import InvestAction from '../../components/InvestAction'

const CATEGORIES = [
  { key: 'all', label: 'الكل' },
  { key: 'technology', label: 'تكنولوجيا' },
  { key: 'real_estate', label: 'عقارات' },
  { key: 'startups', label: 'شركات ناشئة' },
  { key: 'agriculture', label: 'زراعة' },
  { key: 'renewable_energy', label: 'طاقة متجددة' },
  { key: 'sukuk', label: 'صكوك' },
  { key: 'funds', label: 'صناديق' },
]

const RISK_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  very_high: '#dc2626',
}

const RISK_LABELS: Record<string, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'مرتفع',
  very_high: 'مرتفع جداً',
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{
      height: 4, background: 'rgba(212,175,55,0.1)',
      borderRadius: 2, overflow: 'hidden', marginTop: 8,
    }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: 'linear-gradient(90deg,#D4AF37,#E8CC6A)',
        borderRadius: 2, transition: 'width 0.6s ease',
      }} />
    </div>
  )
}

function OpportunityCard({
  opp, onClick,
}: {
  opp: InvestmentOpportunity; onClick: () => void
}) {
  const pct = opp.target_amount > 0
    ? Math.min(Math.round((opp.amount_raised / opp.target_amount) * 100), 100)
    : 0

  return (
    <div
      className="glass-card"
      onClick={onClick}
      style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.3s ease' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.35)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(212,175,55,0.1)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.15)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
      }}
    >
      {/* Cover */}
      <div style={{
        height: 110,
        background: 'linear-gradient(135deg,rgba(44,44,44,0.8),rgba(11,11,11,0.9))',
        borderBottom: '1px solid rgba(212,175,55,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        {opp.cover_image_url ? (
          <img src={opp.cover_image_url} alt={opp.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <TrendingUp size={32} color="rgba(212,175,55,0.2)" />
        )}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(11,11,11,0.75)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 5, padding: '2px 9px',
          fontSize: 9, fontWeight: 700,
          color: '#D4AF37', fontFamily: 'Cairo',
          backdropFilter: 'blur(8px)',
        }}>
          {CATEGORIES.find(c => c.key === opp.category)?.label || opp.category}
        </div>
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: `rgba(${RISK_COLORS[opp.risk_level] === '#10b981' ? '16,185,129' : '245,158,11'},0.15)`,
          border: `1px solid ${RISK_COLORS[opp.risk_level]}30`,
          borderRadius: 5, padding: '2px 9px',
          fontSize: 9, fontWeight: 600,
          color: RISK_COLORS[opp.risk_level], fontFamily: 'Cairo',
        }}>
          مخاطرة {RISK_LABELS[opp.risk_level]}
        </div>
      </div>

      <div style={{ padding: '18px 16px' }}>
        <h3 style={{
          fontSize: 14, fontWeight: 700, fontFamily: 'Cairo',
          color: '#fff', marginBottom: 8, lineHeight: 1.4,
        }}>
          {opp.name_ar || opp.name}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
          <MapPin size={11} color="rgba(255,255,255,0.3)" />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo' }}>
            {opp.location || 'البحرين'}
          </span>
          {opp.duration_days && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>•</span>
              <Clock size={11} color="rgba(255,255,255,0.3)" />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo' }}>
                {opp.duration_days} يوم
              </span>
            </>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>
              {pct}% ممول
            </span>
            <span style={{ fontSize: 10, color: '#D4AF37', fontFamily: 'Montserrat', fontWeight: 700 }}>
              {Number(opp.amount_raised).toLocaleString()} / {Number(opp.target_amount).toLocaleString()} {opp.currency}
            </span>
          </div>
          <ProgressBar value={opp.amount_raised} max={opp.target_amount} />
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: 12, borderTop: '1px solid rgba(212,175,55,0.08)',
        }}>
          <div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cairo' }}>
              الحد الأدنى
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat' }}>
              {opp.currency} {Number(opp.minimum_investment).toLocaleString()}
            </div>
          </div>
          {opp.projected_return_min && (
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cairo' }}>
                عائد متوقع*
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', fontFamily: 'Montserrat' }}>
                {opp.projected_return_min}–{opp.projected_return_max}%
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PortfolioSection() {
  const { data: portfolio, isLoading, isError, refetch } = useInvestmentPortfolio()

  if (isLoading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
      {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
    </div>
  )

  if (isError) return <ErrorState onRetry={refetch} />

  if (!portfolio || portfolio.length === 0) return (
    <div style={{
      padding: '32px', textAlign: 'center',
      color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo', fontSize: 14,
    }}>
      لا توجد استثمارات نشطة بعد
    </div>
  )

  const totalInvested = portfolio.reduce((s, a) => s + Number(a.amount_invested), 0)
  const totalValue = portfolio.reduce((s, a) => s + Number(a.current_value || a.amount_invested), 0)
  const gainLoss = totalValue - totalInvested

  return (
    <div>
      {/* Summary row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
        gap: 14, marginBottom: 20,
      }} className="portfolio-summary">
        {[
          { label: 'إجمالي المستثمر', value: `BHD ${totalInvested.toFixed(3)}`, color: '#fff' },
          { label: 'القيمة الحالية', value: `BHD ${totalValue.toFixed(3)}`, color: '#D4AF37' },
          {
            label: 'الربح / الخسارة',
            value: `${gainLoss >= 0 ? '+' : ''}BHD ${gainLoss.toFixed(3)}`,
            color: gainLoss >= 0 ? '#10b981' : '#ef4444',
          },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '16px',
            background: 'rgba(44,44,44,0.3)',
            border: '1px solid rgba(212,175,55,0.08)',
            borderRadius: 10, textAlign: 'center',
          }}>
            <div style={{
              fontSize: 18, fontWeight: 800,
              fontFamily: 'Montserrat', color: s.color, marginBottom: 4,
            }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Allocations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {portfolio.map(alloc => {
          const gain = Number(alloc.current_value || alloc.amount_invested) - Number(alloc.amount_invested)
          return (
            <div key={alloc.id} style={{
              padding: '16px 18px',
              background: 'rgba(44,44,44,0.25)',
              border: '1px solid rgba(212,175,55,0.08)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: '#fff',
                  fontFamily: 'Cairo', marginBottom: 4,
                }}>
                  {alloc.investment_opportunities?.name_ar || alloc.investment_opportunities?.name || 'استثمار'}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 10, fontFamily: 'Cairo',
                    color: alloc.status === 'active' ? '#10b981' : '#f59e0b',
                    background: alloc.status === 'active'
                      ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                    padding: '2px 8px', borderRadius: 4,
                  }}>{alloc.status}</span>
                  {alloc.investment_opportunities?.category && (
                    <span style={{
                      fontSize: 10, fontFamily: 'Cairo',
                      color: 'rgba(255,255,255,0.35)',
                    }}>
                      {CATEGORIES.find(c => c.key === alloc.investment_opportunities?.category)?.label}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{
                  fontSize: 16, fontWeight: 800,
                  fontFamily: 'Montserrat', color: '#D4AF37',
                }}>
                  {alloc.currency} {Number(alloc.amount_invested).toFixed(3)}
                </div>
                {gain !== 0 && (
                  <div style={{
                    fontSize: 12, fontFamily: 'Montserrat',
                    color: gain >= 0 ? '#10b981' : '#ef4444',
                    textAlign: 'right',
                  }}>
                    {gain >= 0 ? '+' : ''}{gain.toFixed(3)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function InvestmentsPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedOpp, setSelectedOpp] = useState<InvestmentOpportunity | null>(null)
  const [activeTab, setActiveTab] = useState<'marketplace' | 'portfolio'>('marketplace')
  const [investAmount, setInvestAmount] = useState('')

  const { data: opportunities, isLoading, isError, refetch } = useOpportunities(
    activeCategory !== 'all' ? activeCategory : undefined
  )

  if (selectedOpp) {
    const pct = selectedOpp.target_amount > 0
      ? Math.min(Math.round((selectedOpp.amount_raised / selectedOpp.target_amount) * 100), 100)
      : 0
    const amount = parseFloat(investAmount) || 0
    const fee = amount * (Number(selectedOpp.fees_percent) / 100)
    const net = amount - fee

    return (
      <div style={{ direction: 'rtl', maxWidth: 760, margin: '0 auto' }}>
        <button onClick={() => setSelectedOpp(null)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', color: '#D4AF37',
          cursor: 'pointer', fontSize: 14, fontFamily: 'Cairo', marginBottom: 24,
        }}>
          <ChevronLeft size={18} style={{ transform: 'rotate(180deg)' }} />
          العودة للفرص
        </button>

        <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#D4AF37', fontFamily: 'Cairo', letterSpacing: 1, marginBottom: 8 }}>
              {CATEGORIES.find(c => c.key === selectedOpp.category)?.label}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}>
              {selectedOpp.name_ar || selectedOpp.name}
            </h1>
            {selectedOpp.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} color="rgba(255,255,255,0.4)" />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>
                  {selectedOpp.location}
                </span>
              </div>
            )}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
            gap: 14, marginBottom: 20,
          }} className="detail-stats">
            {[
              { label: 'المستهدف', value: `${selectedOpp.currency} ${Number(selectedOpp.target_amount).toLocaleString()}` },
              { label: 'تم جمعه', value: `${selectedOpp.currency} ${Number(selectedOpp.amount_raised).toLocaleString()}` },
              { label: 'الحد الأدنى', value: `${selectedOpp.currency} ${Number(selectedOpp.minimum_investment).toLocaleString()}` },
              { label: 'المدة', value: selectedOpp.duration_days ? `${selectedOpp.duration_days} يوم` : '—' },
            ].map((s, i) => (
              <div key={i} style={{
                background: 'rgba(44,44,44,0.3)', borderRadius: 10, padding: '14px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo', marginBottom: 6 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat' }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>
                التمويل: {pct}%
              </span>
              <span style={{ fontSize: 12, color: '#D4AF37', fontFamily: 'Montserrat', fontWeight: 600 }}>
                {Number(selectedOpp.amount_raised).toLocaleString()} / {Number(selectedOpp.target_amount).toLocaleString()}
              </span>
            </div>
            <ProgressBar value={selectedOpp.amount_raised} max={selectedOpp.target_amount} />
          </div>

          {selectedOpp.description_ar || selectedOpp.description ? (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.9, fontFamily: 'Cairo' }}>
              {selectedOpp.description_ar || selectedOpp.description}
            </p>
          ) : null}
        </div>

        {/* Calculator */}
        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}>
            حاسبة الاستثمار
          </h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo', marginBottom: 20, lineHeight: 1.7 }}>
            * سيناريو توضيحي فقط — ليس ضماناً للعائد. الاستثمار ينطوي على مخاطر.
          </p>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', marginBottom: 8 }}>
              مبلغ الاستثمار ({selectedOpp.currency})
            </label>
            <input
              type="number"
              value={investAmount}
              onChange={e => setInvestAmount(e.target.value)}
              placeholder={`الحد الأدنى ${Number(selectedOpp.minimum_investment).toLocaleString()}`}
              min={selectedOpp.minimum_investment}
              style={{
                width: '100%', background: 'rgba(11,11,11,0.6)',
                border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8,
                padding: '12px 16px', color: '#fff', fontSize: 14,
                fontFamily: 'Montserrat', outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(212,175,55,0.2)'}
            />
          </div>

          {amount >= Number(selectedOpp.minimum_investment) && (
            <>
              {selectedOpp.projected_return_min && selectedOpp.projected_return_max && (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                  gap: 12, marginBottom: 16,
                }} className="calc-scenarios">
                  {[
                    { label: 'متحفظ', pct: Number(selectedOpp.projected_return_min) },
                    { label: 'أساسي', pct: (Number(selectedOpp.projected_return_min) + Number(selectedOpp.projected_return_max)) / 2 },
                    { label: 'متفائل', pct: Number(selectedOpp.projected_return_max) },
                  ].map((s, i) => (
                    <div key={i} style={{
                      background: 'rgba(44,44,44,0.3)',
                      border: '1px solid rgba(212,175,55,0.1)',
                      borderRadius: 10, padding: '14px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', marginBottom: 8 }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#10b981', fontFamily: 'Montserrat' }}>
                        {selectedOpp.currency} {(amount * (1 + s.pct / 100)).toFixed(3)}
                      </div>
                      <div style={{ fontSize: 10, color: '#10b981', fontFamily: 'Montserrat', opacity: 0.7 }}>
                        +{s.pct.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{
                background: 'rgba(11,11,11,0.4)',
                border: '1px solid rgba(212,175,55,0.08)',
                borderRadius: 8, padding: '14px', marginBottom: 16,
              }}>
                {[
                  { label: 'مبلغ الاستثمار', value: `${selectedOpp.currency} ${amount.toFixed(3)}` },
                  { label: `رسوم المنصة (${selectedOpp.fees_percent}%)`, value: `${selectedOpp.currency} ${fee.toFixed(3)}`, red: true },
                  { label: 'صافي المستثمر', value: `${selectedOpp.currency} ${net.toFixed(3)}`, green: true, bold: true },
                ].map((row, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '6px 0',
                    borderTop: i > 0 ? '1px solid rgba(212,175,55,0.06)' : 'none',
                  }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo' }}>
                      {row.label}
                    </span>
                    <span style={{
                      fontSize: 13, fontFamily: 'Montserrat',
                      fontWeight: row.bold ? 700 : 500,
                      color: row.green ? '#10b981' : row.red ? '#ef4444' : 'rgba(255,255,255,0.7)',
                    }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <InvestAction opp={selectedOpp} amount={amount} onDone={() => { setSelectedOpp(null); setActiveTab('portfolio') }} />

          <p style={{
            fontSize: 11, color: 'rgba(255,255,255,0.2)',
            fontFamily: 'Cairo', lineHeight: 1.7, marginTop: 12, textAlign: 'center',
          }}>
            * جميع الأرقام تقديرية. الاستثمار ينطوي على مخاطر فقدان رأس المال.
            يرجى مراجعة وثائق الإفصاح الكاملة قبل المتابعة.
          </p>
        </div>

        <style>{`
          @media (max-width:640px) {
            .detail-stats { grid-template-columns: 1fr 1fr !important; }
            .calc-scenarios { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ direction: 'rtl' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}>
          الاستثمار
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo' }}>
          استكشف الفرص وتابع محفظتك
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 24,
        borderBottom: '1px solid rgba(212,175,55,0.1)',
      }}>
        {[
          { key: 'marketplace', label: 'فرص الاستثمار' },
          { key: 'portfolio', label: 'محفظتي الاستثمارية' },
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
              marginBottom: -1, transition: 'all 0.2s',
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* Marketplace */}
      {activeTab === 'marketplace' && (
        <>
          {/* Disclaimer */}
          <div style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.15)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: 'rgba(245,158,11,0.8)', fontFamily: 'Cairo', lineHeight: 1.7 }}>
              الاستثمار ينطوي على مخاطر. العوائد المتوقعة سيناريوهات توضيحية فقط وليست مضمونة.
            </span>
          </div>

          {/* Category filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  background: activeCategory === cat.key
                    ? 'rgba(212,175,55,0.15)' : 'rgba(44,44,44,0.4)',
                  border: `1px solid ${activeCategory === cat.key ? '#D4AF37' : 'rgba(212,175,55,0.1)'}`,
                  borderRadius: 100, padding: '7px 16px',
                  cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo',
                  color: activeCategory === cat.key ? '#D4AF37' : 'rgba(255,255,255,0.5)',
                  fontWeight: activeCategory === cat.key ? 600 : 400,
                  transition: 'all 0.2s',
                }}
              >{cat.label}</button>
            ))}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }} className="opp-grid">
              {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : isError ? (
            <ErrorState message="فشل تحميل فرص الاستثمار" onRetry={refetch} />
          ) : !opportunities || opportunities.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', padding: '72px 24px',
              gap: 14, textAlign: 'center',
            }}>
              <div style={{
                width: 60, height: 60,
                background: 'rgba(212,175,55,0.05)',
                border: '1px solid rgba(212,175,55,0.1)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <TrendingUp size={26} color="rgba(212,175,55,0.3)" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo' }}>
                لا توجد فرص استثمار متاحة حالياً
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cairo', maxWidth: 300 }}>
                سيتم إضافة فرص استثمار جديدة قريباً من لوحة الإدارة
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 20,
            }} className="opp-grid">
              {opportunities.map(opp => (
                <OpportunityCard
                  key={opp.id}
                  opp={opp}
                  onClick={() => { setSelectedOpp(opp); setInvestAmount('') }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Portfolio */}
      {activeTab === 'portfolio' && (
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', marginBottom: 20 }}>
            محفظتي الاستثمارية
          </h2>
          <PortfolioSection />
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) { .opp-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 640px) { .opp-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 768px) { .portfolio-summary { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
