import { useState, useEffect, ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAdminStats } from '../../hooks/useData'
import { LogoMark } from '../Logo'
import {
  LayoutDashboard, Users, ArrowDownCircle, ArrowUpCircle, TrendingUp,
  Briefcase, Bot, Wallet, BarChart2, Settings, Shield, Bell, Receipt,
  LogOut, Menu, Activity, Globe, Database, MoreHorizontal, ExternalLink, ChevronRight,
} from 'lucide-react'

type NavItem = { icon: typeof Users; label: string; href: string }

const SECTIONS: { title: string; items: NavItem[] }[] = [
  { title: 'OVERVIEW', items: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: BarChart2, label: 'Traffic', href: '/admin/traffic' },
    { icon: Activity, label: 'Public Statistics', href: '/admin/statistics' },
  ]},
  { title: 'USERS', items: [
    { icon: Users, label: 'Users', href: '/admin/users' },
    { icon: Shield, label: 'KYC Verification', href: '/admin/kyc' },
  ]},
  { title: 'FINANCE', items: [
    { icon: ArrowDownCircle, label: 'Deposits', href: '/admin/deposits' },
    { icon: Wallet, label: 'Payments', href: '/admin/payments' },
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
    { icon: Database, label: 'API Keys', href: '/admin/integrations' },
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
      fontFamily: 'Montserrat', borderRadius: 100, padding: '1px 7px',
      minWidth: 18, textAlign: 'center', boxShadow: '0 0 10px rgba(239,68,68,0.45)',
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
      <div style={{ padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(145deg,rgba(212,175,55,0.16),rgba(212,175,55,0.03))',
          border: '1px solid rgba(212,175,55,0.28)', flexShrink: 0,
        }}><LogoMark size={26} /></div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', fontFamily: 'Montserrat', letterSpacing: 2 }}>ADMIN</div>
          <div style={{ fontSize: 9, color: 'rgba(212,175,55,0.65)', fontFamily: 'Montserrat', letterSpacing: 2.5, marginTop: 2 }}>AL THARAA QUANTUM</div>
        </div>
      </div>

      <nav className="aq-nav" style={{ flex: 1, overflowY: 'auto', padding: '0 10px 8px' }}>
        {SECTIONS.map(section => (
          <div key={section.title} style={{ marginBottom: 4 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)',
              fontFamily: 'Montserrat', letterSpacing: 2.2, padding: '14px 10px 6px',
            }}>{section.title}</div>
            {section.items.map(item => {
              const active = isActive(pathname, item.href)
              return (
                <Link key={item.href} to={item.href} onClick={onNavigate} className={`aq-link${active ? ' on' : ''}`}>
                  <span className="aq-ico"><item.icon size={15} /></span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <Badge n={badges[item.href] || 0} />
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg,#D4AF37,#9A7B12)', color: '#0B0B0B', fontWeight: 800, fontSize: 14, fontFamily: 'Montserrat',
          }}>{(name[0] || 'A').toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: 'Montserrat', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: 9, color: 'rgba(212,175,55,0.7)', fontFamily: 'Montserrat', letterSpacing: 1.5 }}>{role.toUpperCase().replace('_', ' ')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/dashboard" onClick={onNavigate} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.18)',
            borderRadius: 9, padding: '9px', color: '#D4AF37', textDecoration: 'none',
            fontSize: 11, fontFamily: 'Montserrat', fontWeight: 600,
          }}><ExternalLink size={13} /> User view</Link>
          <button onClick={onSignOut} aria-label="Sign out" style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
            borderRadius: 9, padding: '9px 12px', color: '#ef4444', cursor: 'pointer', display: 'flex',
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
  const pending = (stats?.pendingDeposits || 0) + (stats?.pendingWithdrawals || 0)

  useEffect(() => { setDrawer(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawer])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const current = ALL_ITEMS.find(i => isActive(pathname, i.href) && (i.href !== '/admin' || pathname === '/admin'))
  const title = current?.label || 'Admin'
  const group = SECTIONS.find(s => s.items.some(i => i === current))?.title || 'ADMIN'
  const sidebarProps = {
    pathname, badges,
    name: profile?.full_name || profile?.email || 'Admin',
    role: profile?.role || 'admin',
    onSignOut: handleSignOut,
  }
  const moreActive = !BOTTOM.some(h => isActive(pathname, h))

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1200px 500px at 70% -10%,rgba(212,175,55,0.06),transparent 60%),#0B0B0B' }}>
      <aside className="aq-sidebar" style={{
        width: 248, background: 'linear-gradient(180deg,#101010,#0a0a0a)', borderRight: '1px solid rgba(255,255,255,0.06)',
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
            position: 'fixed', left: 0, top: 0, bottom: 0, width: 288, maxWidth: '86vw',
            background: '#0d0d0d', zIndex: 301, borderRight: '1px solid rgba(212,175,55,0.15)',
            animation: 'aqSlide .22s ease-out',
          }}>
            <SidebarContent {...sidebarProps} onNavigate={() => setDrawer(false)} />
          </div>
        </>
      )}

      <main className="aq-main" style={{ marginLeft: 248, minHeight: '100vh' }}>
        <header style={{
          height: 60, background: 'rgba(11,11,11,0.85)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button className="aq-menu" onClick={() => setDrawer(true)} aria-label="Open menu" style={{
              display: 'none', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 9, color: '#D4AF37',
              cursor: 'pointer', padding: 6,
            }}><Menu size={20} /></button>
            <div style={{ minWidth: 0 }}>
              <div className="aq-crumb" style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                {group}<ChevronRight size={10} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: 'Montserrat', lineHeight: 1.2 }}>{title}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {pending > 0 && (
              <Link to={stats?.pendingWithdrawals ? '/admin/withdrawals' : '/admin/deposits'} style={{
                display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', padding: '6px 10px', borderRadius: 100,
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b',
                fontSize: 11, fontWeight: 700, fontFamily: 'Montserrat',
              }}><Bell size={13} />{pending}<span className="aq-online"> pending</span></Link>
            )}
            <Link to="/" target="_blank" className="aq-online" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'Montserrat', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}><ExternalLink size={12} /> Site</Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 100, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
              <span className="aq-online" style={{ fontSize: 10, color: '#10b981', fontFamily: 'Montserrat', letterSpacing: 1, fontWeight: 700 }}>LIVE</span>
            </div>
          </div>
        </header>

        <div key={pathname} className="aq-content aq-page" style={{ padding: '26px 30px', maxWidth: 1320, margin: '0 auto' }}>{children}</div>
      </main>

      <nav className="aq-bottom" style={{
        display: 'none', position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 200,
        background: 'rgba(13,13,13,0.96)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
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
              {active && <span style={{ position: 'absolute', top: 0, width: 28, height: 3, borderRadius: '0 0 4px 4px', background: '#D4AF37' }} />}
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
        @keyframes aqSlide { from { transform: translateX(-24px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes aqPage { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        .aq-page { animation: aqPage .25s ease-out; }
        .aq-nav::-webkit-scrollbar { width: 6px }
        .aq-nav::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.18); border-radius: 3px }
        .aq-link { display: flex; align-items: center; gap: 11px; padding: 8px 10px; margin: 1px 0; border-radius: 10px; text-decoration: none;
          color: rgba(255,255,255,0.58); font-size: 13px; font-family: Montserrat; font-weight: 500; position: relative; transition: background .15s, color .15s; }
        .aq-link .aq-ico { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.04); flex-shrink: 0; transition: background .15s, color .15s; }
        @media (hover: hover) { .aq-link:hover { background: rgba(255,255,255,0.05); color: #fff } .aq-link:hover .aq-ico { background: rgba(212,175,55,0.12); color: #D4AF37 } }
        .aq-link.on { background: linear-gradient(90deg,rgba(212,175,55,0.16),rgba(212,175,55,0.04)); color: #D4AF37; font-weight: 700; }
        .aq-link.on .aq-ico { background: rgba(212,175,55,0.2); color: #D4AF37 }
        .aq-link.on::before { content: ''; position: absolute; left: -10px; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: #D4AF37; box-shadow: 0 0 10px #D4AF37; }
        @media (max-width: 900px) {
          .aq-sidebar { display: none !important; }
          .aq-main { margin-left: 0 !important; }
          .aq-menu { display: flex !important; }
          .aq-bottom { display: flex !important; }
          .aq-online, .aq-crumb { display: none !important; }
          .aq-main > header { padding: 0 14px !important; }
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
