import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useUnreadCount } from '../../hooks/useData'
import { LogoMark } from '../Logo'
import {
  LayoutDashboard, TrendingUp, Briefcase, ArrowDownCircle, ArrowUpCircle, Receipt,
  Bell, User, Settings, LogOut, Bot, LineChart, History,
} from 'lucide-react'

const GROUPS = [
  { label: '', items: [{ icon: LayoutDashboard, label: 'لوحة التحكم', href: '/dashboard' }] },
  { label: 'الاستثمار والتداول', items: [
    { icon: Briefcase, label: 'الفرص والاستثمارات', href: '/dashboard/investments' },
    { icon: TrendingUp, label: 'التداول الذكي', href: '/dashboard/trading' },
    { icon: LineChart, label: 'غرفة التداول', href: '/dashboard/trade' },
    { icon: Bot, label: 'إشارات الذكاء الاصطناعي', href: '/dashboard/signals' },
  ] },
  { label: 'المحفظة', items: [
    { icon: ArrowDownCircle, label: 'إيداع', href: '/dashboard/deposit' },
    { icon: ArrowUpCircle, label: 'سحب', href: '/dashboard/withdraw' },
    { icon: History, label: 'المعاملات', href: '/dashboard/transactions' },
    { icon: Receipt, label: 'الفواتير', href: '/dashboard/invoices' },
  ] },
  { label: 'الحساب', items: [
    { icon: Bell, label: 'الإشعارات', href: '/dashboard/notifications', badge: true },
    { icon: User, label: 'الملف الشخصي', href: '/dashboard/profile' },
    { icon: Settings, label: 'الإعدادات', href: '/dashboard/settings' },
  ] },
] as { label: string; items: { icon: typeof Bell; label: string; href: string; badge?: boolean }[] }[]

export default function DashboardSidebar() {
  const { pathname } = useLocation()
  const { profile, signOut } = useAuth()
  const { data: unread } = useUnreadCount()
  const verified = profile?.kyc_status === 'approved'

  return (
    <aside className="dq-aside">
      <div className="dq-brand">
        <LogoMark size={38} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#D4AF37', fontFamily: 'Montserrat', letterSpacing: 2.5 }}>AL THARAA</div>
          <div style={{ fontSize: 9, color: 'rgba(212,175,55,0.55)', fontFamily: 'Montserrat', letterSpacing: 4 }}>QUANTUM</div>
        </div>
      </div>

      <div className="dq-user">
        <div className="dq-avatar">{profile?.full_name?.trim().charAt(0) || 'م'}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Cairo', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name || 'المستخدم'}</div>
          <span className="dq-chip" style={{ color: verified ? '#10b981' : '#f59e0b', background: verified ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)' }}>{verified ? 'حساب موثّق' : 'قيد التحقق'}</span>
        </div>
      </div>

      <nav className="dq-nav">
        {GROUPS.map((g, gi) => (
          <div key={gi} style={{ marginBottom: 6 }}>
            {g.label && <div className="dq-group">{g.label}</div>}
            {g.items.map(item => {
              const active = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href)
              const n = item.badge ? (unread || 0) : 0
              return (
                <Link key={item.href} to={item.href} className={`dq-link${active ? ' on' : ''}`}>
                  <item.icon size={17} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {n > 0 && <span className="dq-badge">{n > 99 ? '99+' : n}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: '12px 14px 16px', borderTop: '1px solid rgba(212,175,55,0.08)' }}>
        <button type="button" onClick={signOut} className="dq-out"><LogOut size={16} />تسجيل الخروج</button>
      </div>

      <style>{`
        .dq-aside { width: 248px; background: linear-gradient(180deg, #0f0f0f, #0B0B0B); border-left: 1px solid rgba(212,175,55,0.12); height: 100dvh; position: fixed; right: 0; top: 0; display: flex; flex-direction: column; z-index: 100; direction: rtl; }
        .dq-brand { padding: 20px 18px 16px; display: flex; align-items: center; gap: 12px; }
        .dq-user { margin: 0 12px 10px; padding: 12px; display: flex; align-items: center; gap: 10px; background: rgba(212,175,55,0.05); border: 1px solid rgba(212,175,55,0.12); border-radius: 14px; }
        .dq-avatar { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg,#F6DE8D,#D4AF37 55%,#9A7B12); color: #0B0B0B; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; font-family: Cairo; flex-shrink: 0; }
        .dq-chip { display: inline-block; margin-top: 3px; font-size: 10px; font-weight: 700; font-family: Cairo; padding: 1px 8px; border-radius: 100px; }
        .dq-nav { flex: 1; overflow-y: auto; padding: 6px 0 10px; }
        .dq-group { font-size: 10px; letter-spacing: .5px; font-weight: 700; color: rgba(255,255,255,0.28); font-family: Cairo; padding: 12px 24px 6px; }
        .dq-link { position: relative; display: flex; align-items: center; gap: 12px; margin: 2px 10px; padding: 10px 14px; border-radius: 11px; text-decoration: none; color: rgba(255,255,255,0.55); font-size: 13px; font-family: Cairo; font-weight: 500; transition: background .18s, color .18s; }
        .dq-link:hover { background: rgba(255,255,255,0.045); color: #fff; }
        .dq-link.on { background: linear-gradient(270deg, rgba(212,175,55,0.17), rgba(212,175,55,0.04)); color: #D4AF37; font-weight: 700; }
        .dq-link.on::before { content: ''; position: absolute; right: -10px; top: 9px; bottom: 9px; width: 3px; border-radius: 3px; background: #D4AF37; box-shadow: 0 0 12px rgba(212,175,55,0.7); }
        .dq-badge { background: #D4AF37; color: #0B0B0B; font-size: 10px; font-weight: 800; font-family: Montserrat; border-radius: 100px; padding: 1px 7px; min-width: 20px; text-align: center; }
        .dq-out { display: flex; align-items: center; gap: 10px; width: 100%; background: none; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: rgba(255,255,255,0.5); cursor: pointer; padding: 10px 14px; font-size: 13px; font-family: Cairo; transition: all .2s; }
        .dq-out:hover { color: #ef4444; border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.06); }
      `}</style>
    </aside>
  )
}
