import { useState, useEffect, ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAdminStats } from '../../hooks/useData'
import {
  LayoutDashboard, Users, ArrowDownCircle, ArrowUpCircle, TrendingUp,
  Briefcase, Bot, Wallet, BarChart2, Settings, Shield, Bell, Receipt,
  LogOut, Menu, X, Activity, Globe, Database, MoreHorizontal, ExternalLink,
} from 'lucide-react'

type NavItem = { icon: typeof Users; label: string; href: string }

const SECTIONS: { title: string; items: NavItem[] }[] = [
  { title: 'OVERVIEW', items: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: Activity, label: 'Public Statistics', href: '/admin/statistics' },
  ]},
  { title: 'USERS', items: [
    { icon: Users, label: 'Users', href: '/admin/users' },
    { icon: Shield, label: 'KYC Verification', href: '/admin/kyc' },
  ]},
  { title: 'FINANCE', items: [
    { icon: ArrowDownCircle, label: 'Deposits', href: '/admin/deposits' },
    { icon: ArrowUpCircle, label: 'Withdrawals', href: '/admin/withdrawals' },
    { icon: Receipt, label: 'Transactions', href: '/admin/transactions' },
    { icon: Database, label: 'Ledger', href: '/admin/ledger' },
    { icon: Shield, label: 'Reserves Check', href: '/admin/reserves' },
    { icon: Wallet, label: 'User Balances', href: '/admin/balances' },
  ]},
  { title: 'INVESTMENT', items: [
    { icon: TrendingUp, label: 'Opportunities', href: '/admin/opportunities' },
    { icon: Briefcase, label: 'Allocations', href: '/admin/allocations' },
  ]},
  { title: 'AI TRADING', items: [
    { icon: Bot, label: 'Signal Engine', href: '/admin/signal-engine' },
    { icon: Bot, label: 'AI Overview', href: '/admin/ai' },
    { icon: BarChart2, label: 'Strategies', href: '/admin/strategies' },
    { icon: Shield, label: 'Risk Controls', href: '/admin/risk' },
  ]},
  { title: 'PLATFORM', items: [
    { icon: Wallet, label: 'Deposit Wallets', href: '/admin/wallets' },
    { icon: Globe, label: 'Currencies', href: '/admin/currencies' },
    { icon: Bell, label: 'Notifications', href: '/admin/notifications' },
    { icon: Settings, label: 'Settings', href: '/admin/settings' },
  ]},
]

const ALL_ITEMS = SECTIONS.flatMap(s => s.items)
const BOTTOM = ['/admin', '/admin/users', '/admin/deposits', '/admin/withdrawals']

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
}

function Badge({ n }: { n: number }) {
  if (!n) return null
  return (
    <span style={{
      background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700,
      fontFamily: 'Montserrat', borderRadius: 100, padding: '1px 6px',
      minWidth: 18, textAlign: 'center',
    }}>{n > 99 ? '99+' : n}</span>
  )
}

function SidebarContent({
  pathname, badges, name, role, onSignOut, onNavigate,
}: {
  pathname: string
  badges: Record<string, number>
  name: string
  role: string
  onSignOut: () => void
  onNavigate?: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '18px 16px', borderBottom: '1px solid rgba(212,175,55,0.08)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 34, height: 34, background: 'linear-gradient(135deg,#D4AF37,#E8CC6A)',
          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 13, color: '#0B0B0B', fontFamily: 'Montserrat',
        }}>AQ</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat', letterSpacing: 2 }}>ADMIN</div>
          <div style={{ fontSize: 9, color: 'rgba(212,175,55,0.45)', fontFamily: 'Montserrat', letterSpacing: 3 }}>AL THARAA QUANTUM</div>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {SECTIONS.map(section => (
          <div key={section.title} style={{ marginBottom: 2 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'rgba(212,175,55,0.35)',
              fontFamily: 'Montserrat', letterSpacing: 2, padding: '12px 18px 4px',
            }}>{section.title}</div>
            {section.items.map(item => {
              const active = isActive(pathname, item.href)
              return (
                <Link key={item.href} to={item.href} onClick={onNavigate} style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '11px 18px', textDecoration: 'none',
                  color: active ? '#D4AF37' : 'rgba(255,255,255,0.55)',
                  background: active ? 'rgba(212,175,55,0.09)' : 'transparent',
                  borderLeft: `3px solid ${active ? '#D4AF37' : 'transparent'}`,
                  fontSize: 13, fontFamily: 'Montserrat', fontWeight: active ? 600 : 400,
                }}>
                  <item.icon size={16} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <Badge n={badges[item.href] || 0} />
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: 14, borderTop: '1px solid rgba(212,175,55,0.08)' }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: 'Montserrat',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name}</div>
          <div style={{ fontSize: 9, color: 'rgba(212,175,55,0.55)', fontFamily: 'Montserrat', letterSpacing: 1 }}>
            {role.toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/dashboard" onClick={onNavigate} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)',
            borderRadius: 8, padding: '9px', color: '#D4AF37', textDecoration: 'none',
            fontSize: 11, fontFamily: 'Montserrat',
          }}><ExternalLink size={13} /> User view</Link>
          <button onClick={onSignOut} aria-label="Sign out" style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8, padding: '9px 12px', color: '#ef4444', cursor: 'pointer', display: 'flex',
          }}><LogOut size={14} /></button>
        </div>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { data: stats } = useAdminStats()
  const [drawer, setDrawer] = useState(false)

  const badges: Record<string, number> = {
    '/admin/deposits': stats?.pendingDeposits || 0,
    '/admin/withdrawals': stats?.pendingWithdrawals || 0,
  }

  useEffect(() => { setDrawer(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawer])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const title = ALL_ITEMS.find(i => isActive(pathname, i.href) && (i.href !== '/admin' || pathname === '/admin'))?.label || 'Admin'
  const sidebarProps = {
    pathname, badges,
    name: profile?.full_name || profile?.email || 'Admin',
    role: profile?.role || 'admin',
    onSignOut: handleSignOut,
  }
  const moreActive = !BOTTOM.some(h => isActive(pathname, h))

  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0B' }}>
      <aside className="aq-sidebar" style={{
        width: 232, background: '#0d0d0d', borderRight: '1px solid rgba(212,175,55,0.08)',
        height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 100,
      }}>
        <SidebarContent {...sidebarProps} />
      </aside>

      {drawer && (
        <>
          <div onClick={() => setDrawer(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300,
            backdropFilter: 'blur(3px)',
          }} />
          <div style={{
            position: 'fixed', left: 0, top: 0, bottom: 0, width: 280, maxWidth: '85vw',
            background: '#0d0d0d', zIndex: 301, borderRight: '1px solid rgba(212,175,55,0.15)',
          }}>
            <SidebarContent {...sidebarProps} onNavigate={() => setDrawer(false)} />
          </div>
        </>
      )}

      <main className="aq-main" style={{ marginLeft: 232, minHeight: '100vh' }}>
        <header style={{
          height: 56, background: 'rgba(11,11,11,0.96)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(212,175,55,0.08)', position: 'sticky', top: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="aq-menu" onClick={() => setDrawer(true)} aria-label="Open menu" style={{
              display: 'none', background: 'none', border: 'none', color: '#D4AF37',
              cursor: 'pointer', padding: 4,
            }}><Menu size={22} /></button>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'Montserrat' }}>{title}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span className="aq-online" style={{ fontSize: 10, color: '#10b981', fontFamily: 'Montserrat', letterSpacing: 1 }}>ONLINE</span>
          </div>
        </header>

        <div className="aq-content" style={{ padding: '24px 28px' }}>{children}</div>
      </main>

      <nav className="aq-bottom" style={{
        display: 'none', position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 200,
        background: 'rgba(13,13,13,0.98)', backdropFilter: 'blur(14px)',
        borderTop: '1px solid rgba(212,175,55,0.15)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {BOTTOM.map(href => {
          const item = ALL_ITEMS.find(i => i.href === href)!
          const active = isActive(pathname, href)
          return (
            <Link key={href} to={href} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '9px 0', textDecoration: 'none', position: 'relative',
              color: active ? '#D4AF37' : 'rgba(255,255,255,0.45)',
            }}>
              <div style={{ position: 'relative' }}>
                <item.icon size={20} />
                {!!badges[href] && (
                  <span style={{
                    position: 'absolute', top: -5, right: -9, background: '#ef4444', color: '#fff',
                    fontSize: 9, fontWeight: 700, borderRadius: 100, padding: '0 5px', fontFamily: 'Montserrat',
                  }}>{badges[href]}</span>
                )}
              </div>
              <span style={{ fontSize: 10, fontFamily: 'Montserrat', fontWeight: active ? 700 : 400 }}>
                {item.label === 'Dashboard' ? 'Home' : item.label}
              </span>
            </Link>
          )
        })}
        <button onClick={() => setDrawer(true)} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          padding: '9px 0', background: 'none', border: 'none', cursor: 'pointer',
          color: moreActive ? '#D4AF37' : 'rgba(255,255,255,0.45)',
        }}>
          <MoreHorizontal size={20} />
          <span style={{ fontSize: 10, fontFamily: 'Montserrat' }}>More</span>
        </button>
      </nav>

      <style>{`
        @media (max-width: 900px) {
          .aq-sidebar { display: none !important; }
          .aq-main { margin-left: 0 !important; }
          .aq-menu { display: flex !important; }
          .aq-bottom { display: flex !important; }
          .aq-online { display: none; }
          .aq-content { padding: 16px 14px 96px !important; }

          /* Wide tables scroll sideways instead of breaking the page */
          .aq-content div[style*="overflow: hidden"] { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
          .aq-content div[style*="overflow: hidden"] > div[style*="grid-template-columns"] { min-width: 720px; }

          /* Side detail panels stack under the table */
          .aq-content div[style*="grid-template-columns: 1fr 320px"] { grid-template-columns: 1fr !important; }
          .aq-content div[style*="grid-template-columns: 200px 1fr"] { grid-template-columns: 1fr !important; }

          /* Modals fit the screen and scroll */
          .aq-content div[style*="position: fixed"] { padding: 12px !important; align-items: flex-start !important; overflow-y: auto !important; }
          .aq-content div[style*="position: fixed"] > div { padding: 20px !important; max-width: 100% !important; margin: 0 auto; }
          .aq-content div[style*="position: fixed"] div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }

          /* 16px inputs stop iOS/Android zoom on focus; bigger tap targets */
          .aq-content input, .aq-content select, .aq-content textarea { font-size: 16px !important; }
          .aq-content button { min-height: 38px; }
          .aq-content h1 { font-size: 19px !important; }
        }
      `}</style>
    </div>
  )
}
