import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollText, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { inputCss, ago } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function AdminAudit() {
  const [q, setQ] = useState('')
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-audit'],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from('audit_logs')
        .select('*, profiles(email)').order('created_at', { ascending: false }).limit(300)
      if (error) throw error
      return (data || []) as any[]
    },
  })
  const rows = (data || []).filter(r => {
    const s = q.trim().toLowerCase()
    return !s || `${r.action} ${r.entity || ''} ${r.profiles?.email || ''}`.toLowerCase().includes(s)
  })

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>Audit Log</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 14 }}>
        Latest 300 recorded actions. Entries can't be edited from the app.
      </p>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={15} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by action, entity or email" style={{ ...inputCss, paddingLeft: 38 }} />
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gap: 10 }}>{[1, 2, 3, 4].map(i => <Skeleton key={i} height={64} borderRadius={12} />)}</div>
      ) : isError ? (
        <ErrorState english onRetry={refetch} />
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat', fontSize: 13 }}>
          <ScrollText size={30} color="rgba(212,175,55,0.2)" style={{ marginBottom: 10 }} /><div>No entries</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map(r => (
            <div key={r.id} style={{ background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat', wordBreak: 'break-word' }}>{r.action}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', whiteSpace: 'nowrap' }}>{ago(r.created_at)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat', marginTop: 4, wordBreak: 'break-all' }}>
                {r.profiles?.email || 'system'}{r.entity ? ` · ${r.entity}` : ''}
              </div>
              {r.metadata && Object.keys(r.metadata).length > 0 && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginTop: 6, wordBreak: 'break-all' }}>
                  {JSON.stringify(r.metadata)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
