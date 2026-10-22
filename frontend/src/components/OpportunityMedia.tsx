import { useState } from 'react'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

type Form = { name: string; category: string; location: string; cover_image_url: string; gallery_urls: string }
type Props = { form: Form; setF: (k: string, v: string) => void }

const box: React.CSSProperties = { border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', fontFamily: 'Montserrat', letterSpacing: 0.5 }
const inp: React.CSSProperties = { width: '100%', background: 'rgba(11,11,11,0.5)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, fontFamily: 'Montserrat', outline: 'none', boxSizing: 'border-box' }
const b = (off: boolean): React.CSSProperties => ({ background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 8, padding: '9px 12px', fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat', cursor: off ? 'not-allowed' : 'pointer', opacity: off ? 0.5 : 1 })

// Resize in the browser so uploads stay small (max 1400px, JPEG)
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const s = Math.min(1, 1400 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return await new Promise<Blob>((ok, no) => c.toBlob(x => x ? ok(x) : no(new Error('Image conversion failed')), 'image/jpeg', 0.85))
}
async function uploadFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose image files only')
  const blob = await shrink(file)
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const { error } = await supabase.storage.from('opportunity-images').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return supabase.storage.from('opportunity-images').getPublicUrl(path).data.publicUrl
}

export default function OpportunityMedia({ form, setF }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [prompt, setPrompt] = useState('')
  const [facts, setFacts] = useState('')
  const [ai, setAi] = useState(false)
  const gallery = (form.gallery_urls || '').split('\n').filter(Boolean)
  const setGallery = (g: string[]) => setF('gallery_urls', g.join('\n'))

  async function upload(file: File | undefined) {
    if (!file) return
    setBusy('up'); setMsg('')
    try { setF('cover_image_url', await uploadFile(file)); setAi(false); setMsg('Cover photo uploaded') }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Upload failed') }
    setBusy(null)
  }
  async function addGallery(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy('gal'); setMsg('')
    try {
      const urls: string[] = []
      for (const f of Array.from(files).slice(0, 8)) urls.push(await uploadFile(f))
      setGallery([...gallery, ...urls].slice(0, 12)); setMsg(`${urls.length} photo(s) added to the gallery`)
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Upload failed') }
    setBusy(null)
  }
  async function illustrate() {
    setBusy('img'); setMsg('')
    try {
      const r = await api.post<{ url: string }>('/api/admin/opportunity-images/generate', { prompt: prompt.trim() || `${form.name} ${form.category.replace(/_/g, ' ')} ${form.location}` })
      setF('cover_image_url', r.url); setAi(true); setMsg('AI illustration created. It is an illustration, not a photo of the real asset.')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Failed') }
    setBusy(null)
  }
  async function polish() {
    setBusy('txt'); setMsg('')
    try {
      const r = await api.post<{ name_ar: string; description: string; description_ar: string }>('/api/admin/ai/polish', { name: form.name, category: form.category, location: form.location, facts })
      if (r.name_ar) setF('name_ar', r.name_ar)
      setF('description', r.description); setF('description_ar', r.description_ar)
      setMsg('Text written from your facts. Read it and correct anything before saving.')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Failed') }
    setBusy(null)
  }

  return (
    <div style={box}>
      <div style={lbl}>COVER PHOTO</div>
      {form.cover_image_url && <img src={form.cover_image_url} alt="" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} />}
      {ai && <div style={{ fontSize: 11, color: '#D4AF37', fontFamily: 'Montserrat' }}>AI illustration. Prefer a real photo of the asset when you have one.</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label style={b(!!busy)}>{busy === 'up' ? 'Uploading…' : 'Upload cover'}
          <input type="file" accept="image/*" hidden disabled={!!busy} onChange={e => { upload(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        {form.cover_image_url && <button type="button" style={b(false)} onClick={() => { setF('cover_image_url', ''); setAi(false) }}>Remove</button>}
      </div>

      <div style={lbl}>GALLERY ({gallery.length}/12), shown to investors when they tap the cover</div>
      {gallery.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(84px,1fr))', gap: 8 }}>
          {gallery.map((u, idx) => (
            <div key={u} style={{ position: 'relative' }}>
              <img src={u} alt="" style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 6, display: 'block' }} />
              <button type="button" aria-label="Remove photo" onClick={() => setGallery(gallery.filter((_, j) => j !== idx))}
                style={{ position: 'absolute', top: 3, right: 3, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.9)', color: '#fff', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}
      <label style={b(!!busy || gallery.length >= 12)}>{busy === 'gal' ? 'Uploading…' : 'Add gallery photos (up to 8 at once)'}
        <input type="file" accept="image/*" multiple hidden disabled={!!busy || gallery.length >= 12} onChange={e => { addGallery(e.target.files); e.target.value = '' }} />
      </label>

      <input style={inp} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="AI illustration idea (optional, defaults to name + category)" />
      <button type="button" disabled={!!busy || !form.name.trim()} style={b(!!busy || !form.name.trim())} onClick={illustrate}>{busy === 'img' ? 'Generating…' : 'Generate AI cover illustration'}</button>
      <div style={lbl}>WRITE DESCRIPTION WITH AI</div>
      <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={facts} onChange={e => setFacts(e.target.value)} placeholder="Type the real facts (what it is, where, how it earns, term). AI only rewrites these in English and Arabic. It adds no numbers." />
      <button type="button" disabled={!!busy || !form.name.trim() || facts.trim().length < 10} style={b(!!busy || !form.name.trim() || facts.trim().length < 10)} onClick={polish}>{busy === 'txt' ? 'Writing…' : 'Write English + Arabic text'}</button>
      {msg && <div style={{ fontSize: 12, color: '#D4AF37', fontFamily: 'Montserrat' }}>{msg}</div>}
    </div>
  )
}
