import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navLinks = [
  { label: 'الرئيسية', href: '#home' },
  { label: 'التداول الذكي', href: '#trading' },
  { label: 'الاستثمار', href: '#investment' },
  { label: 'الأسواق', href: '#markets' },
  { label: 'الأمان', href: '#security' },
  { label: 'عن المنصة', href: '#about' },
]

export default function Navbar() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      transition: 'all 0.3s ease',
      background: scrolled ? 'rgba(11,11,11,0.97)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(212,175,55,0.1)' : '1px solid transparent',
      padding: '0 24px', height: '68px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36,
          background: 'linear-gradient(135deg, #D4AF37, #E8CC6A)',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 15, color: '#0B0B0B', fontFamily: 'Montserrat',
          flexShrink: 0,
        }}>AQ</div>
        <div>
          <div style={{
            fontSize: 12, fontWeight: 700, color: '#D4AF37',
            fontFamily: 'Montserrat', letterSpacing: '2px', lineHeight: 1,
          }}>AL THARAA</div>
          <div style={{
            fontSize: 9, color: 'rgba(212,175,55,0.5)',
            fontFamily: 'Montserrat', letterSpacing: '3px',
          }}>QUANTUM</div>
        </div>
      </Link>

      {/* Desktop nav links */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }} className="nav-links">
        {navLinks.map(link => (
          <a key={link.href} href={link.href} style={{
            color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
            fontSize: 14, fontWeight: 500, fontFamily: 'Cairo', transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#D4AF37')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          >{link.label}</a>
        ))}
      </div>

      {/* Auth buttons */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {!loading && (
          user ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-gold"
              style={{ fontSize: 13, padding: '9px 20px' }}
            >
              لوحة التحكم
            </button>
          ) : (
            <>
              <Link to="/login" className="nav-login" style={{
                color: '#D4AF37', textDecoration: 'none',
                fontSize: 14, fontWeight: 600, fontFamily: 'Cairo',
                padding: '8px 4px',
              }}>
                تسجيل الدخول
              </Link>
              <Link to="/register">
                <button className="btn-gold" style={{ fontSize: 13, padding: '9px 20px' }}>
                  ابدأ الآن
                </button>
              </Link>
            </>
          )
        )}

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="mobile-menu-btn"
          style={{
            background: 'none', border: 'none',
            color: '#D4AF37', cursor: 'pointer',
            display: 'none', padding: 4,
          }}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{
          position: 'absolute', top: '68px', left: 0, right: 0,
          background: 'rgba(11,11,11,0.98)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(212,175,55,0.12)',
          padding: '20px 24px 28px',
          display: 'flex', flexDirection: 'column', gap: '18px',
          zIndex: 999,
        }}>
          {navLinks.map(link => (
            <a key={link.href} href={link.href} style={{
              color: 'rgba(255,255,255,0.8)', textDecoration: 'none',
              fontSize: 16, fontWeight: 500, fontFamily: 'Cairo',
            }} onClick={() => setMenuOpen(false)}>
              {link.label}
            </a>
          ))}
          <div style={{
            borderTop: '1px solid rgba(212,175,55,0.1)',
            paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {user ? (
              <Link to="/dashboard" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                <button className="btn-gold" style={{ width: '100%', fontSize: 15, padding: '12px' }}>
                  لوحة التحكم
                </button>
              </Link>
            ) : (
              <>
                <Link to="/login" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                  <button className="btn-outline-gold" style={{ width: '100%', fontSize: 15, padding: '12px' }}>
                    تسجيل الدخول
                  </button>
                </Link>
                <Link to="/register" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                  <button className="btn-gold" style={{ width: '100%', fontSize: 15, padding: '12px' }}>
                    إنشاء حساب
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .nav-login { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </nav>
  )
}
