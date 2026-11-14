import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { Pill, inputCss, btn, labelCss, cardCss, ago } from '../../components/ui/AdminKit'
import AdminVideoField from '../../components/AdminVideoField'
import OppVideo from '../../components/OppVideo'
import { uploadImage } from '../../lib/mediaUpload'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'
import type { Update } from '../../lib/useUpdates'

type Opp = { id: string; name: string; status: string }

// Post project updates (text + optional photo or video). Investors in the opportunity are notified automatically.
export default function AdminUpdates() {
  const qc = useQueryClient()
  const [oppId, setOppId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [image, setImage] = useState('')
  const [video, setVideo] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)

  const opps = useQuery({
    queryKey: ['adm-upd-opps'],
    queryFn: async () => {
      const { data, error } = await supabase.from('investment_opportunities').select('id, name, status').order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as Opp[]
    },
  })
  const list = useQuery({
    queryKey: ['adm-upd-list', oppId], enabled: !!oppId,
    queryFn: () => api.get<Update[]>(`/api/admin/opportunity-updates/list/${oppId}`),
  })

  async function pickImage(file: File | undefined) {
    if (!file) return
    setMsg(null); setBusy(true)
    try { setImage(await uploadImage(file)) } catch (e) { setMsg({ ok: false, t: e instanceof Error ? e.message : 'Upload failed' }) }
    setBusy(false)
  }
  async function post() {
    setBusy(true); setMsg(null)
    try {
      const media_url = video || image || ''
      const r = await api.post<{ id: string }>('/api/admin/opportunity-updates', { opportunity_id: oppId, title, body, media_url, media_type: video ? 'video' : image ? 'image' : '' })
      void r
      setTitle(''); setBody(''); setImage(''); setVideo('')
      setMsg({ ok: true, t: 'Update published. Investors in this opportunity were notified.' })
      await qc.invalidateQueries({ queryKey: ['adm-upd-list', oppId] })
    } catch (e) { setMsg({ ok: false, t: e instanceof Error ? e.message : 'Failed to publish' }) }
    setBusy(false)
  }
  async function remove(id: string) {
    if (!window.confirm('Delete this update?')) return
    try { await api.post(`/api/admin/opportunity-updates/${id}/delete`, {}); await qc.invalidateQueries({ queryKey: ['adm-upd-list', oppId] }) }
    catch (e) { setMsg({ ok: false, t: e instanceof Error ? e.message : 'Delete failed' }) }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>Project Updates</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 16, lineHeight: 1.7 }}>
        Share real progress with investors: a short text, with a photo or video if you have one. Everyone invested in the opportunity gets a notification. Post only true, current information.
      </p>
      {opps.isLoading ? <Skeleton height={80} borderRadius={14} /> : opps.isError ? <ErrorState english onRetry={() => opps.refetch()} /> : (
        <div style={{ ...cardCss, display: 'grid', gap: 12 }}>
          <div>
            <label style={labelCss}>OPPORTUNITY</label>
            <select value={oppId} onChange={e => setOppId(e.target.value)} style={inputCss}>
              <option value="">Choose an opportunity…</option>
              {(opps.data || []).map(o => <option key={o.id} value={o.id}>{o.name} ({o.status})</option>)}
            </select>
          </div>
          {oppId && (
            <>
              <div>
                <label style={labelCss}>TITLE</label>
                <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Construction reached 40%" style={inputCss} />
              </div>
              <div>
                <label style={labelCss}>DETAILS (OPTIONAL)</label>
                <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={2000} rows={4} style={{ ...inputCss, resize: 'vertical' }} />
              </div>
              <div>
                <label style={labelCss}>PHOTO (OPTIONAL)</label>
                <input type="file" accept="image/*" disabled={busy} onChange={e => { void pickImage(e.target.files?.[0]); e.target.value = '' }} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                {image && !video && <img src={image} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />}
              </div>
              <AdminVideoField value={video} onChange={setVideo} />
              <button type="button" onClick={post} disabled={busy || title.trim().length < 3} style={btn('gold', busy || title.trim().length < 3)}>{busy ? 'Working…' : 'Publish update'}</button>
              {msg && <div style={{ fontSize: 12, fontFamily: 'Montserrat', color: msg.ok ? '#10b981' : '#ef4444' }}>{msg.t}</div>}
            </>
          )}
        </div>
      )}
      {oppId && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)', fontFamily: 'Montserrat', letterSpacing: 1.5, marginBottom: 10 }}>PUBLISHED UPDATES</div>
          {list.isLoading ? <Skeleton height={60} borderRadius={14} /> : (list.data || []).length === 0 ? (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat' }}>No updates yet for this opportunity.</div>
          ) : (list.data || []).map(u => (
            <div key={u.id} style={{ ...cardCss, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Cairo' }}>{u.title}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', marginTop: 2 }}>{ago(u.created_at)} {u.media_type && <Pill text={u.media_type} />}</div>
                </div>
                <button type="button" onClick={() => remove(u.id)} style={btn('red')}>Delete</button>
              </div>
              {u.body && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', lineHeight: 1.8, margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{u.body}</p>}
              {u.media_url && u.media_type === 'image' && <img src={u.media_url} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />}
              {u.media_url && u.media_type === 'video' && <OppVideo url={u.media_url} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
