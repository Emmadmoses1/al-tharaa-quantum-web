import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Sheet({ open, title, onClose, children }: {
  open: boolean; title: string; onClose: () => void; children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="aq-sheet-bg" onClick={onClose}>
      <div className="aq-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="aq-sheet-head">
          <div className="aq-sheet-title">{title}</div>
          <button onClick={onClose} aria-label="Close" className="aq-sheet-x"><X size={18} /></button>
        </div>
        <div className="aq-sheet-body">{children}</div>
      </div>
      <style>{`
        .aq-sheet-bg{position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)}
        .aq-sheet{background:#141414;border:1px solid rgba(212,175,55,.2);border-radius:16px;width:100%;max-width:520px;max-height:90dvh;display:flex;flex-direction:column}
        .aq-sheet-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid rgba(212,175,55,.1)}
        .aq-sheet-title{font:700 15px Montserrat,sans-serif;color:#fff}
        .aq-sheet-x{background:rgba(255,255,255,.06);border:none;color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer}
        .aq-sheet-body{padding:16px 18px;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:max(18px,env(safe-area-inset-bottom))}
        @media(max-width:640px){
          .aq-sheet-bg{align-items:flex-end;padding:0}
          .aq-sheet{max-width:100%;border-radius:18px 18px 0 0;max-height:92dvh}
        }
      `}</style>
    </div>,
    document.body,
  )
}
