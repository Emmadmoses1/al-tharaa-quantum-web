import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users, ArrowDownCircle, ArrowUpCircle, TrendingUp, AlertTriangle,
  Wallet, Plus, Bell, Bot, ChevronRight, CheckCircle2, Eye, Radio, ShieldAlert,
} from 'lucide-react'
import {
  useAdminStats, useAdminDeposits, useAdminWithdrawals, useAdminWallets,
} from '../../hooks/useData'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { LogoMark } from '../../components/Logo'

const STATUS_COLORS: Record<string, string> = {
  awaiting_payment: '#9ca3af', detected: '#f59e0b', confirming: '#6366f1',
  confirmed: '#10b981', failed: '#ef4444', expired: '#6b7280', rejected: '#ef4444',
  pending: '#f59e0b', approved: '#6366f1', processing: '#D4AF37',
  completed: '#10b981', cancelled: '#6b7280',
}

const card: React.CSSProperties = {
  background: 'linear-gradient(160deg,rgba(24,24,24,0.95),rgba(16,16,16,0.95))',
  border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16,
}

function MetricCard({ label, value, icon, color, href, loading, sub }: {
  label: string; value: number | string; icon: React.ReactNode
  color: string; href: string; loading: boolean; sub?: string
}) {
  return (
    <Link to={href} className="ad-card" style={{ ...card, textDecoration: 'none', padding: 16, display: 'block', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: '50%', background: `radial-gradient(circle,${color}2e,transparent 70%)` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, position: 'relative' }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: `${color}1c`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
      </div>
      {loading
        ? <Skeleton height={28} width={60} style={{ marginBottom: 6 }} />
        : <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', lineHeight: 1.1, position: 'relative' }}>{value}</div>}
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat', marginTop: 5, position: 'relative' }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color, fontFamily: 'Montserrat', marginTop: 3, position: 'relative' }}>{sub}</div>}
    </Link>
  )
}

function Panel({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <div style={{ ...card, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.75)', fontFamily: 'Montserrat', letterSpacing: 1.5, textTransform: 'uppercase' }}>{title}</div>
        {href && <Link to={href} style={{ fontSize: 11, color: '#D4AF37', fontFamily: 'Montserrat', textDecoration: 'none' }}>View all →</Link>}
      </div>
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.28)', fontFamily: 'Montserrat' }}>{text}</div>
}

function Row({ title, sub, right, status, href }: { title: string; sub: string; right: string; status: string; href: string }) {
  const c = STATUS_COLORS[status] || '#9ca3af'
  return (
    <Link to={href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: 'Cairo', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat' }}>{right}</div>
        <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'Montserrat', color: c, background: `${c}1a`, padding: '2px 7px', borderRadius: 4, display: 'inline-block', marginTop: 3 }}>{status.replace('_', ' ').toUpperCase()}</span>
      </div>
    </Link>
  )
}

function ago(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

type Row_ = Record<string, unknown>
type Traffic = { views: number; sessions: number; live: number; sources: { source: string; sessions: number }[] }
type Pay = { rows: { needs_review: boolean }[] }

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats()
  const { data: deposits, isLoading: depLoading } = useAdminDeposits()
  const { data: withdrawals, isLoading: wdLoading } = useAdminWithdrawals()
  const { data: wallets, isLoading: walletLoading } = useAdminWallets()
  const traffic = useQuery({ queryKey: ['admin-analytics', 1], staleTime: 30000, refetchInterval: 60000, retry: false, queryFn: () => api.get<Traffic>('/api/admin/analytics?days=1') })
  const pays = useQuery({ queryKey: ['admin-payments'], staleTime: 30000, refetchInterval: 60000, retry: false, queryFn: () => api.get<Pay>('/api/admin/nowpayments') })

  const activeWallets = ((wallets || []) as Row_[]).filter(w => w.status === 'active').length
  const pendingDep = stats?.pendingDeposits || 0
  const pendingWd = stats?.pendingWithdrawals || 0
  const review = (pays.data?.rows || []).filter(r => r.needs_review).length
  const t = traffic.data
  const topSource = t?.sources?.[0]

  const alerts: { text: string; href: string; color: string }[] = []
  if (!walletLoading && activeWallets === 0)
    alerts.push({ text: 'No active deposit wallet. Manual deposits are unavailable until you add one.', href: '/admin/wallets', color: '#f59e0b' })
  if (review > 0)
    alerts.push({ text: `${review} NOWPayments payment${review > 1 ? 's' : ''} need your review (partial or unusual amount).`, href: '/admin/payments', color: '#ef4444' })
  if (pendingWd > 0)
    alerts.push({ text: `${pendingWd} withdrawal${pendingWd > 1 ? 's' : ''} waiting for review.`, href: '/admin/withdrawals', color: '#f59e0b' })
  if (pendingDep > 0)
    alerts.push({ text: `${pendingDep} deposit${pendingDep > 1 ? 's' : ''} awaiting payment or verification.`, href: '/admin/deposits', color: '#6366f1' })

  const actions = [
    { icon: <Plus size={18} />, label: 'New opportunity', href: '/admin/opportunities' },
    { icon: <Wallet size={18} />, label: 'Payments', href: '/admin/payments' },
    { icon: <Bot size={18} />, label: 'Add AI signal', href: '/admin/ai' },
    { icon: <Bell size={18} />, label: 'Send notice', href: '/admin/notifications' },
  ]
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      {/* Hero */}
      <div style={{ ...card, padding: '20px 22px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden', borderColor: 'rgba(212,175,55,0.2)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(500px 160px at 90% 0%,rgba(212,175,55,0.14),transparent 70%)', pointerEvents: 'none' }} />
        <LogoMark size={46} />
        <div style={{ position: 'relative', minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', margin: 0 }}>{greet}</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat', margin: '4px 0 0' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · live platform status
          </p>
        </div>
      </div>

      {/* Needs attention */}
      <div style={{ marginBottom: 18 }}>
        {alerts.length === 0 && !isLoading && !walletLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 12 }}>
            <CheckCircle2 size={16} color="#10b981" />
            <span style={{ fontSize: 12, color: '#10b981', fontFamily: 'Montserrat' }}>All clear. Nothing needs your attention.</span>
          </div>
        ) : alerts.map((a, i) => (
          <Link key={i} to={a.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', marginBottom: 8, background: `${a.color}0f`, border: `1px solid ${a.color}33`, borderRadius: 12, textDecoration: 'none' }}>
            {review > 0 && a.href === '/admin/payments' ? <ShieldAlert size={16} color={a.color} style={{ flexShrink: 0 }} /> : <AlertTriangle size={16} color={a.color} style={{ flexShrink: 0 }} />}
            <span style={{ fontSize: 12, color: a.color, fontFamily: 'Montserrat', flex: 1, lineHeight: 1.5 }}>{a.text}</span>
            <ChevronRight size={16} color={a.color} />
          </Link>
        ))}
      </div>

      {/* Metrics */}
      <div className="ad-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <MetricCard label="Total users" value={stats?.totalUsers || 0} icon={<Users size={18} />} color="#D4AF37" href="/admin/users" loading={isLoading} />
        <MetricCard label="Pending deposits" value={pendingDep} icon={<ArrowDownCircle size={18} />} color="#10b981" href="/admin/deposits" loading={isLoading} />
        <MetricCard label="Pending withdrawals" value={pendingWd} icon={<ArrowUpCircle size={18} />} color="#6366f1" href="/admin/withdrawals" loading={isLoading} />
        <MetricCard label="Active investments" value={stats?.activeInvestments || 0} icon={<TrendingUp size={18} />} color="#D4AF37" href="/admin/allocations" loading={isLoading} />
      </div>
      <div className="ad-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        <MetricCard label="Visits today" value={t ? t.sessions : '–'} icon={<Eye size={18} />} color="#38bdf8" href="/admin/traffic" loading={traffic.isLoading} sub={topSource ? `Top source: ${topSource.source}` : undefined} />
        <MetricCard label="Page views today" value={t ? t.views : '–'} icon={<Eye size={18} />} color="#a78bfa" href="/admin/traffic" loading={traffic.isLoading} />
        <MetricCard label="Online now" value={t ? t.live : '–'} icon={<Radio size={18} />} color="#10b981" href="/admin/traffic" loading={traffic.isLoading} />
        <MetricCard label="Payments to review" value={pays.data ? review : '–'} icon={<ShieldAlert size={18} />} color={review ? '#ef4444' : '#9ca3af'} href="/admin/payments" loading={pays.isLoading} />
      </div>

      {/* Quick actions */}
      <div className="ad-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>
        {actions.map(a => (
          <Link key={a.label} to={a.href} className="ad-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.18)', borderRadius: 12, textDecoration: 'none', color: '#D4AF37', fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat' }}>{a.icon}{a.label}</Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="ad-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Panel title="Recent deposits" href="/admin/deposits">
          {depLoading ? <Skeleton height={44} /> : !deposits || deposits.length === 0 ? (
            <Empty text="No deposits yet" />
          ) : (deposits as Row_[]).slice(0, 5).map(d => {
            const p = d.profiles as { full_name?: string; email?: string } | null
            return (
              <Row key={d.id as string} href="/admin/deposits"
                title={p?.full_name || p?.email || 'Unknown'}
                sub={`${d.asset} · ${d.network} · ${d.purpose} · ${ago(d.created_at as string)}`}
                right={d.amount ? String(d.amount) : '—'}
                status={d.status as string} />
            )
          })}
        </Panel>

        <Panel title="Recent withdrawals" href="/admin/withdrawals">
          {wdLoading ? <Skeleton height={44} /> : !withdrawals || withdrawals.length === 0 ? (
            <Empty text="No withdrawal requests yet" />
          ) : (withdrawals as Row_[]).slice(0, 5).map(w => {
            const p = w.profiles as { full_name?: string; email?: string } | null
            return (
              <Row key={w.id as string} href="/admin/withdrawals"
                title={p?.full_name || p?.email || 'Unknown'}
                sub={`${w.asset} · ${w.network} · ${ago(w.created_at as string)}`}
                right={`${Number(w.amount)} ${w.asset}`}
                status={w.status as string} />
            )
          })}
        </Panel>
      </div>

      <style>{`
        .ad-card { transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
        @media (hover: hover) { .ad-card:hover { transform: translateY(-2px); border-color: rgba(212,175,55,0.4) !important; box-shadow: 0 10px 28px rgba(0,0,0,0.4); } }
        @media (max-width: 900px) {
          .ad-metrics { grid-template-columns: 1fr 1fr !important; }
          .ad-actions { grid-template-columns: 1fr 1fr !important; }
          .ad-two { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
