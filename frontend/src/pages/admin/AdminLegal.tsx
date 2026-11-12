import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { DOC_TYPES, type LegalDoc } from '../../lib/useLegal'
import { btn, inputCss, labelCss, cardCss, Pill, ago } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

type Row = LegalDoc & { is_public: boolean; created_at: string }
type Kind = LegalDoc['doc_type']
const MIMES: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

export default function AdminLegal() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin-legal'], staleTime: 0, queryFn: () => api.get<Row[]>('/api/admin/legal') })
  const [file, setFile] = useState<File | null>(null)
  const [f, setF] = useState({ doc_type: 'license' as Kind, title_ar: '', title: '', issuer: '', number: '', issued_at: '', expires_at: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const set = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }))
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin-legal'] }); qc.invalidateQueries({ queryKey: ['public-legal'] }) }

  async function upload() {
    setMsg(null)
    if (!file) return setMsg({ ok: false, text: 'Choose a PDF or image file first.' })
    if (f.title_ar.trim().length < 2) return setMsg({ ok: false, text: 'Arabic title is required.' })
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    const mime = MIMES[ext]
    if (!mime) return setMsg({ ok: false, text: 'Allowed files: PDF, JPG, PNG, WEBP.' })
    if (file.size > 10 * 1024 * 1024) return setMsg({ ok: false, text: 'Maximum file size is 10 MB.' })
    setBusy(true)
    try {
      const base = file.name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'document'
      const path = `docs/${Date.now()}-${base}.${ext}`
      const up = await supabase.storage.from('legal-docs').upload(path, file, { contentType: mime, upsert: false })
      if (up.error) throw up.error
      await api.post('/api/admin/legal', { ...f, path, mime, is_public: true })
      setFile(null); setF({ doc_type: 'license', title_ar: '', title: '', issuer: '', number: '', issued_at: '', expires_at: '' })
      setMsg({ ok: true, text: 'Uploaded and published.' }); refresh()
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Upload failed' }) }
    setBusy(false)
  }
  async function toggle(r: Row) { try { await api.post(`/api/admin/legal/${r.id}/visibility`, { is_public: !r.is_public }); refresh() } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed' }) } }
  async function remove(r: Row) {
    if (!window.confirm(`Delete "${r.title_ar}" permanently?`)) return
    try { await api.post(`/api/admin/legal/${r.id}/delete`, {}); refresh() } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed' }) }
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <h2 style={{ color: '#fff', fontFamily: 'Montserrat', fontSize: 20, margin: '0 0 6px' }}>Legal documents</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.8, margin: '0 0 16px' }}>
        Upload your licences, registration and certificates (PDF or image, up to 10 MB). Public documents appear on the public page <b style={{ color: '#D4AF37' }}>/documents</b> and are linked from the website footer.
        Upload only real, valid documents. To show a licence line in the footer, fill “Licence / regulator statement” in Settings → General.
      </p>

      <div style={{ ...cardCss, display: 'grid', gap: 10, marginBottom: 18 }}>
        <div><label style={labelCss}>Type</label>
          <select value={f.doc_type} onChange={e => set('doc_type', e.target.value)} style={inputCss}>
            {(Object.keys(DOC_TYPES) as Kind[]).map(k => <option key={k} value={k}>{DOC_TYPES[k].en} / {DOC_TYPES[k].ar}</option>)}
          </select></div>
        <div><label style={labelCss}>Arabic title (required)</label><input value={f.title_ar} onChange={e => set('title_ar', e.target.value)} style={inputCss} maxLength={160} /></div>
        <div><label style={labelCss}>English title (optional)</label><input value={f.title} onChange={e => set('title', e.target.value)} style={inputCss} maxLength={160} /></div>
        <div><label style={labelCss}>Issuing authority</label><input value={f.issuer} onChange={e => set('issuer', e.target.value)} style={inputCss} maxLength={160} /></div>
        <div><label style={labelCss}>Document / licence number</label><input value={f.number} onChange={e => set('number', e.target.value)} style={inputCss} maxLength={80} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={labelCss}>Issued on</label><input type="date" value={f.issued_at} onChange={e => set('issued_at', e.target.value)} style={inputCss} /></div>
          <div><label style={labelCss}>Expires on</label><input type="date" value={f.expires_at} onChange={e => set('expires_at', e.target.value)} style={inputCss} /></div>
        </div>
        <div><label style={labelCss}>File (PDF / JPG / PNG / WEBP)</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} style={{ ...inputCss, padding: 10 }} /></div>
        {msg ? <div style={{ color: msg.ok ? '#10b981' : '#ef4444', fontSize: 13 }}>{msg.text}</div> : null}
        <button type="button" onClick={upload} disabled={busy} style={btn('gold', busy)}>{busy ? 'Uploading…' : 'Upload & publish'}</button>
      </div>

      {q.isLoading ? <Skeleton /> : q.isError ? <ErrorState english onRetry={() => q.refetch()} /> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {(q.data || []).length === 0 ? <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>No documents yet.</div> : null}
          {(q.data || []).map(r => (
            <div key={r.id} style={{ ...cardCss, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <b style={{ color: '#fff', fontSize: 14 }}>{r.title_ar}</b>
                <Pill text={DOC_TYPES[r.doc_type].en} />
                <Pill text={r.is_public ? 'Public' : 'Hidden'} color={r.is_public ? '#10b981' : '#9ca3af'} />
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                {[r.issuer, r.number && `No. ${r.number}`, r.expires_at && `Expires ${r.expires_at}`, `Added ${ago(r.created_at)}`].filter(Boolean).join(' · ')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ ...btn('ghost'), display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Open</a>
                <button type="button" onClick={() => toggle(r)} style={btn('ghost')}>{r.is_public ? 'Hide' : 'Show'}</button>
                <button type="button" onClick={() => remove(r)} style={btn('red')}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
