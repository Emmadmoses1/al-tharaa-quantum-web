import { Link } from 'react-router-dom'
import {
  TrendingUp, Wallet, Bot, Briefcase, ArrowDownCircle, ArrowUpCircle, AlertTriangle, RefreshCw,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useInvestmentPortfolio, useTradingPortfolio, useDeposits } from '../../hooks/useData'
import { useWalletBalances } from '../../hooks/useWallet'
import { CardSkeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

const fmt = (n: number, asset: string) =>
  `${asset} ${n.toLocaleString('en-US', {
    minimumFractionDigits: ['BTC', 'ETH'].includes(asset) ? 6 : 2,
    maximumFractionDigits: ['BTC', 'ETH'].includes(asset) ? 6 : 2,
  })}`

function Stat({ label, lines, sub, icon, color = '#D4AF37' }: {
  label: string; lines: string[]; sub?: string; icon: React.ReactNode; color?: string
}) {
  return (
    <div className="glass-card" style={{ padding: 20, position: 'relative', overflow: 'hidden', minWidth: 0 }}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 3, background: `linear-gradient(180deg,${color},transparent)` }} />
      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>{icon}</div>
      {lines.length === 0
        ? <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Montserrat', color: 'rgba(255,255,255,0.35)' }}>—</div>
        : lines.map(l => <div key={l} style={{ fontSize: 'clamp(16px,4.5vw,22px)', fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 2, wordBreak: 'break-word' }} dir="ltr">{l}</div>)}
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cairo', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

const linkBtn = (gold: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '11px 18px',
  textDecoration: 'none', borderRadius: 8, fontFamily: 'Cairo', fontWeight: 700, whiteSpace: 'nowrap',
  ...(gold
    ? { background: 'linear-gradient(135deg,#D4AF37,#E8CC6A,#A8871C)', color: '#0B0B0B' }
    : { color: '#D4AF37', border: '1px solid rgba(212,175,55,0.5)' }),
})

export default function DashboardHome() {
  const { profile } = useAuth()
  const wallet = useWalletBalances()
  const inv = useInvestmentPortfolio()
  const trade = useTradingPortfolio()
  const deposits = useDeposits()

  const bal = (type: 'investment' | 'trading') =>
    (wallet.data || []).filter(b => b.ledger_type === type && b.balance !== 0)
  const invBal = bal('investment')
  const tradeBal = bal('trading')

  const allocs = (inv.data || []).filter(a => ['active', 'matured', 'pending'].includes(a.status))
  const byCur: Record<string, { invested: number; value: number }> = {}
  allocs.forEach(a => {
    const c = a.currency || 'BHD'
    byCur[c] ||= { invested: 0, value: 0 }
    byCur[c].invested += Number(a.amount_invested || 0)
    byCur[c].value += Number(a.current_value || a.amount_invested || 0)
  })
  const invLines = Object.entries(byCur).map(([c, v]) => fmt(v.value, c))
  const pnlLines = Object.entries(byCur)
    .filter(([, v]) => v.value !== v.invested)
    .map(([c, v]) => `${v.value - v.invested >= 0 ? '+' : '-'}${fmt(Math.abs(v.value - v.invested), c)}`)

  const pending = (deposits.data || []).filter(d => ['awaiting_payment', 'detected', 'confirming'].includes(d.status))
  const h = new Date().getHours()
  const greeting = h < 12 ? 'صباح الخير' : h < 17 ? 'مساء الخير' : 'مساء النور'
  const refreshing = wallet.isFetching || inv.isFetching || trade.isFetching
  const refreshAll = () => { wallet.refetch(); inv.refetch(); trade.refetch(); deposits.refetch() }

  return (
    <div style={{ direction: 'rtl' }}>
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', marginBottom: 4 }}>{greeting}،</div>
          <h1 style={{ fontSize: 'clamp(20px,5vw,30px)', fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 4 }}>{profile?.full_name || 'المستخدم'} 👋</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>نظرة عامة على محفظتك</p>
        </div>
        <button onClick={refreshAll} aria-label="تحديث" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <RefreshCw size={16} style={{ animation: refreshing ? 'aqspin 0.9s linear infinite' : 'none' }} />
        </button>
      </div>

      {profile && profile.kyc_status !== 'approved' && (
        <Link to="/dashboard/profile" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
          <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#f59e0b', fontFamily: 'Cairo' }}>التحقق من الهوية مطلوب لتفعيل الإيداع والسحب — اضغط للإكمال</span>
        </Link>
      )}

      {pending.length > 0 && (
        <Link to="/dashboard/deposit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textDecoration: 'none', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#818cf8', fontFamily: 'Cairo' }}><ArrowDownCircle size={18} />لديك {pending.length} إيداع قيد المراجعة — سيظهر الرصيد بعد التأكيد</span>
          <span style={{ fontSize: 12, color: '#818cf8', fontFamily: 'Cairo' }}>عرض</span>
        </Link>
      )}

      {wallet.isError && <ErrorState onRetry={() => wallet.refetch()} />}

      <div className="aq-stats">
        {wallet.isLoading ? <><CardSkeleton /><CardSkeleton /></> : <>
          <Stat label="رصيد المحفظة — استثمار" sub="الأموال المودعة والمتاحة" lines={invBal.map(b => fmt(b.balance, b.asset))} icon={<Wallet size={19} color="#D4AF37" />} />
          <Stat label="رصيد المحفظة — تداول" sub="الأموال المودعة للتداول" lines={tradeBal.map(b => fmt(b.balance, b.asset))} icon={<Wallet size={19} color="#10b981" />} color="#10b981" />
        </>}
        {inv.isLoading ? <CardSkeleton /> : <Stat label="قيمة الاستثمارات" sub={allocs.length ? `${allocs.length} استثمار` : 'لا توجد استثمارات'} lines={invLines} icon={<Briefcase size={19} color="#D4AF37" />} />}
        {inv.isLoading ? <CardSkeleton /> : <Stat label="الأرباح/الخسائر" sub="استثمارات فقط" lines={pnlLines} icon={<TrendingUp size={19} color="#D4AF37" />} />}
      </div>

      <div className="aq-two">
        <div className="glass-card" style={{ padding: 20, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Cairo', color: '#fff' }}>محفظة الاستثمار</h2>
            <Link to="/dashboard/investments" style={{ fontSize: 12, color: '#D4AF37', textDecoration: 'none', fontFamily: 'Cairo', padding: 6 }}>عرض الكل</Link>
          </div>
          {inv.isError ? <ErrorState onRetry={() => inv.refetch()} /> : allocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', marginBottom: 14 }}>لا توجد استثمارات بعد</div>
              <Link to="/dashboard/investments" style={linkBtn(false)}>استكشف الفرص</Link>
            </div>
          ) : allocs.slice(0, 3).map(a => (
            <Link key={a.id} to="/dashboard/investments" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, textDecoration: 'none', padding: '12px 14px', marginBottom: 8, background: 'rgba(44,44,44,0.3)', border: '1px solid rgba(212,175,55,0.08)', borderRadius: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: 'Cairo', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.investment_opportunities?.name_ar || a.investment_opportunities?.name || 'استثمار'}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>{a.status}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat', flexShrink: 0 }} dir="ltr">{fmt(Number(a.amount_invested), a.currency || 'BHD')}</div>
            </Link>
          ))}
        </div>

        <div className="glass-card" style={{ padding: 20, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Cairo', color: '#fff' }}>التداول الذكي</h2>
            <Link to="/dashboard/trading" style={{ fontSize: 12, color: '#D4AF37', textDecoration: 'none', fontFamily: 'Cairo', padding: 6 }}>عرض الكل</Link>
          </div>
          {trade.isError ? <ErrorState onRetry={() => trade.refetch()} /> : !trade.data ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Bot size={24} color="rgba(212,175,55,0.4)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', marginBottom: 14 }}>لا يوجد نشاط تداول بعد</div>
              <Link to="/dashboard/deposit" style={linkBtn(false)}>إيداع للتداول</Link>
            </div>
          ) : [
            ['الرصيد المتاح', `USDT ${Number(trade.data.available_balance).toFixed(2)}`],
            ['رأس المال المخصص', `USDT ${Number(trade.data.allocated_capital).toFixed(2)}`],
            ['الربح/الخسارة المحققة', `USDT ${Number(trade.data.realized_pnl).toFixed(2)}`],
            ['حالة الذكاء الاصطناعي', trade.data.ai_status],
          ].map(([k, v], i) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < 3 ? '1px solid rgba(212,175,55,0.06)' : 'none' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo' }}>{k}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#D4AF37', fontFamily: 'Montserrat' }} dir="ltr">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', marginBottom: 14 }}>إجراءات سريعة</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/dashboard/deposit" style={linkBtn(true)}><ArrowDownCircle size={16} />إيداع</Link>
          <Link to="/dashboard/withdraw" style={linkBtn(false)}><ArrowUpCircle size={16} />سحب</Link>
          <Link to="/dashboard/investments" style={linkBtn(false)}><Briefcase size={16} />استثمار</Link>
          <Link to="/dashboard/trading" style={linkBtn(false)}><Bot size={16} />التداول الذكي</Link>
        </div>
      </div>

      <style>{`
        @keyframes aqspin { to { transform: rotate(360deg) } }
        .aq-stats { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px; margin-bottom: 20px; }
        .aq-two { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px; margin-bottom: 20px; }
        @media (max-width: 1024px) { .aq-stats { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (max-width: 768px) { .aq-two { grid-template-columns: minmax(0,1fr); } }
        @media (max-width: 400px) { .aq-stats { grid-template-columns: minmax(0,1fr); } }
      `}</style>
    </div>
  )
}
