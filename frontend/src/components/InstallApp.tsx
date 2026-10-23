import { useEffect, useState } from 'react'
import { Download, Share, X, Smartphone } from 'lucide-react'

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: BIP | null = null
const subs = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as BIP; subs.forEach(f => f()) })
  window.addEventListener('appinstalled', () => { deferred = null; subs.forEach(f => f()) })
}

const standalone = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const KEY = 'aq_install_dismissed'

function useInstall() {
  const [, tick] = useState(0)
  useEffect(() => { const f = () => tick(n => n + 1); subs.add(f); return () => { subs.delete(f) } }, [])
  const [steps, setSteps] = useState(false)
  async function install() {
    if (deferred) {
      try { await deferred.prompt(); await deferred.userChoice } catch { /* ignore */ }
      deferred = null; tick(n => n + 1)
    } else setSteps(true)
  }
  return { installed: standalone(), canPrompt: !!deferred, steps, setSteps, install }
}

function Steps({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(11,11,11,0.5)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 10, fontFamily: 'Cairo', fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 2 }}>
      {isIos() ? (
        <>
          <div>1. افتح الموقع في <b>Safari</b></div>
          <div>2. اضغط زر المشاركة <Share size={14} style={{ verticalAlign: -2 }} /> في الأسفل</div>
          <div>3. اختر <b>«إضافة إلى الشاشة الرئيسية»</b> ثم <b>إضافة</b></div>
        </>
      ) : (
        <>
          <div>1. افتح قائمة المتصفح (⋮ أو ⋯)</div>
          <div>2. اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b></div>
          <div>3. أكّد الإضافة</div>
        </>
      )}
      <button type="button" onClick={onClose} style={{ marginTop: 6, background: 'none', border: 'none', color: '#D4AF37', fontFamily: 'Cairo', fontSize: 12, cursor: 'pointer', padding: 0 }}>إخفاء الخطوات</button>
    </div>
  )
}

// Dismissible banner for the dashboard.
export function InstallBanner() {
  const { installed, steps, setSteps, install } = useInstall()
  const [hidden, setHidden] = useState(() => { try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < 7 * 86400000 } catch { return false } })
  if (installed || hidden) return null
  const dismiss = () => { try { localStorage.setItem(KEY, String(Date.now())) } catch { /* ignore */ } setHidden(true) }
  return (
    <div style={{ marginBottom: 16, padding: '14px 16px', background: 'linear-gradient(135deg,rgba(212,175,55,0.12),rgba(212,175,55,0.03))', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Smartphone size={22} color="#D4AF37" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Cairo' }}>أضف الموقع إلى شاشتك الرئيسية</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo' }}>وصول أسرع وإشعارات فورية كأنه تطبيق.</div>
        </div>
        <button type="button" className="btn-gold" onClick={install} style={{ fontSize: 12, padding: '9px 16px', flexShrink: 0 }}>إضافة</button>
        <button type="button" onClick={dismiss} aria-label="إخفاء" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', padding: 4 }}><X size={16} /></button>
      </div>
      {steps && <Steps onClose={() => setSteps(false)} />}
    </div>
  )
}

// Always-available card for the settings page.
export function InstallCard() {
  const { installed, steps, setSteps, install } = useInstall()
  return (
    <div style={{ background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 14, padding: 20, display: 'grid', gap: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Download size={18} color="#D4AF37" />تثبيت التطبيق</h2>
      {installed ? (
        <div style={{ fontSize: 13, color: '#10b981', fontFamily: 'Cairo' }}>التطبيق مثبّت على هذا الجهاز.</div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', lineHeight: 1.9 }}>أضف الثراء كوانتوم إلى الشاشة الرئيسية لفتحه بنقرة واحدة واستلام الإشعارات.</div>
          <button type="button" className="btn-gold" onClick={install} style={{ padding: '11px 0' }}>إضافة إلى الشاشة الرئيسية</button>
          {steps && <Steps onClose={() => setSteps(false)} />}
        </>
      )}
    </div>
  )
}
