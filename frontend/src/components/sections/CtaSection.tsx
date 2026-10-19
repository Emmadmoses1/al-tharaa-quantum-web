import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function CtaSection() {
  const { user } = useAuth()

  return (
    <section style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(44,44,44,0.6) 0%, rgba(20,20,20,0.8) 100%)',
        border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: 24, padding: 'clamp(40px, 6vw, 80px)',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="section-label" style={{ justifyContent: 'center' }}>
          ابدأ رحلتك المالية المتميزة
        </div>

        <h2 style={{
          fontSize: 'clamp(24px, 4vw, 42px)',
          fontWeight: 800, fontFamily: 'Cairo', marginBottom: 16,
          position: 'relative', zIndex: 1,
        }}>
          ابدأ رحلة ثروتك{' '}
          <span className="gold-text">المتميزة</span>
        </h2>

        <p style={{
          fontSize: 15, color: 'rgba(255,255,255,0.55)',
          maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.9,
          fontFamily: 'Cairo', position: 'relative', zIndex: 1,
        }}>
          انضم إلى مئات آلاف المستثمرين الذين يثقون بالثراء كوانتوم للوصول إلى نماذج تداول الذكاء الاصطناعي السيادية.
        </p>

        <div style={{
          display: 'flex', gap: 14, justifyContent: 'center',
          flexWrap: 'wrap', position: 'relative', zIndex: 1,
        }}>
          {user ? (
            <>
              <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                <button className="btn-gold" style={{ fontSize: 15, padding: '13px 32px' }}>
                  لوحة التحكم
                </button>
              </Link>
              <Link to="/dashboard/investments" style={{ textDecoration: 'none' }}>
                <button className="btn-outline-gold" style={{ fontSize: 15, padding: '13px 32px' }}>
                  استكشف الاستثمارات
                </button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" style={{ textDecoration: 'none' }}>
                <button className="btn-gold" style={{ fontSize: 15, padding: '13px 32px' }}>
                  إنشاء حساب مجاني
                </button>
              </Link>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <button className="btn-outline-gold" style={{ fontSize: 15, padding: '13px 32px' }}>
                  تسجيل الدخول
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
