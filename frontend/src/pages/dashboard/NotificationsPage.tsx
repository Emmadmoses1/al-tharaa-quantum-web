import { Bell, ArrowDownCircle, TrendingUp, Bot, AlertTriangle, Shield, CheckCheck, Check } from 'lucide-react'
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from '../../hooks/useData'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'
import { useState } from 'react'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  deposit: <ArrowDownCircle size={16} color="#10b981" />,
  investment: <TrendingUp size={16} color="#D4AF37" />,
  trading: <Bot size={16} color="#6366f1" />,
  security: <Shield size={16} color="#ef4444" />,
  alert: <AlertTriangle size={16} color="#f59e0b" />,
  system: <Bell size={16} color="rgba(255,255,255,0.4)" />,
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `منذ ${hrs} ساعة`
  const days = Math.floor(hrs / 24)
  return `منذ ${days} يوم`
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState('all')
  const { data: notifications, isLoading, isError, refetch } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllRead()

  const filtered = filter === 'all'
    ? (notifications || [])
    : (notifications || []).filter(n => n.type === filter)

  const unreadCount = (notifications || []).filter(n => !n.is_read).length

  return (
    <div style={{ direction: 'rtl', maxWidth: 680 }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 28,
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}>
            الإشعارات
            {unreadCount > 0 && (
              <span style={{
                marginRight: 10, fontSize: 13,
                background: '#D4AF37', color: '#0B0B0B',
                borderRadius: 100, padding: '2px 10px',
                fontWeight: 700, fontFamily: 'Montserrat',
              }}>{unreadCount}</span>
            )}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo' }}>
            جميع إشعاراتك من الثراء كوانتوم
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none',
              border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: 7, padding: '8px 14px',
              cursor: 'pointer', color: '#D4AF37',
              fontSize: 12, fontFamily: 'Cairo',
              opacity: markAll.isPending ? 0.6 : 1,
            }}
          >
            <CheckCheck size={14} />
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'الكل' },
          { key: 'deposit', label: 'إيداعات' },
          { key: 'investment', label: 'استثمارات' },
          { key: 'trading', label: 'تداول' },
          { key: 'security', label: 'أمان' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            background: filter === f.key ? 'rgba(212,175,55,0.12)' : 'rgba(44,44,44,0.3)',
            border: `1px solid ${filter === f.key ? '#D4AF37' : 'rgba(212,175,55,0.1)'}`,
            borderRadius: 100, padding: '6px 14px', cursor: 'pointer',
            fontSize: 12, fontFamily: 'Cairo',
            color: filter === f.key ? '#D4AF37' : 'rgba(255,255,255,0.45)',
            transition: 'all 0.2s',
          }}>{f.label}</button>
        ))}
      </div>

      {/* List */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '8px 0' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(212,175,55,0.06)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Skeleton width={38} height={38} borderRadius={50} />
                  <div style={{ flex: 1 }}>
                    <Skeleton height={14} style={{ marginBottom: 8 }} />
                    <Skeleton width="70%" height={12} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '72px 24px', gap: 14, textAlign: 'center',
          }}>
            <div style={{
              width: 60, height: 60,
              background: 'rgba(212,175,55,0.05)',
              border: '1px solid rgba(212,175,55,0.08)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bell size={26} color="rgba(212,175,55,0.25)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo' }}>
              لا توجد إشعارات بعد
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cairo', maxWidth: 280 }}>
              ستظهر إشعاراتك هنا بعد أول نشاط في حسابك
            </div>
          </div>
        ) : (
          filtered.map((notif, i) => (
            <div
              key={notif.id}
              onClick={() => !notif.is_read && markRead.mutate(notif.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '16px 20px',
                borderBottom: i < filtered.length - 1
                  ? '1px solid rgba(212,175,55,0.06)' : 'none',
                background: notif.is_read ? 'transparent' : 'rgba(212,175,55,0.04)',
                cursor: notif.is_read ? 'default' : 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => {
                if (!notif.is_read)
                  (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.07)'
              }}
              onMouseLeave={e => {
                if (!notif.is_read)
                  (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.04)'
              }}
            >
              {/* Icon */}
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(44,44,44,0.6)',
                border: '1px solid rgba(212,175,55,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {TYPE_ICONS[notif.type] || TYPE_ICONS.system}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', gap: 8, marginBottom: 4,
                }}>
                  <div style={{
                    fontSize: 14, fontWeight: notif.is_read ? 500 : 700,
                    color: notif.is_read ? 'rgba(255,255,255,0.7)' : '#fff',
                    fontFamily: 'Cairo', lineHeight: 1.4,
                  }}>
                    {notif.title_ar || notif.title}
                  </div>
                  <div style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.3)',
                    fontFamily: 'Cairo', flexShrink: 0,
                  }}>
                    {timeAgo(notif.created_at)}
                  </div>
                </div>
                <div style={{
                  fontSize: 13, color: 'rgba(255,255,255,0.45)',
                  fontFamily: 'Cairo', lineHeight: 1.6,
                }}>
                  {notif.message_ar || notif.message}
                </div>
              </div>

              {/* Unread dot */}
              {!notif.is_read && (
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#D4AF37', flexShrink: 0, marginTop: 6,
                  boxShadow: '0 0 6px rgba(212,175,55,0.5)',
                }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
