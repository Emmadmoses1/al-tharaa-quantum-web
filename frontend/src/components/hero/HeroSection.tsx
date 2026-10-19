import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import GoldCoin from './GoldCoin'

const stats = [
  { value: '+100,000', label: 'مستخدم' },
  { value: '99.97%', label: 'وقت التشغيل' },
  { value: '+40', label: 'دولة' },
  { value: 'CBB', label: 'مرخّص' },
]

export default function HeroSection() {
  const { user } = useAuth()

  return (
    <section id="home" style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      paddingTop: '68px',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(212,175,55,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(212,175,55,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px', zIndex: 0,
      }} />

      {/* Glow */}
      <div style={{
        position: 'absolute', top: '30%', right: '15%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%)',
        zIndex: 0, pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1200, margin: '0 auto',
        padding: '0 24px', width: '100%',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '60px', alignItems: 'center',
      }} className="hero-grid">

        {/* Left: Text */}
        <div>
          <div className="section-label">
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#D4AF37', display: 'inline-block',
              animation: 'glowPulse 2s infinite',
            }} />
            منصة التمويل الرقمي بالذكاء الاصطناعي
          </div>

          <h1 style={{
            fontSize: 'clamp(30px, 5vw, 56px)',
            fontWeight: 800, lineHeight: 1.2,
            marginBottom: '20px', fontFamily: 'Cairo',
          }}>
            حيث يلتقي{' '}
            <span className="gold-text">الذكاء الاصطناعي</span>
            {' '}بالثروة السيادية
          </h1>

          <p style={{
            fontSize: 15, color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.9, marginBottom: '36px',
            fontFamily: 'Cairo', maxWidth: 480,
          }}>
            الثراء كوانتوم يقدم خوارزميات تداول بالذكاء الاصطناعي، واستثمارات رقمية آمنة، وفرص استثمار متوافقة مع الشريعة — مصممة لمستثمري منطقة الخليج.
          </p>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {user ? (
              <>
                <Link to="/dashboard/investments" style={{ textDecoration: 'none' }}>
                  <button className="btn-gold" style={{ fontSize: 15 }}>
                    ابدأ الاستثمار
                  </button>
                </Link>
                <Link to="/dashboard/trading" style={{ textDecoration: 'none' }}>
                  <button className="btn-outline-gold" style={{ fontSize: 15 }}>
                    استكشف التداول الذكي
                  </button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" style={{ textDecoration: 'none' }}>
                  <button className="btn-gold" style={{ fontSize: 15 }}>
                    ابدأ الاستثمار
                  </button>
                </Link>
                <Link to="/register" style={{ textDecoration: 'none' }}>
                  <button className="btn-outline-gold" style={{ fontSize: 15 }}>
                    استكشف التداول الذكي
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Right: 3D Coin */}
        <div style={{
          height: 420, position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <GoldCoin />
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1200, margin: '60px auto 40px',
        padding: '0 24px', width: '100%',
      }}>
        <div style={{
          display: 'flex', gap: 0,
          background: 'rgba(44,44,44,0.35)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(212,175,55,0.15)',
          borderRadius: '16px', overflow: 'hidden',
        }} className="stats-bar">
          {stats.map((stat, i) => (
            <div key={i} style={{
              flex: 1, padding: '22px 20px', textAlign: 'center',
              borderRight: i < stats.length - 1
                ? '1px solid rgba(212,175,55,0.1)' : 'none',
            }}>
              <div style={{
                fontSize: 'clamp(20px, 3vw, 28px)',
                fontWeight: 800, fontFamily: 'Montserrat',
                color: '#D4AF37', lineHeight: 1, marginBottom: 6,
              }}>{stat.value}</div>
              <div style={{
                fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo',
              }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 30px !important;
            text-align: center;
          }
          .hero-grid > div:nth-child(2) {
            height: 280px !important;
            order: -1;
          }
          .stats-bar { flex-wrap: wrap; }
          .stats-bar > div {
            flex: 1 1 45%;
            border-right: none !important;
            border-bottom: 1px solid rgba(212,175,55,0.1);
          }
        }
      `}</style>
    </section>
  )
}
