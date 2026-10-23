import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import Avatar from './Avatar'
import { compressImage, uploadAvatar } from '../lib/avatar'
import { useAuth } from '../context/AuthContext'

// Current photo with a camera badge; picking a file uploads it right away.
export default function AvatarChange({ size = 64 }: { size?: number }) {
  const { user, profile } = useAuth()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function change(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !user) return
    if (!f.type.startsWith('image/')) return setErr('اختر ملف صورة')
    setBusy(true); setErr('')
    try { await uploadAvatar(user.id, await compressImage(f)) } catch { setErr('تعذر رفع الصورة') }
    setBusy(false)
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <button type="button" onClick={() => input.current?.click()} disabled={busy} aria-label="تغيير الصورة" style={{ position: 'relative', padding: 0, border: 'none', background: 'none', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
        <Avatar url={profile?.avatar_url} name={profile?.full_name || user?.email} size={size} radius={size / 2} />
        <span style={{ position: 'absolute', bottom: -2, left: -2, width: 24, height: 24, borderRadius: '50%', background: '#D4AF37', color: '#0B0B0B', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0B0B0B' }}><Camera size={12} /></span>
      </button>
      {err && <div style={{ fontSize: 11, color: '#ef4444', fontFamily: 'Cairo', marginTop: 4 }}>{err}</div>}
      <input ref={input} type="file" accept="image/*" onChange={change} style={{ display: 'none' }} />
    </div>
  )
}
