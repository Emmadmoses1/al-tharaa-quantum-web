import { useState } from 'react'
import {
  ArrowDownCircle, ArrowUpCircle, TrendingUp,
  Receipt, Search,
} from 'lucide-react'
import { useLedger, useDeposits } from '../../hooks/useData'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'investment', label: 'استثمار' },
  { key: 'trading', label: 'تداول' },
  { key: 'credit', label: 'إيداعات' },
  { key: 'debit', label: 'سحوبات' },
]

const ENTRY_ICONS: Record<string, React.ReactNode> = {
  credit: <ArrowDownCircle size={18} color="#10b981" />,
  debit: <ArrowUpCircle size={18} color="#ef4444" />,
  fee: <Receipt size={18} color="rgba(255,255,255,0.4)" />,
  adjustment: <TrendingUp size={18} color="#D4AF37" />,
}

const ENTRY_LABELS: Record<string, string> = {
  credit: 'إيداع',
  debit: 'سحب',
  fee: 'رسوم',
  adjustment: 'تعديل',
}

const LEDGER_LABELS: Record<string, string> = {
  investment: 'استثمار',
  trading: 'تداول',
}

function formatAmount(amount: number, entryType: string) {
  const prefix = entryType === 'credit' ? '+' : entryType === 'debit' || entryType === 'fee' ? '-' : ''
  return `${prefix}${Math.abs(amount).toFixed(6)}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ar-BH', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function TransactionsPage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [search, setSearch] = useState('')

  const {
    data: ledger,
    isLoading: ledgerLoading,
    isError: ledgerError,
    refetch: ledgerRefetch,
  } = useLedger()

  const {
    data: deposits,
    isLoading: depLoading,
    isError: depError,
    refetch: depRefetch,
  } = useDeposits()

  const isLoading = ledgerLoading || depLoading
  const isError = ledgerError || depError

  // Combine ledger entries + deposits into one timeline
  type TxItem = {
    id: string
    type: 'ledger' | 'deposit'
    entryType: string
    ledgerType?: string
    asset: string
    amount: number
    status?: string
    description?: string
    date: string
  }

  const combined: TxItem[] = [
    ...(ledger || []).map(l => ({
      id: l.id,
      type: 'ledger' as const,
      entryType: l.entry_type,
      ledgerType: l.ledger_type,
      asset: l.asset,
      amount: Number(l.amount),
      description: l.description || undefined,
      date: l.created_at,
    })),
    ...(deposits || []).map(d => ({
      id: d.id,
      type: 'deposit' as const,
      entryType: 'deposit',
      asset: d.asset,
      amount: Number(d.amount || 0),
      status: d.status,
      description: `${d.asset} — ${d.network} — ${d.purpose === 'trading' ? 'تداول' : 'استثمار'}`,
      date: d.created_at,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const filtered = combined.filter(item => {
    if (activeFilter === 'credit') return item.entryType === 'credit'
    if (activeFilter === 'debit') return item.entryType === 'debit'
    if (activeFilter === 'investment') return item.ledgerType === 'investment'
    if (activeFilter === 'trading') return item.ledgerType === 'trading'
    return true
  }).filter(item =>
    !search ||
    item.asset.toLowerCase().includes(search.toLowerCase()) ||
    item.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ direction: 'rtl' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontSize: 26, fontWeight: 800,
          fontFamily: 'Cairo', color: '#fff', marginBottom: 6,
        }}>سجل المعاملات</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo' }}>
          جميع معاملاتك وإيداعاتك مع الثراء كوانتوم
        </p>
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} color="rgba(255,255,255,0.3)" style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالأصل أو الوصف..."
            style={{
              width: '100%', background: 'rgba(44,44,44,0.3)',
              border: '1px solid rgba(212,175,55,0.1)',
              borderRadius: 8, padding: '10px 36px 10px 14px',
              color: '#fff', fontSize: 13, fontFamily: 'Cairo',
              outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.3)'}
            onBlur={e => e.target.style.borderColor = 'rgba(212,175,55,0.1)'}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setActiveFilter(f.key)} style={{
              background: activeFilter === f.key
                ? 'rgba(212,175,55,0.12)' : 'rgba(44,44,44,0.3)',
              border: `1px solid ${activeFilter === f.key ? '#D4AF37' : 'rgba(212,175,55,0.1)'}`,
              borderRadius: 100, padding: '6px 14px',
              cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo',
              color: activeFilter === f.key ? '#D4AF37' : 'rgba(255,255,255,0.45)',
              transition: 'all 0.2s',
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '36px 1fr 120px 100px 120px',
          gap: 12, padding: '12px 20px',
          borderBottom: '1px solid rgba(212,175,55,0.08)',
        }} className="tx-grid">
          {['', 'الوصف', 'المبلغ', 'النوع', 'التاريخ'].map((h, i) => (
            <div key={i} style={{
              fontSize: 11, fontWeight: 600,
              color: 'rgba(255,255,255,0.35)',
              fontFamily: 'Cairo',
            }}>{h}</div>
          ))}
        </div>

        {isLoading ? (
          <div style={{ padding: '8px 0' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '36px 1fr 120px 100px 120px',
                gap: 12, padding: '14px 20px',
                borderBottom: '1px solid rgba(212,175,55,0.05)',
              }} className="tx-grid">
                <Skeleton width={36} height={36} borderRadius={50} />
                <div>
                  <Skeleton height={13} style={{ marginBottom: 6 }} />
                  <Skeleton width="50%" height={11} />
                </div>
                <Skeleton height={13} width="80%" />
                <Skeleton height={22} borderRadius={4} />
                <Skeleton height={13} width="70%" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            message="فشل تحميل سجل المعاملات"
            onRetry={() => { ledgerRefetch(); depRefetch() }}
          />
        ) : filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', padding: '72px 24px',
            gap: 14, textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56,
              background: 'rgba(212,175,55,0.05)',
              border: '1px solid rgba(212,175,55,0.08)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Receipt size={24} color="rgba(212,175,55,0.25)" />
            </div>
            <div style={{
              fontSize: 16, fontWeight: 700,
              color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo',
            }}>لا توجد معاملات بعد</div>
            <div style={{
              fontSize: 13, color: 'rgba(255,255,255,0.3)',
              fontFamily: 'Cairo', maxWidth: 300,
            }}>
              ستظهر معاملاتك هنا بعد أول إيداع أو استثمار
            </div>
            <a href="/dashboard/deposit" style={{ textDecoration: 'none', marginTop: 8 }}>
              <button className="btn-outline-gold" style={{ fontSize: 13, padding: '9px 20px' }}>
                إيداع الآن
              </button>
            </a>
          </div>
        ) : (
          filtered.map((item, i) => (
            <div key={item.id} style={{
              display: 'grid',
              gridTemplateColumns: '36px 1fr 120px 100px 120px',
              gap: 12, padding: '14px 20px',
              borderBottom: i < filtered.length - 1
                ? '1px solid rgba(212,175,55,0.05)' : 'none',
              alignItems: 'center',
              transition: 'background 0.15s',
            }}
              className="tx-grid"
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.02)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              {/* Icon */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(44,44,44,0.5)',
                border: '1px solid rgba(212,175,55,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {item.type === 'deposit'
                  ? <ArrowDownCircle size={16} color={
                    item.status === 'confirmed' ? '#10b981' : '#f59e0b'
                  } />
                  : ENTRY_ICONS[item.entryType] || ENTRY_ICONS.adjustment
                }
              </div>

              {/* Description */}
              <div>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: '#fff',
                  fontFamily: 'Cairo', marginBottom: 3,
                }}>
                  {item.type === 'deposit'
                    ? `إيداع ${item.asset}`
                    : item.description || `${ENTRY_LABELS[item.entryType] || item.entryType} — ${item.asset}`
                  }
                </div>
                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.35)',
                  fontFamily: 'Cairo',
                }}>
                  {item.type === 'deposit'
                    ? item.description
                    : item.ledgerType
                      ? LEDGER_LABELS[item.ledgerType] || item.ledgerType
                      : ''
                  }
                </div>
              </div>

              {/* Amount */}
              <div style={{
                fontSize: 14, fontWeight: 700,
                fontFamily: 'Montserrat',
                color: item.type === 'deposit'
                  ? (item.status === 'confirmed' ? '#10b981' : '#f59e0b')
                  : item.entryType === 'credit' ? '#10b981'
                    : item.entryType === 'debit' ? '#ef4444' : '#D4AF37',
                direction: 'ltr', textAlign: 'right',
              }}>
                {item.type === 'deposit'
                  ? (item.amount > 0 ? `+${item.amount.toFixed(4)}` : '—')
                  : formatAmount(item.amount, item.entryType)
                } {item.asset}
              </div>

              {/* Type badge */}
              <div>
                {item.type === 'deposit' ? (
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    fontFamily: 'Cairo',
                    background: 'rgba(99,102,241,0.1)',
                    color: '#818cf8',
                    padding: '3px 8px', borderRadius: 4,
                  }}>
                    {item.status === 'confirmed' ? 'مؤكد' :
                      item.status === 'awaiting_payment' ? 'في الانتظار' :
                        item.status === 'detected' ? 'تم رصده' :
                          item.status === 'confirming' ? 'يتأكد' :
                            item.status || 'إيداع'}
                  </span>
                ) : (
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    fontFamily: 'Cairo',
                    background: item.entryType === 'credit'
                      ? 'rgba(16,185,129,0.1)'
                      : item.entryType === 'debit'
                        ? 'rgba(239,68,68,0.1)'
                        : 'rgba(212,175,55,0.1)',
                    color: item.entryType === 'credit' ? '#10b981'
                      : item.entryType === 'debit' ? '#ef4444' : '#D4AF37',
                    padding: '3px 8px', borderRadius: 4,
                  }}>
                    {ENTRY_LABELS[item.entryType] || item.entryType}
                  </span>
                )}
              </div>

              {/* Date */}
              <div style={{
                fontSize: 11, color: 'rgba(255,255,255,0.35)',
                fontFamily: 'Cairo',
              }}>
                {formatDate(item.date)}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .tx-grid {
            grid-template-columns: 36px 1fr 100px !important;
          }
          .tx-grid > div:nth-child(4),
          .tx-grid > div:nth-child(5) { display: none; }
        }
      `}</style>
    </div>
  )
}
