import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, MapPin, Clock, TrendingUp } from 'lucide-react'
import { api } from '../../lib/api'

type Opp = {
  id: string; name: string; name_ar: string | null; currency: string | null; category: string; location: string | null
  minimum_investment: number; target_amount: number; amount_raised: number; risk_level: string; duration_days: number | null
  projected_return_min: number | null; projected_return_max: number | null; cover_image_url: string | null
}

const CATEGORY: Record<string, string> = {
  technology: 'تكنولوجيا', real_estate: 'عقارات', startups: 'شركات ناشئة', agriculture: 'زراعة',
  renewable_energy: 'طاقة متجددة', sukuk: 'صكوك', funds: 'صناديق',
}
const RISK: Record<string, [string, string]> = {
  low: ['منخفضة', '#10b981'], medium: ['متوسطة', '#f59e0b'], high: ['مرتفعة', '#ef4444'], very_high: ['مرتفعة جداً', '#dc2626'],
}

// Live from the database: only opportunities the admin has set to "open" appear here.
export default function ProductsSection() {
  const q = useQuery({ queryKey: ['public-opportunities'], staleTime: 60000, queryFn: () => api.get<Opp[]>('/api/investments/opportunities') })
  const list = (q.data || []).slice(0, 6)

  return (
    <section id="investment" style={{ padding: '100px 24px', background: 'linear-gradient(180deg, transparent, rgba(44,44,44,0.15), transparent)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 48 }}>
          <div className="section-label">الفرص الاستثمارية</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, fontFamily: 'Cairo' }}>
            فرص <span className="gold-text">مفتوحة الآن</span>
          </h2>
          <p style={{ marginTop: 12, fontSize: 15, color: 'rgba(255,255,255,0.55)', maxWidth: 560, lineHeight: 1.8, fontFamily: 'Cairo' }}>
            هذه الفرص تُعرض مباشرة من النظام. العوائد المذكورة متوقعة وغير مضمونة، ويجب قراءة تفاصيل كل فرصة قبل الاستثمار.
          </p>
        </div>

        {q.isLoading && (
          <div className="ps-grid">{[0, 1, 2].map(i => <div key={i} className="glass-card" style={{ height: 340, opacity: 0.4 }} />)}</div>
        )}

        {q.isError && (
          <div className="glass-card" style={{ padding: 28, textAlign: 'center', fontFamily: 'Cairo', color: 'rgba(255,255,255,0.6)' }}>
            تعذر تحميل الفرص الآن.{' '}
            <button type="button" onClick={() => q.refetch()} style={{ background: 'none', border: 'none', color: '#D4AF37', cursor: 'pointer', fontFamily: 'Cairo', fontWeight: 700 }}>إعادة المحاولة</button>
          </div>
        )}

        {!q.isLoading && !q.isError && list.length === 0 && (
          <div className="glass-card" style={{ padding: 36, textAlign: 'center' }}>
            <TrendingUp size={30} color="rgba(212,175,55,0.5)" style={{ marginBottom: 10 }} />
            <div style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>لا توجد فرص مفتوحة حالياً</div>
            <div style={{ fontFamily: 'Cairo', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 18 }}>سجّل حسابك وسنخبرك فور فتح فرصة جديدة.</div>
            <Link to="/register" className="btn-gold" style={{ display: 'inline-block', padding: '11px 26px', textDecoration: 'none' }}>إنشاء حساب</Link>
          </div>
        )}

        {list.length > 0 && (
          <div className="ps-grid">
            {list.map(o => {
              const pct = o.target_amount > 0 ? Math.min(Math.round((Number(o.amount_raised) / Number(o.target_amount)) * 100), 100) : 0
              const [riskLabel, riskColor] = RISK[o.risk_level] || RISK.medium
              return (
                <Link key={o.id} to="/dashboard/investments" className="glass-card ps-card" style={{ padding: 0, overflow: 'hidden', textDecoration: 'none', color: '#fff', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 170, position: 'relative', background: 'linear-gradient(135deg,rgba(44,44,44,0.9),rgba(11,11,11,0.95))' }}>
                    {o.cover_image_url
                      ? <img src={o.cover_image_url} alt={o.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={40} color="rgba(212,175,55,0.25)" /></div>}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(11,11,11,0) 40%,rgba(11,11,11,0.9) 100%)' }} />
                    <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(11,11,11,0.78)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 100, padding: '3px 11px', fontSize: 10, fontWeight: 700, color: '#D4AF37', fontFamily: 'Cairo' }}>{CATEGORY[o.category] || o.category}</span>
                    <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(11,11,11,0.78)', border: `1px solid ${riskColor}55`, borderRadius: 100, padding: '3px 11px', fontSize: 10, fontWeight: 700, color: riskColor, fontFamily: 'Cairo' }}>مخاطرة {riskLabel}</span>
                    <h3 style={{ position: 'absolute', bottom: 10, right: 14, left: 14, margin: 0, fontSize: 16, fontWeight: 800, fontFamily: 'Cairo', lineHeight: 1.4 }}>{o.name_ar || o.name}</h3>
                  </div>
                  <div style={{ padding: '14px 16px 18px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo' }}>
                      {o.location && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={12} color="#D4AF37" />{o.location}</span>}
                      {o.duration_days ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={12} color="#D4AF37" />{o.duration_days} يوم</span> : null}
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'Cairo', marginBottom: 5 }}>
                        <span style={{ fontWeight: 700 }}>{pct}% ممول</span>
                        <span dir="ltr" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', fontSize: 10 }}>{Number(o.amount_raised).toLocaleString()} / {Number(o.target_amount).toLocaleString()} {o.currency || ''}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#D4AF37,#E8CC6A)' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>الحد الأدنى</div>
                        <div dir="ltr" style={{ fontSize: 15, fontWeight: 800, color: '#D4AF37', fontFamily: 'Montserrat' }}>{o.currency || ''} {Number(o.minimum_investment).toLocaleString()}</div>
                      </div>
                      {o.projected_return_min ? (
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>عائد متوقع (غير مضمون)</div>
                          <div dir="ltr" style={{ fontSize: 15, fontWeight: 800, color: '#10b981', fontFamily: 'Montserrat' }}>{o.projected_return_min}–{o.projected_return_max}%</div>
                        </div>
                      ) : null}
                    </div>
                    <div style={{ textAlign: 'center', padding: '10px 0', borderRadius: 10, background: 'linear-gradient(135deg,#D4AF37,#E8CC6A)', color: '#0B0B0B', fontFamily: 'Cairo', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      التفاصيل والاستثمار <ArrowLeft size={14} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
      <style>{`
        .ps-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 20px; }
        .ps-card { transition: transform .25s ease, border-color .25s ease; }
        .ps-card:hover { transform: translateY(-4px); border-color: rgba(212,175,55,0.4); }
      `}</style>
    </section>
  )
}
