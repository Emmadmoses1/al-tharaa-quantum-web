import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Bell, Send, Users, AlertTriangle, CheckCircle } from 'lucide-react'
import { TableRowSkeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

const NOTIF_TYPES = [
  { key: 'system', label: 'System Alert' },
  { key: 'investment', label: 'Investment Update' },
  { key: 'trading', label: 'Trading Update' },
  { key: 'deposit', label: 'Deposit' },
  { key: 'withdrawal', label: 'Withdrawal' },
  { key: 'security', label: 'Security Alert' },
  { key: 'alert', label: 'General Alert' },
]

export default function AdminNotifications() {
  const qc = useQueryClient()
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [form, setForm] = useState({
    type: 'system',
    title: '', title_ar: '',
    message: '', message_ar: '',
    targetUserId: '',
    broadcast: false,
  })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const { data: recentNotifs, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select(`*, profiles(full_name, email)`)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data || []
    },
  })

  const { data: users } = useQuery({
    queryKey: ['admin-users-simple'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name')
        .limit(200)
      return data || []
    },
  })

  async function handleSend() {
    setSending(true)
    setSendError(null)

    if (!form.title || !form.message) {
      setSendError('Title and message are required')
      setSending(false)
      return
    }

    try {
      if (form.broadcast) {
        // Send to all users
        const allUsers = users || []
        if (allUsers.length === 0) {
          setSendError('No users to broadcast to')
          setSending(false)
          return
        }

        const insertPayload = (allUsers as { id: string }[]).map(u => ({
          user_id: u.id,
          type: form.type,
          title: form.title,
          title_ar: form.title_ar || form.title,
          message: form.message,
          message_ar: form.message_ar || form.message,
          is_read: false,
        }))

        // Insert in batches of 50
        for (let i = 0; i < insertPayload.length; i += 50) {
          const batch = insertPayload.slice(i, i + 50)
          const { error } = await supabase.from('notifications').insert(batch)
          if (error) throw error
        }
      } else {
        if (!form.targetUserId) {
          setSendError('Select a user or enable broadcast')
          setSending(false)
          return
        }
        const { error } = await supabase.from('notifications').insert({
          user_id: form.targetUserId,
          type: form.type,
          title: form.title,
          title_ar: form.title_ar || form.title,
          message: form.message,
          message_ar: form.message_ar || form.message,
          is_read: false,
        })
        if (error) throw error
      }

      setSent(true)
      qc.invalidateQueries({ queryKey: ['admin-notifications'] })
      setTimeout(() => {
        setSent(false)
        setShowBroadcast(false)
        setForm({ type: 'system', title: '', title_ar: '', message: '', message_ar: '', targetUserId: '', broadcast: false })
      }, 2000)
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(11,11,11,0.7)',
    border: '1px solid rgba(212,175,55,0.15)', borderRadius: 8,
    padding: '10px 14px', color: '#fff', fontSize: 12,
    fontFamily: 'Montserrat', outline: 'none', boxSizing: 'border-box',
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>
            Notifications
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>
            Send notifications to users and view notification history
          </p>
        </div>
        <button onClick={() => setShowBroadcast(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg,#D4AF37,#E8CC6A)',
          border: 'none', borderRadius: 8, padding: '10px 18px',
          color: '#0B0B0B', fontSize: 12, fontWeight: 700,
          fontFamily: 'Montserrat', cursor: 'pointer',
        }}>
          <Send size={14} /> Send Notification
        </button>
      </div>

      {/* Send modal */}
      {showBroadcast && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
          zIndex: 500, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 24, backdropFilter: 'blur(8px)',
          overflowY: 'auto',
        }}>
          <div style={{
            background: '#141414', border: '1px solid rgba(212,175,55,0.15)',
            borderRadius: 16, padding: 32, maxWidth: 520, width: '100%',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 24 }}>
              Send Notification
            </h2>

            {sendError && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 7, padding: '10px 14px', marginBottom: 16,
                fontSize: 12, color: '#ef4444', fontFamily: 'Montserrat',
              }}>{sendError}</div>
            )}

            {sent && (
              <div style={{
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 7, padding: '10px 14px', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12, color: '#10b981', fontFamily: 'Montserrat',
              }}>
                <CheckCircle size={14} /> Notification sent successfully!
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Broadcast toggle */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px',
                background: form.broadcast ? 'rgba(212,175,55,0.08)' : 'rgba(44,44,44,0.3)',
                border: `1px solid ${form.broadcast ? 'rgba(212,175,55,0.3)' : 'rgba(212,175,55,0.1)'}`,
                borderRadius: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Users size={16} color={form.broadcast ? '#D4AF37' : 'rgba(255,255,255,0.4)'} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat', color: '#fff' }}>
                      Broadcast to All Users
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat' }}>
                      Send to {users?.length || 0} registered users
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, broadcast: !f.broadcast, targetUserId: '' }))}
                  style={{
                    width: 40, height: 22, borderRadius: 11,
                    background: form.broadcast ? '#D4AF37' : 'rgba(44,44,44,0.8)',
                    border: `1px solid ${form.broadcast ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`,
                    cursor: 'pointer', position: 'relative', transition: 'all 0.3s', padding: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2,
                    right: form.broadcast ? 2 : undefined,
                    left: form.broadcast ? undefined : 2,
                    width: 16, height: 16, borderRadius: '50%',
                    background: form.broadcast ? '#0B0B0B' : '#fff',
                    transition: 'all 0.3s',
                  }} />
                </button>
              </div>

              {/* Target user */}
              {!form.broadcast && (
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', letterSpacing: 1, marginBottom: 7 }}>
                    TARGET USER
                  </label>
                  <select
                    value={form.targetUserId}
                    onChange={e => setForm(f => ({ ...f, targetUserId: e.target.value }))}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="" style={{ background: '#141414' }}>Select user...</option>
                    {(users as { id: string; full_name?: string; email?: string }[] || []).map(u => (
                      <option key={u.id} value={u.id} style={{ background: '#141414' }}>
                        {u.full_name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Type */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', letterSpacing: 1, marginBottom: 7 }}>
                  TYPE
                </label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  {NOTIF_TYPES.map(t => (
                    <option key={t.key} value={t.key} style={{ background: '#141414' }}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Title EN + AR */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', letterSpacing: 1, marginBottom: 7 }}>
                    TITLE (EN)
                  </label>
                  <input type="text" value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    style={inputStyle} placeholder="Notification title" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', letterSpacing: 1, marginBottom: 7 }}>
                    العنوان (AR)
                  </label>
                  <input type="text" value={form.title_ar}
                    onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))}
                    style={{ ...inputStyle, direction: 'rtl', fontFamily: 'Cairo' }} placeholder="عنوان الإشعار" />
                </div>
              </div>

              {/* Message EN + AR */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', letterSpacing: 1, marginBottom: 7 }}>
                    MESSAGE (EN)
                  </label>
                  <textarea value={form.message} rows={3}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} placeholder="Notification message..." />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', letterSpacing: 1, marginBottom: 7 }}>
                    الرسالة (AR)
                  </label>
                  <textarea value={form.message_ar} rows={3}
                    onChange={e => setForm(f => ({ ...f, message_ar: e.target.value }))}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 70, direction: 'rtl', fontFamily: 'Cairo' }} placeholder="نص الإشعار..." />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => { setShowBroadcast(false); setSendError(null) }} style={{
                flex: 1, background: 'transparent',
                border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8,
                padding: '11px', color: '#D4AF37',
                fontSize: 12, fontFamily: 'Montserrat', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleSend} disabled={sending || sent} style={{
                flex: 1, background: sent ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg,#D4AF37,#E8CC6A)',
                border: sent ? '1px solid rgba(16,185,129,0.3)' : 'none',
                borderRadius: 8, padding: '11px',
                color: sent ? '#10b981' : '#0B0B0B',
                fontSize: 12, fontWeight: 700,
                fontFamily: 'Montserrat', cursor: (sending || sent) ? 'not-allowed' : 'pointer',
                opacity: (sending || sent) ? 0.8 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}>
                <Send size={13} />
                {sent ? '✓ Sent!' : sending ? 'Sending...' : `Send${form.broadcast ? ` to ${users?.length || 0} users` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent notifications table */}
      <div style={{
        background: 'rgba(20,20,20,0.8)',
        border: '1px solid rgba(212,175,55,0.08)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 80px 1fr 80px 100px',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(212,175,55,0.07)', gap: 10,
        }}>
          {['User', 'Type', 'Title', 'Read', 'Date'].map((h, i) => (
            <div key={i} style={{
              fontSize: 10, fontWeight: 700,
              color: 'rgba(255,255,255,0.3)',
              fontFamily: 'Montserrat', letterSpacing: 1,
            }}>{h}</div>
          ))}
        </div>

        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
        ) : isError ? (
          <ErrorState english onRetry={refetch} />
        ) : !recentNotifs || recentNotifs.length === 0 ? (
          <div style={{
            padding: '60px 24px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <Bell size={32} color="rgba(212,175,55,0.2)" />
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat' }}>
              No notifications sent yet
            </div>
          </div>
        ) : (
          (recentNotifs as Record<string, unknown>[]).map((notif, i) => {
            const profile = notif.profiles as { full_name?: string; email?: string } | null
            return (
              <div key={notif.id as string} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 1fr 80px 100px',
                padding: '11px 20px',
                borderBottom: i < recentNotifs.length - 1 ? '1px solid rgba(212,175,55,0.05)' : 'none',
                gap: 10, alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', fontFamily: 'Cairo' }}>
                    {profile?.full_name || 'Unknown'}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat' }}>
                    {profile?.email}
                  </div>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, fontFamily: 'Montserrat',
                  background: 'rgba(212,175,55,0.1)', color: '#D4AF37',
                  padding: '2px 7px', borderRadius: 4, display: 'inline-block',
                }}>
                  {(notif.type as string).toUpperCase()}
                </span>
                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.7)',
                  fontFamily: 'Cairo',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {notif.title_ar as string || notif.title as string}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, fontFamily: 'Montserrat',
                  color: notif.is_read ? '#10b981' : '#f59e0b',
                  background: notif.is_read ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                  padding: '2px 7px', borderRadius: 4, display: 'inline-block',
                }}>
                  {notif.is_read ? 'READ' : 'UNREAD'}
                </span>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat' }}>
                  {formatDate(notif.created_at as string)}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
