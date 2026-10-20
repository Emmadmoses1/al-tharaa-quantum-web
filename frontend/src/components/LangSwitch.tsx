import { useEffect, useState } from 'react'
import { Globe } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */
// Stops React crashing when Google Translate rewrites text nodes
if (typeof Node === 'function' && Node.prototype && !(Node.prototype as any).__gtFix) {
  const rc = Node.prototype.removeChild
  ;(Node.prototype as any).removeChild = function (this: Node, child: Node) {
    if (child.parentNode !== this) return child
    return rc.call(this, child)
  }
  const ib = Node.prototype.insertBefore
  ;(Node.prototype as any).insertBefore = function (this: Node, n: Node, ref: Node | null) {
    if (ref && ref.parentNode !== this) return n
    return ib.call(this, n, ref)
  }
  ;(Node.prototype as any).__gtFix = true
}

const LANGS: [string, string][] = [['ar', 'العربية'], ['en', 'English'], ['fr', 'Français'], ['ha', 'Hausa'], ['yo', 'Yorùbá'], ['ig', 'Igbo']]

function current() {
  const m = document.cookie.match(/googtrans=\/[^/]+\/([^;]+)/)
  return m ? m[1] : 'ar'
}

function choose(code: string) {
  const host = location.hostname
  if (code === 'ar') {
    for (const d of ['', `; domain=${host}`, `; domain=.${host}`]) document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d}`
  } else {
    document.cookie = `googtrans=/ar/${code}; path=/`
    document.cookie = `googtrans=/ar/${code}; path=/; domain=${host}`
  }
  location.reload()
}

export default function LangSwitch() {
  const [open, setOpen] = useState(false)
  const [lang] = useState(() => { try { return current() } catch { return 'ar' } })

  useEffect(() => {
    if (lang === 'ar') return
    ;(window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement({ pageLanguage: 'ar', includedLanguages: 'ar,en,fr,ha,yo,ig', autoDisplay: false }, 'gt_el_hidden')
    }
    const s = document.createElement('script')
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
    s.async = true
    document.body.appendChild(s)
  }, [lang])

  return (
    <>
      <div id="gt_el_hidden" style={{ display: 'none' }} />
      <style>{`.skiptranslate iframe,.goog-te-banner-frame{display:none!important}body{top:0!important}.goog-tooltip,.goog-text-highlight{box-shadow:none!important;background:none!important}`}</style>
      <div className="notranslate" translate="no" style={{ position: 'fixed', left: 10, bottom: 78, zIndex: 9999, direction: 'ltr' }}>
        {open && (
          <div style={{ marginBottom: 8, background: '#141414', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 12, padding: 6, minWidth: 130, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            {LANGS.map(([c, n]) => (
              <button key={c} type="button" onClick={() => choose(c)}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: lang === c ? 'rgba(212,175,55,0.15)' : 'transparent', color: lang === c ? '#D4AF37' : '#fff', border: 'none', borderRadius: 8, padding: '10px 12px', fontSize: 14, cursor: 'pointer', fontFamily: 'Montserrat' }}>{n}</button>
            ))}
          </div>
        )}
        <button type="button" aria-label="Language" onClick={() => setOpen(o => !o)}
          style={{ width: 44, height: 44, borderRadius: '50%', background: '#141414', border: '1px solid rgba(212,175,55,0.5)', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.5)' }}>
          <Globe size={20} />
        </button>
      </div>
    </>
  )
}
