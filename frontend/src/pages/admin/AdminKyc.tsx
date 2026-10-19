import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Pill, Chips, btn, cardGrid } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function AdminKyc() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-kyc', filter],
    queryFn: async () => {
      let q = supabase.from('profiles').select('id,full_name,email,nationality,kyc_status,created_at').order('created_at', { ascending: false }).limit(100)
      if (filter !== 'all') q = q.eq('kyc_status', filter)
      const { data, error } = await q
      if (error) throw error
      return data as any[]
    },
  })

  async function setStatus(id: string, status: string) {
    setBusy(id)
    const { error } = await supabase.from('profiles').update({ kyc_status: status, updated_at: new Date().toISOString() }).eq('id', id)
    if (!error) await supabase.from('audit_logs').insert({ action: `KYC_${status.toUpperCase()}`, entity: 'profiles', entity_id: id })
    setBusy(null)
    if (error) return alert(error.message)
    qc.invalidateQueries({ queryKey: ['admin-kyc'] })
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>KYC Verification</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 14 }}>
        Approve or reject identity status. Decisions are written to the audit log.
      </p>
      <Chips options={['all', 'pending', 'submitted', 'approved', 'rejected']} value={filter} onChange={setFilter} />

      {isLoading ? (
        <div style={cardGrid}>{[1, 2].map(i => <Skeleton key={i} height={110} borderRadius={14} />)}</div>
      ) : isError ? (
        <ErrorState english onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat', fontSize: 13 }}>
          <UserCheck size={30} color="rgba(212,175,55,0.2)" style={{ marginBottom: 10 }} /><div>Nobody in this list</div>
        </div>
      ) : (
        <div style={cardGrid}>
          {data.map(u => (
            <div key={u.id} style={{ background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Cairo' }}>{u.full_name || 'No name'}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                </div>
                <Pill text={u.kyc_status} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button disabled={busy === u.id || u.kyc_status === 'approved'} onClick={() => setStatus(u.id, 'approved')} style={btn('green', busy === u.id || u.kyc_status === 'approved')}>Approve</button>
                <button disabled={busy === u.id || u.kyc_status === 'rejected'} onClick={() => setStatus(u.id, 'rejected')} style={btn('red', busy === u.id || u.kyc_status === 'rejected')}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
