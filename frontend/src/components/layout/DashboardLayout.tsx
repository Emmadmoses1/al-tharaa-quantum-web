import { useState, useEffect, ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Bell, LayoutDashboard, Briefcase, TrendingUp, ArrowDownCircle, MoreHorizontal } from 'lucide-react'
import DashboardSidebar from './DashboardSidebar'
import ErrorBoundary from '../ui/ErrorBoundary'
import { useUnreadCount } from '../../hooks/useData'

const TABS = [
  { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { href: '/dashboard/investments', label: 'استثمار', icon: Briefcase },
  { href: '/dashboard/trading', label: 'تداول', icon: TrendingUp },
  { href: '/dashboard/deposit', label: 'إيداع', icon: ArrowDownCircle },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { data: unread } = useUnreadCount()
  const [drawer, setDrawer] = useState(false)

  useEffect(() => { setDrawer(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawer])

  const active = (h: string) => (h === '/dashboard' ? pathname === h : pathname.startsWith(h))
  const moreActive = !TABS.some(t => active(t.href))

  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0B', direction: 'rtl' }}>
      <div className="dl-side"><DashboardSidebar /></div>

      {drawer && (
        <>
          <div onClick={() => setDrawer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 301 }}><DashboardSidebar /></div>
        </>
      )}

      <main className="dl-main" style={{ marginRight: 240, minHeight: '100vh' }}>
        <header className="dl-top" style={{
          display: 'none', height: 56, alignItems: 'center', justifyContent: 'space-between', padding: '0 14px',
          background: 'rgba(11,11,11,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(212,175,55,0.1)',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#D4AF37,#E8CC6A)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12, color: '#0B0B0B', fontFamily: 'Montserrat' }}>AQ</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat', letterSpacing: 1.5 }}>AL THARAA</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link to="/dashboard/notifications" aria-label="الإشعارات" style={{ position: 'relative', color: '#D4AF37', padding: 8, display: 'flex' }}>
              <Bell size={21} />
              {!!unread && <span style={{ position: 'absolute', top: 2, left: 2, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 100, padding: '0 5px', fontFamily: 'Montserrat' }}>{unread}</span>}
            </Link>
            <button onClick={() => setDrawer(true)} aria-label="القائمة" style={{ background: 'none', border: 'none', color: '#D4AF37', cursor: 'pointer', padding: 8, display: 'flex' }}><Menu size={22} /></button>
          </div>
        </header>

        <div className="dl-content" style={{ padding: 32 }}><ErrorBoundary key={pathname}>{children}</ErrorBoundary></div>
      </main>

      <nav className="dl-bottom" style={{
        display: 'none', position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 200,
        background: 'rgba(13,13,13,0.98)', backdropFilter: 'blur(14px)', borderTop: '1px solid rgba(212,175,55,0.15)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map(t => (
          <Link key={t.href} to={t.href} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '9px 0',
            textDecoration: 'none', color: active(t.href) ? '#D4AF37' : 'rgba(255,255,255,0.45)',
          }}>
            <t.icon size={20} />
            <span style={{ fontSize: 10, fontFamily: 'Cairo', fontWeight: active(t.href) ? 700 : 400 }}>{t.label}</span>
          </Link>
        ))}
        <button onClick={() => setDrawer(true)} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '9px 0',
          background: 'none', border: 'none', cursor: 'pointer', color: moreActive ? '#D4AF37' : 'rgba(255,255,255,0.45)',
        }}>
          <MoreHorizontal size={20} />
          <span style={{ fontSize: 10, fontFamily: 'Cairo' }}>المزيد</span>
        </button>
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .dl-side { display: none !important; }
          .dl-main { margin-right: 0 !important; }
          .dl-top { display: flex !important; }
          .dl-bottom { display: flex !important; }
          .dl-content { padding: 16px 14px 96px !important; }
        }
      `}</style>
    </div>
  )
}
