import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Receipt, Search } from 'lucide-react'
import { TableRowSkeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

export default function AdminTransactions() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-ledger', typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('ledger_entries')
        .select(`*, profiles(full_name, email)`)
        .order('created_at', { ascending: false })
        .limit(100)

      if (typeFilter !== 'all') query = query.eq('ledger_type', typeFilter)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })

  const filtered = (data || []).filter((row: Record<string, unknown>) => {
    if (!search) return true
    const profile = row.profiles as { full_name?: string; email?: string } | null
    return (
      profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
      (row.asset as string)?.toLowerCase().includes(search.toLowerCase())
    )
  })

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const ENTRY_COLORS: Record<string, { color: string; bg: string }> = {
    credit: { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    debit: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    fee: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    adjustment: { color: '#D4AF37', bg: 'rgba(212,175,55,0.1)' },
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>
          Transactions
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>
          All ledger entries across investment and trading portfolios
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} color="rgba(255,255,255,0.3)" style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          }} />
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search user or asset..."
            style={{
              width: '100%', background: 'rgba(20,20,20,0.8)',
              border: '1px solid rgba(212,175,55,0.1)', borderRadius: 8,
              padding: '9px 14px 9px 34px',
              color: '#fff', fontSize: 12, fontFamily: 'Montserrat',
              outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.3)'}
            onBlur={e => e.target.style.borderColor = 'rgba(212,175,55,0.1)'}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'investment', 'trading'].map(f => (
            <button key={f} onClick={() => setTypeFilter(f)} style={{
              background: typeFilter === f ? 'rgba(212,175,55,0.12)' : 'rgba(20,20,20,0.8)',
              border: `1px solid ${typeFilter === f ? '#D4AF37' : 'rgba(212,175,55,0.1)'}`,
              borderRadius: 6, padding: '8px 14px', cursor: 'pointer',
              fontSize: 11, fontFamily: 'Montserrat',
              color: typeFilter === f ? '#D4AF37' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.2s',
            }}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: 'rgba(20,20,20,0.8)',
        border: '1px solid rgba(212,175,55,0.08)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 80px 60px 80px 80px 100px 110px',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(212,175,55,0.07)', gap: 10,
        }}>
          {['User', 'Asset', 'Type', 'Ledger', 'Amount', 'Balance After', 'Date'].map((h, i) => (
            <div key={i} style={{
              fontSize: 10, fontWeight: 700,
              color: 'rgba(255,255,255,0.3)',
              fontFamily: 'Montserrat', letterSpacing: 1,
            }}>{h}</div>
          ))}
        </div>

        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
        ) : isError ? (
          <ErrorState english onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <div style={{
            padding: '60px 24px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <Receipt size={32} color="rgba(212,175,55,0.2)" />
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat' }}>
              No ledger entries yet
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: 'Montserrat', maxWidth: 340 }}>
              Ledger entries are created automatically when deposits are confirmed
            </div>
          </div>
        ) : (
          (filtered as Record<string, unknown>[]).map((entry, i) => {
            const ec = ENTRY_COLORS[entry.entry_type as string] || ENTRY_COLORS.adjustment
            const profile = entry.profiles as { full_name?: string; email?: string } | null
            const isCredit = entry.entry_type === 'credit'
            return (
              <div key={entry.id as string} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 60px 80px 80px 100px 110px',
                padding: '12px 20px',
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(212,175,55,0.05)' : 'none',
                gap: 10, alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: 'Cairo' }}>
                    {profile?.full_name || 'Unknown'}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat' }}>
                    {profile?.email}
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat' }}>
                  {entry.asset as string}
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, fontFamily: 'Montserrat',
                  background: ec.bg, color: ec.color,
                  padding: '2px 7px', borderRadius: 4, display: 'inline-block',
                }}>
                  {(entry.entry_type as string).toUpperCase()}
                </span>
                <span style={{
                  fontSize: 9, fontFamily: 'Montserrat', fontWeight: 600,
                  color: entry.ledger_type === 'trading' ? '#6366f1' : '#D4AF37',
                  background: entry.ledger_type === 'trading' ? 'rgba(99,102,241,0.1)' : 'rgba(212,175,55,0.1)',
                  padding: '2px 7px', borderRadius: 4, display: 'inline-block',
                }}>
                  {(entry.ledger_type as string).toUpperCase()}
                </span>
                <div style={{
                  fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat',
                  color: isCredit ? '#10b981' : '#ef4444',
                }}>
                  {isCredit ? '+' : '-'}{Number(entry.amount).toFixed(4)}
                </div>
                <div style={{ fontSize: 11, fontFamily: 'Montserrat', color: 'rgba(255,255,255,0.6)' }}>
                  {Number(entry.balance_after).toFixed(4)}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat' }}>
                  {formatDate(entry.created_at as string)}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
