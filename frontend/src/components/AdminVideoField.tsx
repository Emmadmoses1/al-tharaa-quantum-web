import { useState } from 'react'
import { uploadVideo } from '../lib/mediaUpload'
import OppVideo from './OppVideo'

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', fontFamily: 'Montserrat', letterSpacing: 0.5 }
const inp: React.CSSProperties = { width: '100%', background: 'rgba(11,11,11,0.5)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, fontFamily: 'Montserrat', outline: 'none', boxSizing: 'border-box' }
const b: React.CSSProperties = { background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 8, padding: '9px 12px', fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat', cursor: 'pointer' }

// Product video: paste a link (best for large videos) or upload a file (limit = your Supabase storage limit).
export default function AdminVideoField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [pct, setPct] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  async function pick(file: File | undefined) {
    if (!file) return
    setMsg(''); setPct(0)
    try { onChange(await uploadVideo(file, setPct)); setMsg('Video uploaded') }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Upload failed') }
    setPct(null)
  }

  return (
    <div style={{ border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
      <div style={lbl}>PRODUCT VIDEO (OPTIONAL)</div>
      <input type="url" value={value} onChange={e => onChange(e.target.value)} placeholder="Paste a YouTube, Vimeo or video file link (any size)" style={inp} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ ...b, opacity: pct !== null ? 0.5 : 1 }}>
          {pct !== null ? `Uploading ${pct}%` : 'Upload a video file'}
          <input type="file" accept="video/*" disabled={pct !== null} style={{ display: 'none' }} onChange={e => { void pick(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        {value && <button type="button" style={b} onClick={() => onChange('')}>Remove video</button>}
      </div>
      {pct !== null && <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}><div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: '#D4AF37', transition: 'width .2s' }} /></div>}
      {msg && <div style={{ fontSize: 11, color: /fail|error|larger|sign in|choose/i.test(msg) ? '#ef4444' : '#10b981', fontFamily: 'Montserrat', lineHeight: 1.6 }}>{msg}</div>}
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', lineHeight: 1.6 }}>Large videos: upload to YouTube (unlisted) or Vimeo and paste the link, so there is no size limit. Direct upload works up to the limit set in Supabase Storage settings.</div>
      {value && <OppVideo url={value} />}
    </div>
  )
}
