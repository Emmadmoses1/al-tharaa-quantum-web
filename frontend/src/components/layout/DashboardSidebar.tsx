import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useUnreadCount } from '../../hooks/useData'
import {
  LayoutDashboard, TrendingUp, Briefcase,
  ArrowDownCircle, ArrowUpCircle, Receipt,
  Bell, User, Settings, LogOut, Bot,
} from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: 'لوحة التحكم', href: '/dashboard' },
  { icon: Briefcase, label: 'استثماراتي', href: '/dashboard/investments' },
  { icon: TrendingUp, label: 'التداول الذكي', href: '/dashboard/trading' },
  { icon: Bot, label: 'إشارات الذكاء الاصطناعي', href: '/dashboard/signals' },
  { icon: ArrowDownCircle, label: 'إيداع', href: '/dashboard/deposit' },
  { icon: ArrowUpCircle, label: 'سحب', href: '/dashboard/withdraw' },
  { icon: Receipt, label: 'المعاملات', href: '/dashboard/transactions' },
  { icon: Bell, label: 'الإشعارات', href: '/dashboard/notifications', badge: true },
  { icon: User, label: 'الملف الشخصي', href: '/dashboard/profile' },
  { icon: Settings, label: 'الإعدادات', href: '/dashboard/settings' },
]

export default function DashboardSidebar() {
  const { pathname } = useLocation()
  const { profile, signOut } = useAuth()
  const { data: unreadCount } = useUnreadCount()

  return (
    <aside style={{
      width: 240,
      background: 'rgba(11,11,11,0.97)',
      borderLeft: '1px solid rgba(212,175,55,0.1)',
      height: '100dvh',
      position: 'fixed',
      right: 0,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      direction: 'rtl',
    }}>
      {/* Logo */}
      <div style={{
        padding: '22px 20px',
        borderBottom: '1px solid rgba(212,175,55,0.08)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 36, height: 36,
          background: 'linear-gradient(135deg,#D4AF37,#E8CC6A)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 14, color: '#0B0B0B',
          fontFamily: 'Montserrat', flexShrink: 0,
        }}>AQ</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat', letterSpacing: 2 }}>
            AL THARAA
          </div>
          <div style={{ fontSize: 9, color: 'rgba(212,175,55,0.5)', fontFamily: 'Montserrat', letterSpacing: 3 }}>
            QUANTUM
          </div>
        </div>
      </div>

      {/* User info */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(212,175,55,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg,rgba(212,175,55,0.2),rgba(212,175,55,0.05))',
            border: '1px solid rgba(212,175,55,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#D4AF37',
            fontFamily: 'Cairo', flexShrink: 0,
          }}>
            {profile?.full_name?.charAt(0) || 'م'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#fff',
              fontFamily: 'Cairo', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {profile?.full_name || 'المستخدم'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo' }}>
              {profile?.kyc_status === 'approved' ? '✓ موثّق' : 'قيد التحقق'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
        {navItems.map(item => {
          const active = pathname === item.href
          const badgeCount = item.badge ? (unreadCount || 0) : 0
          return (
            <Link
              key={item.href}
              to={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 20px',
                textDecoration: 'none',
                color: active ? '#D4AF37' : 'rgba(255,255,255,0.5)',
                background: active ? 'rgba(212,175,55,0.08)' : 'transparent',
                borderRight: `2px solid ${active ? '#D4AF37' : 'transparent'}`,
                transition: 'all 0.2s',
                fontSize: 13, fontFamily: 'Cairo',
                fontWeight: active ? 600 : 400,
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.04)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                }
              }}
            >
              <item.icon size={16} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {badgeCount > 0 && (
                <span style={{
                  background: '#D4AF37', color: '#0B0B0B',
                  fontSize: 10, fontWeight: 700,
                  fontFamily: 'Montserrat',
                  borderRadius: 100, padding: '1px 6px',
                  minWidth: 18, textAlign: 'center',
                }}>
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(212,175,55,0.08)' }}>
        <button
          onClick={signOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
            padding: '8px 0', fontSize: 13, fontFamily: 'Cairo',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
        >
          <LogOut size={16} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  )
}
