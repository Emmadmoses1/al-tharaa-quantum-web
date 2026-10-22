import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

// Cover image for an investment card. Tap it to open all photos full screen.
export default function GalleryCover({ name, cover, gallery }: { name: string; cover: string; gallery: string[] }) {
  const all = [cover, ...(gallery || []).filter(u => u && u !== cover)]
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)

  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'ArrowRight') setI(x => (x + 1) % all.length)
      if (e.key === 'ArrowLeft') setI(x => (x - 1 + all.length) % all.length)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, all.length])

  return (
    <>
      <button type="button" aria-label={`${name}: عرض الصور`} onClick={() => { setI(0); setOpen(true) }}
        style={{ all: 'unset', cursor: 'zoom-in', display: 'block', width: '100%', height: '100%', position: 'relative' }}>
        <img src={cover} alt={name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        {all.length > 1 && (
          <span style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(11,11,11,0.75)', color: '#D4AF37', fontFamily: 'Montserrat', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5 }}>{all.length} صور</span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-modal="true" onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <button type="button" aria-label="إغلاق" onClick={() => setOpen(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={22} /></button>
          {all.length > 1 && <button type="button" aria-label="السابق" onClick={e => { e.stopPropagation(); setI((i - 1 + all.length) % all.length) }} style={{ position: 'absolute', left: 10, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={24} /></button>}
          <img src={all[i]} alt={`${name} ${i + 1}`} onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '88vh', borderRadius: 10, objectFit: 'contain' }} />
          {all.length > 1 && <button type="button" aria-label="التالي" onClick={e => { e.stopPropagation(); setI((i + 1) % all.length) }} style={{ position: 'absolute', right: 10, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={24} /></button>}
          <div style={{ position: 'absolute', bottom: 16, color: 'rgba(255,255,255,0.7)', fontFamily: 'Montserrat', fontSize: 12 }}>{i + 1} / {all.length}</div>
        </div>
      )}
    </>
  )
}
