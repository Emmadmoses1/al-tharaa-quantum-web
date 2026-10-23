import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownCircle, ArrowUpCircle, TrendingUp, Receipt, Search, History } from 'lucide-react'
import { useLedger, useDeposits } from '../../hooks/useData'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'
import { PageStyles, PageHeader, Pill, Empty } from '../../components/PageKit'

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'investment', label: 'استثمار' },
  { key: 'trading', label: 'تداول' },
  { key: 'credit', label: 'إيداعات' },
  { key: 'debit', label: 'سحوبات' },
]
const ENTRY_LABELS: Record<string, string> = { credit: 'إيداع', debit: 'سحب', fee: 'رسوم', adjustment: 'تعديل' }
const LEDGER_LABELS: Record<string, string> = { investment: 'استثمار', trading: 'تداول' }
const DEP_STATUS: Record<string, { t: string; c: string }> = {
  confirmed: { t: 'مؤكد', c: '#10b981' },
  awaiting_payment: { t: 'في الانتظار', c: '#f59e0b' },
  detected: { t: 'تم رصده', c: '#6366f1' },
  confirming: { t: 'قيد التأكيد', c: '#6366f1' },
  expired: { t: 'منتهي', c: '#6b7280' },
  failed: { t: 'فشل', c: '#ef4444' },
}
const PENDING_DEP = ['awaiting_payment', 'detected', 'confirming']

function tone(entryType: string): string {
  return entryType === 'credit' ? '#10b981' : entryType === 'debit' ? '#ef4444' : entryType === 'fee' ? '#9ca3af' : '#D4AF37'
}
function formatAmount(amount: number, entryType: string) {
  const prefix = entryType === 'credit' ? '+' : entryType === 'debit' || entryType === 'fee' ? '-' : ''
  return `${prefix}${Math.abs(amount).toFixed(4)}`
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ar-BH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

type TxItem = {
  id: string; type: 'ledger' | 'deposit'; entryType: string; ledgerType?: string; asset: string
  amount: number; status?: string; description?: string; date: string
}

export default function TransactionsPage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [search, setSearch] = useState('')

  const { data: ledger, isLoading: ledgerLoading, isError: ledgerError, refetch: ledgerRefetch } = useLedger()
  const { data: deposits, isLoading: depLoading, isError: depError, refetch: depRefetch } = useDeposits()
  const isLoading = ledgerLoading || depLoading
  const isError = ledgerError || depError

  const combined: TxItem[] = [
    ...(ledger || []).map(l => ({
      id: l.id, type: 'ledger' as const, entryType: l.entry_type, ledgerType: l.ledger_type, asset: l.asset,
      amount: Number(l.amount), description: l.description || undefined, date: l.created_at,
    })),
    ...(deposits || []).map(d => ({
      id: d.id, type: 'deposit' as const, entryType: 'deposit', asset: d.asset, amount: Number(d.amount || 0), status: d.status,
      description: `${d.asset} — ${d.network} — ${d.purpose === 'trading' ? 'تداول' : 'استثمار'}`, date: d.created_at,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const q = search.trim().toLowerCase()
  const filtered = combined.filter(item => {
    if (activeFilter === 'credit') return item.entryType === 'credit'
    if (activeFilter === 'debit') return item.entryType === 'debit'
    if (activeFilter === 'investment') return item.ledgerType === 'investment'
    if (activeFilter === 'trading') return item.ledgerType === 'trading'
    return true
  }).filter(item => !q || item.asset.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q))

  const depList = deposits || []
  const confirmedDeps = depList.filter(d => d.status === 'confirmed').length
  const pendingDeps = depList.filter(d => PENDING_DEP.includes(d.status)).length

  return (
    <div style={{ direction: 'rtl' }} translate="no" className="notranslate">
      <PageStyles />
      <style>{`
        .tx-row{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(212,175,55,.06);transition:background .15s}
        .tx-row:last-child{border-bottom:none}
        .tx-row:hover{background:rgba(212,175,55,.03)}
        .tx-ic{width:40px;height:40px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
        .tx-mid{flex:1;min-width:0}
        .tx-end{text-align:left;display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0}
      `}</style>
      <PageHeader icon={<History size={22} color="#D4AF37" />} title="سجل المعاملات" sub="جميع إيداعاتك وحركات محافظك في مكان واحد" />

      <div className="pk-tiles">
        <div className="pk-tile"><small>إجمالي الحركات</small><b>{isLoading ? '—' : combined.length}</b></div>
        <div className="pk-tile"><small>إيداعات مؤكدة</small><b style={{ color: '#10b981' }}>{isLoading ? '—' : confirmedDeps}</b></div>
        <div className="pk-tile"><small>إيداعات قيد الانتظار</small><b style={{ color: '#f59e0b' }}>{isLoading ? '—' : pendingDeps}</b></div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} color="rgba(255,255,255,0.35)" style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)' }} />
          <input className="pk-input" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالأصل أو الوصف..."
            style={{ padding: '11px 38px 11px 14px', fontSize: 13, fontFamily: 'Cairo' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.key} type="button" onClick={() => setActiveFilter(f.key)} style={{
              background: activeFilter === f.key ? 'rgba(212,175,55,0.14)' : 'rgba(44,44,44,0.3)',
              border: `1px solid ${activeFilter === f.key ? '#D4AF37' : 'rgba(212,175,55,0.12)'}`,
              borderRadius: 100, padding: '7px 15px', cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo',
              color: activeFilter === f.key ? '#D4AF37' : 'rgba(255,255,255,0.5)', transition: 'all .2s',
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="pk-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 16, display: 'grid', gap: 12 }}>
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={46} borderRadius={10} />)}
          </div>
        ) : isError ? (
          <ErrorState message="فشل تحميل سجل المعاملات" onRetry={() => { ledgerRefetch(); depRefetch() }} />
        ) : filtered.length === 0 ? (
          <Empty icon={<Receipt size={24} color="rgba(212,175,55,0.5)" />} text={combined.length ? 'لا نتائج مطابقة' : 'لا توجد معاملات بعد. ستظهر هنا بعد أول إيداع.'}>
            {!combined.length && <Link to="/dashboard/deposit" className="btn-outline-gold" style={{ textDecoration: 'none', fontSize: 13, padding: '9px 20px' }}>إيداع الآن</Link>}
          </Empty>
        ) : filtered.map(item => {
          const dep = item.type === 'deposit'
          const ds = dep ? (DEP_STATUS[item.status || ''] || { t: item.status || 'إيداع', c: '#818cf8' }) : null
          const c = dep ? (item.status === 'confirmed' ? '#10b981' : '#f59e0b') : tone(item.entryType)
          return (
            <div key={item.id} className="tx-row">
              <div className="tx-ic" style={{ background: c + '14', border: `1px solid ${c}33` }}>
                {dep || item.entryType === 'credit' ? <ArrowDownCircle size={18} color={c} />
                  : item.entryType === 'debit' ? <ArrowUpCircle size={18} color={c} />
                    : item.entryType === 'fee' ? <Receipt size={18} color={c} /> : <TrendingUp size={18} color={c} />}
              </div>
              <div className="tx-mid">
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Cairo', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {dep ? `إيداع ${item.asset}` : item.description || `${ENTRY_LABELS[item.entryType] || item.entryType} — ${item.asset}`}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontFamily: 'Cairo' }}>
                  {formatDate(item.date)}{!dep && item.ledgerType ? ` · ${LEDGER_LABELS[item.ledgerType] || item.ledgerType}` : ''}
                </div>
              </div>
              <div className="tx-end">
                <span className="pk-mono" style={{ fontSize: 14, fontWeight: 800, color: c }}>
                  {dep ? (item.amount > 0 ? `+${item.amount.toFixed(4)}` : '—') : formatAmount(item.amount, item.entryType)} {item.asset}
                </span>
                {ds ? <Pill color={ds.c}>{ds.t}</Pill> : <Pill color={c}>{ENTRY_LABELS[item.entryType] || item.entryType}</Pill>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
