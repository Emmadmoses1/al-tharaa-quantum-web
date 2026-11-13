import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

type Cur = { code: string; name: string; symbol: string }

// Read-only view of the live exchange rates the platform uses for every converted amount. No sample data.
export default function AdminCurrencies() {
  const cur = useQuery({ queryKey: ['adm-cur'], queryFn: () => api.get<Cur[]>('/api/public/currencies') })
  const rates = useQuery({ queryKey: ['adm-rates'], queryFn: () => api.get<Record<string, number>>('/api/currency/rates') })
  const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', fontWeight: 600 }
  const td: React.CSSProperties = { padding: '12px', fontSize: 13, color: '#fff', fontFamily: 'Montserrat', borderTop: '1px solid rgba(212,175,55,0.08)' }
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>Currencies &amp; Rates</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 16, lineHeight: 1.7 }}>
        Live rates from a public exchange-rate feed, refreshed every 6 hours. Each user keeps the rate locked at registration; amounts shown to users are approximate. Nigeria (NGN) is not offered.
      </p>
      {cur.isLoading || rates.isLoading ? <Skeleton height={200} borderRadius={14} /> : cur.isError || rates.isError ? <ErrorState onRetry={() => { cur.refetch(); rates.refetch() }} english /> : (
        <div style={{ background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 14, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
            <thead><tr><th style={th}>CODE</th><th style={th}>NAME</th><th style={th}>1 USD =</th></tr></thead>
            <tbody>
              {(cur.data || []).map(c => (
                <tr key={c.code}>
                  <td style={{ ...td, fontWeight: 700, color: '#D4AF37' }}>{c.code}</td>
                  <td style={td}>{c.name}</td>
                  <td style={td}>{rates.data?.[c.code] ? Number(rates.data[c.code]).toLocaleString('en-US', { maximumFractionDigits: 4 }) : <span style={{ color: '#f59e0b' }}>No rate yet</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
