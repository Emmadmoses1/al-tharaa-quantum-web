import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { uploadDoc } from '../lib/mediaUpload'
import { inputCss, btn, labelCss, cardCss } from './ui/AdminKit'

type Doc = { id: string; title: string; url: string; created_at: string }

// Add documents (PDF or image upload, or an https link) for the chosen opportunity.
export default function AdminDocs({ oppId }: { oppId: string }) {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const list = useQuery({ queryKey: ['adm-docs', oppId], queryFn: () => api.get<Doc[]>(`/api/admin/opportunity-docs/list/${oppId}`) })

  async function pick(f: File | undefined) {
    if (!f) return
    setBusy(true); setMsg(null)
    try { setUrl(await uploadDoc(f)); if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').slice(0, 100)) }
    catch (e) { setMsg({ ok: false, t: e instanceof Error ? e.message : 'Upload failed' }) }
    setBusy(false)
  }
  async function add() {
    setBusy(true); setMsg(null)
    try {
      await api.post('/api/admin/opportunity-docs', { opportunity_id: oppId, title, url })
      setTitle(''); setUrl(''); setMsg({ ok: true, t: 'Document added.' })
      await qc.invalidateQueries({ queryKey: ['adm-docs', oppId] })
    } catch (e) { setMsg({ ok: false, t: e instanceof Error ? e.message : 'Failed' }) }
    setBusy(false)
  }
  async function del(id: string) {
    if (!window.confirm('Delete this document?')) return
    try { await api.post(`/api/admin/opportunity-docs/${id}/delete`, {}); await qc.invalidateQueries({ queryKey: ['adm-docs', oppId] }) }
    catch (e) { setMsg({ ok: false, t: e instanceof Error ? e.message : 'Delete failed' }) }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)', fontFamily: 'Montserrat', letterSpacing: 1.5, marginBottom: 10 }}>DOCUMENTS (LICENCE, CONTRACT, STUDY…)</div>
      <div style={{ ...cardCss, display: 'grid', gap: 10 }}>
        <div><label style={labelCss}>TITLE</label><input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} style={inputCss} placeholder="e.g. Feasibility study" /></div>
        <div><label style={labelCss}>LINK (https) OR UPLOAD</label><input value={url} onChange={e => setUrl(e.target.value)} style={inputCss} placeholder="https://…" /></div>
        <input type="file" accept="application/pdf,image/*" disabled={busy} onChange={e => { void pick(e.target.files?.[0]); e.target.value = '' }} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
        <button type="button" onClick={add} disabled={busy || title.trim().length < 3 || !url} style={btn('gold', busy || title.trim().length < 3 || !url)}>{busy ? 'Working…' : 'Add document'}</button>
        {msg && <div style={{ fontSize: 12, fontFamily: 'Montserrat', color: msg.ok ? '#10b981' : '#ef4444' }}>{msg.t}</div>}
      </div>
      {(list.data || []).map(d => (
        <div key={d.id} style={{ ...cardCss, marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ color: '#D4AF37', fontFamily: 'Cairo', fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</a>
          <button type="button" onClick={() => del(d.id)} style={btn('red')}>Delete</button>
        </div>
      ))}
    </div>
  )
}
