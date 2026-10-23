import { useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { compressImage } from '../lib/avatar'

// Round photo picker. Calls onPick with a compressed JPEG blob.
export default function AvatarPicker({ onPick, size = 96, disabled, label = 'أضف صورتك' }: { onPick: (b: Blob) => void; size?: number; disabled?: boolean; label?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  async function change(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setErr('')
    if (!f.type.startsWith('image/')) return setErr('اختر ملف صورة')
    if (f.size > 12 * 1024 * 1024) return setErr('الصورة كبيرة جداً (الحد 12MB)')
    try {
      const b = await compressImage(f)
      setPreview(URL.createObjectURL(b))
      onPick(b)
    } catch { setErr('تعذرت معالجة الصورة') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <button type="button" disabled={disabled} onClick={() => input.current?.click()} aria-label={label}
        style={{ width: size, height: size, borderRadius: '50%', cursor: disabled ? 'not-allowed' : 'pointer', padding: 0, overflow: 'hidden', position: 'relative',
          background: 'rgba(11,11,11,0.6)', border: `2px dashed ${preview ? '#D4AF37' : 'rgba(212,175,55,0.45)'}`, color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {preview ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={size / 3} />}
      </button>
      <span style={{ fontSize: 12, color: err ? '#ef4444' : 'rgba(255,255,255,0.55)', fontFamily: 'Cairo' }}>{err || (preview ? 'اضغط لتغيير الصورة' : label)}</span>
      <input ref={input} type="file" accept="image/*" onChange={change} style={{ display: 'none' }} />
    </div>
  )
}
