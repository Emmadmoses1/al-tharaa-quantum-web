import { useState } from 'react'
import { Search, UserCheck, Flag, ShieldAlert, Smartphone, Link2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdminUsers, useAdminUpdateUserRole } from '../../hooks/useData'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import Avatar from '../../components/Avatar'
import Sheet from '../../components/ui/Sheet'
import { Pill, Chips, inputCss, cardGrid } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

const ROLES = ['user', 'support', 'finance', 'trading_admin', 'admin', 'super_admin']
const KYC: Record<string, string> = { pending: '#9ca3af', submitted: '#f59e0b', approved: '#10b981', rejected: '#ef4444' }

type Extra = { avatar_url?: string | null; country?: string | null; account_status?: string; flagged?: boolean }
type Detail = {
  profile: { id: string; email: string; full_name: string | null; phone: string | null; role: string; kyc_status: string; avatar_url: string | null; country: string | null; signup_ip: string | null
    account_status: string; suspended_reason: string | null; flagged: boolean; flag_reason: string | null; created_at: string; last_seen_at: string | null }
  devices: { device_id: string; ip: string | null; first_seen: string; last_seen: string }[]
  linked: { id: string; email: string; full_name: string | null; account_status: string }[]
  timeline: { kind: string; title: string; detail: string; at: string }[]
}

const flagOf = (c?: string | null) => (c && /^[A-Za-z]{2}$/.test(c) ? String.fromCodePoint(...c.toUpperCase().split('').map(ch => 127397 + ch.charCodeAt(0))) : '🌐')
const KIND: Record<string, string> = { event: '#9ca3af', deposit: '#10b981', withdrawal: '#6366f1', trade: '#D4AF37' }

function UserDetail({ id, canModerate, onClose }: { id: string; canModerate: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const q = useQuery({ queryKey: ['admin-user-detail', id], staleTime: 0, queryFn: () => api.get<Detail>(`/api/admin/user-activity/${id}`) })

  async function act(kind: 'suspend' | 'unsuspend') {
    const reason = kind === 'suspend' ? window.prompt('Reason for suspension?', 'Violation of terms') : ''
    if (kind === 'suspend' && reason === null) return
    setBusy(true); setErr('')
    try {
      await api.post(`/api/admin/user-activity/${id}/${kind}`, { reason })
      await q.refetch()
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setBusy(false)
  }

  if (q.isLoading) return <Skeleton height={200} borderRadius={12} />
  if (q.isError || !q.data) return <ErrorState english onRetry={q.refetch} />
  const { profile: p, devices, linked, timeline } = q.data
  const suspended = p.account_status === 'suspended'
  const row = (k: string, v: string | null | undefined) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(212,175,55,0.06)', fontSize: 12, fontFamily: 'Montserrat' }}>
      <span style={{ color: 'rgba(255,255,255,0.45)' }}>{k}</span><span style={{ color: '#fff', textAlign: 'right', wordBreak: 'break-all' }}>{v || '—'}</span>
    </div>
  )
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {p.avatar_url
          ? <a href={p.avatar_url} target="_blank" rel="noreferrer"><Avatar url={p.avatar_url} name={p.full_name} size={84} radius={18} /></a>
          : <Avatar name={p.full_name || p.email} size={84} radius={18} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'Cairo' }}>{p.full_name || 'No name'}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat', wordBreak: 'break-all' }}>{p.email}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <Pill text={suspended ? 'suspended' : 'active'} color={suspended ? '#ef4444' : '#10b981'} />
            {p.flagged && <Pill text="flagged" color="#f59e0b" />}
            <Pill text={p.kyc_status} color={KYC[p.kyc_status]} />
          </div>
        </div>
      </div>

      {(suspended || p.flagged) && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#f59e0b', fontFamily: 'Montserrat', lineHeight: 1.7 }}>
          {suspended && <div><b>Suspended:</b> {p.suspended_reason || '—'}</div>}
          {p.flagged && <div><b>Flag:</b> {p.flag_reason || '—'}</div>}
        </div>
      )}

      <div>
        {row('Country', `${flagOf(p.country)} ${p.country || 'Unknown'}`)}
        {row('Signup IP', p.signup_ip)}
        {row('Phone', p.phone)}
        {row('Role', p.role)}
        {row('Joined', new Date(p.created_at).toLocaleString('en-GB'))}
        {row('Last seen', p.last_seen_at ? new Date(p.last_seen_at).toLocaleString('en-GB') : null)}
      </div>

      {linked.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', fontFamily: 'Montserrat', marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}><Link2 size={14} />Other accounts on the same device</div>
          {linked.map(l => <div key={l.id} style={{ fontSize: 12, color: '#fff', fontFamily: 'Montserrat', padding: '4px 0' }}>{l.email} <span style={{ color: 'rgba(255,255,255,0.4)' }}>· {l.account_status}</span></div>)}
        </div>
      )}

      {devices.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat', marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}><Smartphone size={14} />Devices</div>
          {devices.map(d => <div key={d.device_id} style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'Montserrat', padding: '3px 0' }}>{d.device_id.slice(0, 8)}… · {d.ip || '—'} · last {new Date(d.last_seen).toLocaleDateString('en-GB')}</div>)}
        </div>
      )}

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat', marginBottom: 6 }}>Activity</div>
        {timeline.length === 0 ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat' }}>No activity yet</div> : timeline.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(212,175,55,0.05)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: KIND[t.kind] || '#9ca3af', marginTop: 5, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#fff', fontFamily: 'Montserrat' }}>{t.title}</div>
              {t.detail && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'Montserrat' }}>{t.detail}</div>}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', flexShrink: 0 }}>{new Date(t.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        ))}
      </div>

      {err && <div style={{ fontSize: 12, color: '#ef4444', fontFamily: 'Montserrat' }}>{err}</div>}
      {canModerate && p.role === 'user' && (
        suspended
          ? <button type="button" disabled={busy} onClick={() => act('unsuspend')} className="btn-gold" style={{ padding: 12, opacity: busy ? 0.6 : 1 }}>Unsuspend account</button>
          : <button type="button" disabled={busy} onClick={() => act('suspend')} style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700, fontFamily: 'Montserrat', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>Suspend account</button>
      )}
      <button type="button" onClick={onClose} className="btn-outline-gold" style={{ padding: 11 }}>Close</button>
    </div>
  )
}

export default function AdminUsers() {
  const { profile } = useAuth()
  const isSuper = profile?.role === 'super_admin'
  const canModerate = isSuper || profile?.role === 'admin'
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [open, setOpen] = useState<string | null>(null)
  const { data: users, isLoading, isError, refetch } = useAdminUsers(search || undefined, role === 'all' ? undefined : role)
  const updateRole = useAdminUpdateUserRole()

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>Users</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 14 }}>
        {users ? `${users.length} users` : 'Loading…'}{!isSuper && ' · Only a super admin can change roles'} · Tap a user to see activity
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
          {users.map(u => {
            const x = u as typeof u & Extra
            const suspended = x.account_status === 'suspended'
            return (
              <div key={u.id} style={{ background: 'rgba(20,20,20,0.9)', border: `1px solid ${suspended ? 'rgba(239,68,68,0.35)' : 'rgba(212,175,55,0.1)'}`, borderRadius: 14, padding: 14 }}>
                <div onClick={() => setOpen(u.id)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') setOpen(u.id) }} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, cursor: 'pointer' }}>
                  <Avatar url={x.avatar_url} name={u.full_name || u.email} size={42} radius={21} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Cairo', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{flagOf(x.country)} {u.full_name || 'No name'}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    {suspended ? <Pill text="suspended" color="#ef4444" /> : <Pill text={u.kyc_status} color={KYC[u.kyc_status]} />}
                    {x.flagged && <span style={{ color: '#f59e0b', display: 'flex' }} title="Flagged"><Flag size={13} /></span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <select value={u.role} disabled={!isSuper || u.id === profile?.id}
                    onChange={e => updateRole.mutate({ userId: u.id, role: e.target.value }, { onError: er => alert(er.message) })}
                    style={{ ...inputCss, padding: '10px 12px', fontSize: 14, flex: 1, opacity: !isSuper || u.id === profile?.id ? 0.6 : 1 }}>
                    {ROLES.map(r => <option key={r} value={r} style={{ background: '#141414' }}>{r.replace('_', ' ')}</option>)}
                  </select>
                  <button type="button" onClick={() => setOpen(u.id)} aria-label="Details" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 10, color: '#D4AF37', padding: '10px 12px', cursor: 'pointer', display: 'flex' }}><ShieldAlert size={16} /></button>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat' }}>{new Date(u.created_at).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Sheet open={!!open} title="User details" onClose={() => setOpen(null)}>
        {open && <UserDetail key={open} id={open} canModerate={canModerate} onClose={() => setOpen(null)} />}
      </Sheet>
    </div>
  )
}
