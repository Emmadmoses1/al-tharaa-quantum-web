import { useState } from 'react'
import { Search, UserCheck } from 'lucide-react'
import { useAdminUsers, useAdminUpdateUserRole } from '../../hooks/useData'
import { useAuth } from '../../context/AuthContext'
import { Pill, Chips, inputCss, cardGrid } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

const ROLES = ['user', 'support', 'finance', 'trading_admin', 'admin', 'super_admin']
const KYC: Record<string, string> = { pending: '#9ca3af', submitted: '#f59e0b', approved: '#10b981', rejected: '#ef4444' }

export default function AdminUsers() {
  const { profile } = useAuth()
  const isSuper = profile?.role === 'super_admin'
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const { data: users, isLoading, isError, refetch } = useAdminUsers(search || undefined, role === 'all' ? undefined : role)
  const updateRole = useAdminUpdateUserRole()

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>Users</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 14 }}>
        {users ? `${users.length} users` : 'Loading…'}{!isSuper && ' · Only a super admin can change roles'}
      </p>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={15} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email" style={{ ...inputCss, paddingLeft: 38 }} />
      </div>
      <Chips options={['all', ...ROLES]} value={role} onChange={setRole} />

      {isLoading ? (
        <div style={cardGrid}>{[1, 2, 3].map(i => <Skeleton key={i} height={96} borderRadius={14} />)}</div>
      ) : isError ? (
        <ErrorState english onRetry={refetch} />
      ) : !users || users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat', fontSize: 13 }}>
          <UserCheck size={30} color="rgba(212,175,55,0.2)" style={{ marginBottom: 10 }} /><div>No users found</div>
        </div>
      ) : (
        <div style={cardGrid}>
          {users.map(u => (
            <div key={u.id} style={{ background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontWeight: 700, fontFamily: 'Cairo', flexShrink: 0 }}>
                  {(u.full_name || u.email || '?').charAt(0)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Cairo', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || 'No name'}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                </div>
                <Pill text={u.kyc_status} color={KYC[u.kyc_status]} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <select value={u.role} disabled={!isSuper || u.id === profile?.id}
                  onChange={e => updateRole.mutate({ userId: u.id, role: e.target.value }, { onError: er => alert(er.message) })}
                  style={{ ...inputCss, padding: '10px 12px', fontSize: 14, flex: 1, opacity: !isSuper || u.id === profile?.id ? 0.6 : 1 }}>
                  {ROLES.map(r => <option key={r} value={r} style={{ background: '#141414' }}>{r.replace('_', ' ')}</option>)}
                </select>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat' }}>
                  {new Date(u.created_at).toLocaleDateString('en-GB')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
