import { Link } from 'react-router-dom'
import {
  TrendingUp, Wallet, Bot, Briefcase, ArrowDownCircle, ArrowUpCircle, AlertTriangle, RefreshCw, ArrowLeft, Layers, Clock,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useInvestmentPortfolio, useTradingPortfolio, useDeposits, useOpportunities } from '../../hooks/useData'
import { useWalletBalances } from '../../hooks/useWallet'
import { LogoMark } from '../../components/Logo'
import { CardSkeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

const fmt = (n: number, asset: string) =>
  `${asset} ${n.toLocaleString('en-US', {
    minimumFractionDigits: ['BTC', 'ETH'].includes(asset) ? 6 : 2,
    maximumFractionDigits: ['BTC', 'ETH'].includes(asset) ? 6 : 2,
  })}`

const DEP_STATUS: Record<string, [string, string]> = {
  awaiting_payment: ['بانتظار الدفع', '#9ca3af'], detected: ['تم الرصد', '#6366f1'], confirming: ['قيد التأكيد', '#6366f1'],
  confirmed: ['مؤكد', '#10b981'], expired: ['منتهي', '#6b7280'], cancelled: ['ملغي', '#6b7280'],
}

function Kpi({ label, value, sub, icon, color = '#D4AF37' }: { label: string; value: string; sub?: string; icon: React.ReactNode; color?: string }) {
  return (
    <div className="dq-card" style={{ padding: 18, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo' }}>{label}</span>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      </div>
      <div dir="ltr" style={{ fontSize: 'clamp(16px,4.4vw,21px)', fontWeight: 800, fontFamily: 'Montserrat', color: color === '#D4AF37' ? '#fff' : color, wordBreak: 'break-word', textAlign: 'right' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function DashboardHome() {
  const { profile } = useAuth()
  const wallet = useWalletBalances()
  const inv = useInvestmentPortfolio()
  const trade = useTradingPortfolio()
  const deposits = useDeposits()
  const opps = useOpportunities()

  const bal = (type: 'investment' | 'trading') => (wallet.data || []).filter(b => b.ledger_type === type && b.balance !== 0)
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
  const pnl = Object.entries(byCur).filter(([, v]) => v.value !== v.invested).map(([c, v]) => ({ c, d: v.value - v.invested }))
  const pnlLines = pnl.map(p => `${p.d >= 0 ? '+' : '-'}${fmt(Math.abs(p.d), p.c)}`)
  const pnlColor = pnl.length === 0 ? '#D4AF37' : pnl.every(p => p.d >= 0) ? '#10b981' : pnl.every(p => p.d <= 0) ? '#ef4444' : '#D4AF37'

  const pending = (deposits.data || []).filter(d => ['awaiting_payment', 'detected', 'confirming'].includes(d.status))
  const recent = (deposits.data || []).slice(0, 4)
  const open = (opps.data || []).slice(0, 8)
  const h = new Date().getHours()
  const greeting = h < 12 ? 'صباح الخير' : h < 17 ? 'مساء الخير' : 'مساء النور'
  const refreshing = wallet.isFetching || inv.isFetching || trade.isFetching
  const refreshAll = () => { wallet.refetch(); inv.refetch(); trade.refetch(); deposits.refetch(); opps.refetch() }

  const walletTile = (title: string, rows: typeof invBal, color: string) => (
    <div className="dq-wallet" style={{ borderColor: `${color}33` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo', marginBottom: 8 }}>
        <Wallet size={14} color={color} />{title}
      </div>
      {wallet.isLoading ? <div style={{ height: 26, width: 120, borderRadius: 6, background: 'rgba(255,255,255,0.07)' }} /> : rows.length === 0
        ? <div dir="ltr" style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Montserrat', color: 'rgba(255,255,255,0.35)', textAlign: 'right' }}>0.00</div>
        : rows.map(b => <div key={b.asset} dir="ltr" style={{ fontSize: 'clamp(18px,5vw,26px)', fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', textAlign: 'right', lineHeight: 1.35 }}>{fmt(b.balance, b.asset)}</div>)}
    </div>
  )

  return (
    <div style={{ direction: 'rtl' }}>
      {/* Hero */}
      <div className="dq-hero">
        <div style={{ position: 'absolute', left: -30, bottom: -50, opacity: 0.06, pointerEvents: 'none' }}><LogoMark size={260} /></div>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo' }}>{greeting}،</div>
            <h1 style={{ fontSize: 'clamp(20px,5vw,28px)', fontWeight: 800, fontFamily: 'Cairo', color: '#fff', margin: '2px 0 0' }}>{profile?.full_name || 'المستخدم'}</h1>
          </div>
          <button type="button" onClick={refreshAll} aria-label="تحديث" className="dq-refresh">
            <RefreshCw size={16} style={{ animation: refreshing ? 'aqspin 0.9s linear infinite' : 'none' }} />
          </button>
        </div>
        <div className="dq-wallets" style={{ position: 'relative' }}>
          {walletTile('محفظة الاستثمار', invBal, '#D4AF37')}
          {walletTile('محفظة التداول', tradeBal, '#10b981')}
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
          <Link to="/dashboard/deposit" className="dq-btn gold"><ArrowDownCircle size={16} />إيداع</Link>
          <Link to="/dashboard/withdraw" className="dq-btn"><ArrowUpCircle size={16} />سحب</Link>
          <Link to="/dashboard/investments" className="dq-btn"><Briefcase size={16} />استثمار</Link>
          <Link to="/dashboard/trading" className="dq-btn"><Bot size={16} />التداول الذكي</Link>
        </div>
      </div>

      {profile && profile.kyc_status !== 'approved' && (
        <Link to="/dashboard/profile" className="dq-alert" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)', color: '#f59e0b' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} /><span>التحقق من الهوية مطلوب لتفعيل الإيداع والسحب — اضغط للإكمال</span>
        </Link>
      )}
      {pending.length > 0 && (
        <Link to="/dashboard/deposit" className="dq-alert" style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.25)', color: '#818cf8', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Clock size={18} />لديك {pending.length} إيداع قيد المراجعة — سيظهر الرصيد بعد التأكيد</span>
          <span style={{ fontSize: 12 }}>عرض</span>
        </Link>
      )}
      {wallet.isError && <ErrorState onRetry={() => wallet.refetch()} />}

      {/* KPIs */}
      <div className="dq-kpis">
        {inv.isLoading ? <><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></> : <>
          <Kpi label="قيمة الاستثمارات" value={invLines.length ? invLines.join(' · ') : '—'} sub={allocs.length ? `${allocs.length} استثمار` : 'لا توجد استثمارات'} icon={<Briefcase size={17} color="#D4AF37" />} />
          <Kpi label="الأرباح / الخسائر" value={pnlLines.length ? pnlLines.join(' · ') : '—'} sub="استثمارات فقط" color={pnlColor} icon={<TrendingUp size={17} color={pnlColor} />} />
          <Kpi label="استثمارات نشطة" value={String(allocs.filter(a => a.status === 'active').length)} sub="قيد العمل الآن" icon={<Layers size={17} color="#D4AF37" />} />
          <Kpi label="إيداعات قيد المراجعة" value={String(pending.length)} sub={pending.length ? 'بانتظار التأكيد' : 'لا يوجد'} color={pending.length ? '#818cf8' : '#D4AF37'} icon={<Clock size={17} color={pending.length ? '#818cf8' : '#D4AF37'} />} />
        </>}
      </div>

      {/* Live opportunities */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 12px' }}>
        <h2 className="dq-h">فرص مفتوحة الآن</h2>
        <Link to="/dashboard/investments" className="dq-more">عرض الكل <ArrowLeft size={13} /></Link>
      </div>
      {opps.isLoading ? <div className="dq-strip">{[0, 1, 2].map(i => <div key={i} className="dq-card" style={{ minWidth: 250, height: 230, opacity: 0.4 }} />)}</div>
        : opps.isError ? <ErrorState onRetry={() => opps.refetch()} />
        : open.length === 0 ? (
          <div className="dq-card" style={{ padding: 22, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', marginBottom: 20 }}>لا توجد فرص مفتوحة حالياً. سنُعلمك فور إضافة فرصة جديدة.</div>
        ) : (
          <div className="dq-strip">
            {open.map(o => {
              const pct = o.target_amount > 0 ? Math.min(Math.round((Number(o.amount_raised) / Number(o.target_amount)) * 100), 100) : 0
              return (
                <Link key={o.id} to="/dashboard/investments" className="dq-card dq-opp">
                  <div style={{ height: 112, position: 'relative', background: 'linear-gradient(135deg,rgba(44,44,44,0.9),rgba(11,11,11,0.95))' }}>
                    {o.cover_image_url
                      ? <img src={o.cover_image_url} alt={o.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={32} color="rgba(212,175,55,0.25)" /></div>}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 40%,rgba(11,11,11,0.9))' }} />
                    {o.projected_return_min ? <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(11,11,11,0.8)', border: '1px solid rgba(16,185,129,0.35)', color: '#10b981', borderRadius: 100, padding: '2px 9px', fontSize: 10, fontWeight: 800, fontFamily: 'Montserrat' }} dir="ltr">{o.projected_return_min}–{o.projected_return_max}%</span> : null}
                  </div>
                  <div style={{ padding: '12px 14px 14px' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name_ar || o.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'Cairo', margin: '10px 0 5px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{pct}% ممول</span>
                      <span dir="ltr" style={{ color: '#D4AF37', fontFamily: 'Montserrat', fontWeight: 700 }}>{o.currency} {Number(o.minimum_investment).toLocaleString()}+</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 5, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#D4AF37,#E8CC6A)' }} /></div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

      <div className="dq-two">
        <div className="dq-card" style={{ padding: 20, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 className="dq-h">محفظة الاستثمار</h2>
            <Link to="/dashboard/investments" className="dq-more">عرض الكل</Link>
          </div>
          {inv.isError ? <ErrorState onRetry={() => inv.refetch()} /> : allocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '22px 0' }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', marginBottom: 14 }}>لا توجد استثمارات بعد</div>
              <Link to="/dashboard/investments" className="dq-btn">استكشف الفرص</Link>
            </div>
          ) : allocs.slice(0, 4).map(a => (
            <Link key={a.id} to="/dashboard/investments" className="dq-row">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: 'Cairo', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.investment_opportunities?.name_ar || a.investment_opportunities?.name || 'استثمار'}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>{a.status}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat', flexShrink: 0 }} dir="ltr">{fmt(Number(a.amount_invested), a.currency || 'BHD')}</div>
            </Link>
          ))}
        </div>

        <div className="dq-card" style={{ padding: 20, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 className="dq-h">التداول الذكي</h2>
            <Link to="/dashboard/trading" className="dq-more">عرض الكل</Link>
          </div>
          {trade.isError ? <ErrorState onRetry={() => trade.refetch()} /> : !trade.data ? (
            <div style={{ textAlign: 'center', padding: '22px 0' }}>
              <Bot size={24} color="rgba(212,175,55,0.4)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', marginBottom: 14 }}>لا يوجد نشاط تداول بعد</div>
              <Link to="/dashboard/deposit" className="dq-btn">إيداع للتداول</Link>
            </div>
          ) : [
            ['الرصيد المتاح', `USDT ${Number(trade.data.available_balance).toFixed(2)}`],
            ['رأس المال المخصص', `USDT ${Number(trade.data.allocated_capital).toFixed(2)}`],
            ['الربح/الخسارة المحققة', `USDT ${Number(trade.data.realized_pnl).toFixed(2)}`],
            ['حالة الذكاء الاصطناعي', trade.data.ai_status],
          ].map(([k, v], i) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 3 ? '1px solid rgba(212,175,55,0.07)' : 'none' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo' }}>{k}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat' }} dir="ltr">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dq-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 className="dq-h">آخر الإيداعات</h2>
          <Link to="/dashboard/transactions" className="dq-more">كل المعاملات</Link>
        </div>
        {deposits.isError ? <ErrorState onRetry={() => deposits.refetch()} /> : recent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '14px 0', fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>لا توجد إيداعات بعد</div>
        ) : recent.map(d => {
          const [label, color] = DEP_STATUS[d.status] || [d.status, '#9ca3af']
          return (
            <div key={d.id} className="dq-row" style={{ cursor: 'default' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: 'Montserrat' }} dir="ltr">{d.amount != null ? `${Number(d.amount).toLocaleString()} ${d.asset}` : `${d.asset} · ${d.network}`}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>{new Date(d.created_at).toLocaleDateString('ar', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Cairo', color, background: `${color}1f`, padding: '3px 11px', borderRadius: 100, flexShrink: 0 }}>{label}</span>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes aqspin { to { transform: rotate(360deg) } }
        .dq-card { background: rgba(26,26,26,0.7); border: 1px solid rgba(212,175,55,0.13); border-radius: 16px; transition: border-color .2s, transform .2s, box-shadow .2s; }
        .dq-hero { position: relative; overflow: hidden; padding: 24px; border-radius: 22px; margin-bottom: 16px; border: 1px solid rgba(212,175,55,0.22); background: radial-gradient(600px 260px at 100% 0%, rgba(212,175,55,0.16), transparent 65%), linear-gradient(135deg, #1b1b1b, #0f0f0f); }
        .dq-wallets { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
        .dq-wallet { padding: 14px 16px; border-radius: 14px; background: rgba(11,11,11,0.55); border: 1px solid; backdrop-filter: blur(6px); }
        .dq-refresh { background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.25); color: #D4AF37; border-radius: 12px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
        .dq-btn { display: inline-flex; align-items: center; gap: 8px; padding: 11px 18px; border-radius: 10px; text-decoration: none; font-family: Cairo; font-weight: 700; font-size: 13px; white-space: nowrap; color: #D4AF37; border: 1px solid rgba(212,175,55,0.4); background: rgba(212,175,55,0.05); transition: all .2s; }
        .dq-btn:hover { background: rgba(212,175,55,0.14); }
        .dq-btn.gold { background: linear-gradient(135deg,#F6DE8D,#D4AF37 55%,#A8871C); color: #0B0B0B; border: none; box-shadow: 0 6px 18px rgba(212,175,55,0.28); }
        .dq-alert { display: flex; align-items: center; gap: 12px; text-decoration: none; border: 1px solid; border-radius: 12px; padding: 13px 16px; margin-bottom: 14px; font-size: 13px; font-family: Cairo; }
        .dq-kpis { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin-bottom: 18px; }
        .dq-h { font-size: 15px; font-weight: 800; font-family: Cairo; color: #fff; margin: 0; }
        .dq-more { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: #D4AF37; text-decoration: none; font-family: Cairo; padding: 4px; }
        .dq-strip { display: flex; gap: 14px; overflow-x: auto; padding: 2px 2px 14px; margin-bottom: 8px; scroll-snap-type: x proximity; -webkit-overflow-scrolling: touch; }
        .dq-opp { flex: 0 0 250px; scroll-snap-align: start; overflow: hidden; text-decoration: none; }
        @media (hover: hover) { .dq-opp:hover { transform: translateY(-3px); border-color: rgba(212,175,55,0.4); box-shadow: 0 12px 30px rgba(0,0,0,0.4); } }
        .dq-two { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px; margin-bottom: 14px; }
        .dq-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; text-decoration: none; padding: 11px 13px; margin-bottom: 8px; background: rgba(44,44,44,0.28); border: 1px solid rgba(212,175,55,0.07); border-radius: 11px; }
        @media (max-width: 1024px) { .dq-kpis { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (max-width: 768px) { .dq-two { grid-template-columns: minmax(0,1fr); } .dq-hero { padding: 18px; border-radius: 18px; } .dq-opp { flex-basis: 232px; } }
        @media (max-width: 460px) { .dq-wallets { grid-template-columns: minmax(0,1fr); } .dq-kpis { gap: 10px; } }
      `}</style>
    </div>
  )
}
