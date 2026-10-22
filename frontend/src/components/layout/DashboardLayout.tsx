import { useState, useEffect, ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Bell, LayoutDashboard, Briefcase, TrendingUp, ArrowDownCircle, MoreHorizontal, X } from 'lucide-react'
import DashboardSidebar from './DashboardSidebar'
import ErrorBoundary from '../ui/ErrorBoundary'
import PushPrompt from '../PushPrompt'
import { LogoMark } from '../Logo'
import { useAuth } from '../../context/AuthContext'
import { useUnreadCount } from '../../hooks/useData'

const TABS = [
  { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { href: '/dashboard/investments', label: 'الفرص', icon: Briefcase },
  { href: '/dashboard/deposit', label: 'إيداع', icon: ArrowDownCircle, center: true },
  { href: '/dashboard/trading', label: 'تداول', icon: TrendingUp },
]

const TITLES: [string, string][] = [
  ['/dashboard/investments', 'الفرص والاستثمارات'], ['/dashboard/trading', 'التداول الذكي'], ['/dashboard/trade', 'غرفة التداول'],
  ['/dashboard/signals', 'إشارات الذكاء الاصطناعي'], ['/dashboard/deposit', 'إيداع'], ['/dashboard/withdraw', 'سحب'],
  ['/dashboard/transactions', 'المعاملات'], ['/dashboard/invoices', 'الفواتير'], ['/dashboard/notifications', 'الإشعارات'],
  ['/dashboard/profile', 'الملف الشخصي'], ['/dashboard/settings', 'الإعدادات'], ['/dashboard', 'لوحة التحكم'],
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { profile } = useAuth()
  const { data: unread } = useUnreadCount()
  const [drawer, setDrawer] = useState(false)

  useEffect(() => { setDrawer(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawer])

  const active = (h: string) => (h === '/dashboard' ? pathname === h : pathname.startsWith(h))
  const moreActive = !TABS.some(t => active(t.href))
  const title = (TITLES.find(([p]) => (p === '/dashboard' ? pathname === p : pathname.startsWith(p))) || ['', 'لوحة التحكم'])[1]
  const today = new Date().toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' })

  const bell = (
    <Link to="/dashboard/notifications" aria-label="الإشعارات" className="dq-bell">
      <Bell size={19} />
      {!!unread && <span className="dq-dot">{unread > 99 ? '99+' : unread}</span>}
    </Link>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1100px 500px at 85% -10%, rgba(212,175,55,0.07), transparent 60%), #0B0B0B', direction: 'rtl' }}>
      <div className="dl-side"><DashboardSidebar /></div>

      {drawer && (
        <>
          <div onClick={() => setDrawer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 300, backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 301 }}>
            <DashboardSidebar />
            <button type="button" aria-label="إغلاق" onClick={() => setDrawer(false)} style={{ position: 'absolute', top: 14, left: -48, width: 38, height: 38, borderRadius: 10, background: 'rgba(11,11,11,0.9)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} /></button>
          </div>
        </>
      )}

      <main className="dl-main" style={{ marginRight: 248, minHeight: '100vh' }}>
        <header className="dq-top">
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', lineHeight: 1.3 }}>{title}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>{today}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {bell}
            <Link to="/dashboard/profile" aria-label="الملف الشخصي" className="dq-me">{profile?.full_name?.trim().charAt(0) || 'م'}</Link>
          </div>
        </header>

        <header className="dl-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoMark size={30} />
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontFamily: 'Cairo' }}>{title}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {bell}
            <button type="button" onClick={() => setDrawer(true)} aria-label="القائمة" style={{ background: 'none', border: 'none', color: '#D4AF37', cursor: 'pointer', padding: 8, display: 'flex' }}><Menu size={22} /></button>
          </div>
        </header>

        <div className="dl-content" style={{ padding: '24px 32px 40px', maxWidth: 1280, margin: '0 auto' }}><PushPrompt /><ErrorBoundary key={pathname}>{children}</ErrorBoundary></div>
      </main>

      <nav className="dl-bottom">
        {TABS.map(t => (
          t.center ? (
            <Link key={t.href} to={t.href} aria-label={t.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', marginTop: -20 }}>
              <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#F6DE8D,#D4AF37 55%,#9A7B12)', color: '#0B0B0B', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(212,175,55,0.45)', border: '3px solid #0B0B0B' }}><t.icon size={24} /></span>
              <span style={{ fontSize: 10, fontFamily: 'Cairo', fontWeight: 700, color: '#D4AF37', marginTop: 2 }}>{t.label}</span>
            </Link>
          ) : (
            <Link key={t.href} to={t.href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '9px 0', textDecoration: 'none', color: active(t.href) ? '#D4AF37' : 'rgba(255,255,255,0.45)' }}>
              <t.icon size={20} />
              <span style={{ fontSize: 10, fontFamily: 'Cairo', fontWeight: active(t.href) ? 700 : 400 }}>{t.label}</span>
            </Link>
          )
        ))}
        <button type="button" onClick={() => setDrawer(true)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '9px 0', background: 'none', border: 'none', cursor: 'pointer', color: moreActive ? '#D4AF37' : 'rgba(255,255,255,0.45)' }}>
          <MoreHorizontal size={20} />
          <span style={{ fontSize: 10, fontFamily: 'Cairo' }}>المزيد</span>
        </button>
      </nav>

      <style>{`
        .dq-top { position: sticky; top: 0; z-index: 50; height: 68px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; background: rgba(11,11,11,0.82); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-bottom: 1px solid rgba(212,175,55,0.1); }
        .dl-top { display: none; height: 58px; align-items: center; justify-content: space-between; padding: 0 12px; background: rgba(11,11,11,0.94); backdrop-filter: blur(14px); border-bottom: 1px solid rgba(212,175,55,0.1); position: sticky; top: 0; z-index: 50; }
        .dl-bottom { display: none; position: fixed; left: 0; right: 0; bottom: 0; z-index: 200; align-items: flex-end; background: rgba(13,13,13,0.98); backdrop-filter: blur(14px); border-top: 1px solid rgba(212,175,55,0.15); padding-bottom: env(safe-area-inset-bottom); }
        .dq-bell { position: relative; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #D4AF37; background: rgba(212,175,55,0.07); border: 1px solid rgba(212,175,55,0.18); text-decoration: none; }
        .dq-dot { position: absolute; top: -5px; left: -5px; background: #ef4444; color: #fff; font-size: 9px; font-weight: 800; border-radius: 100px; padding: 1px 5px; font-family: Montserrat; }
        .dq-me { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg,#F6DE8D,#D4AF37 55%,#9A7B12); color: #0B0B0B; font-weight: 900; font-family: Cairo; text-decoration: none; }
        @media (max-width: 768px) {
          .dl-side { display: none !important; }
          .dl-main { margin-right: 0 !important; }
          .dq-top { display: none !important; }
          .dl-top { display: flex !important; }
          .dl-bottom { display: flex !important; }
          .dl-content { padding: 16px 14px 100px !important; }
        }
      `}</style>
    </div>
  )
}
