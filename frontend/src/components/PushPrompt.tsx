import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { enablePush, pushSupported, resyncPush } from '../lib/push'

const KEY = 'aq_push_later'

// Asks once (and again after 3 days if dismissed) to turn on phone/browser notifications.
export default function PushPrompt() {
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!pushSupported()) return
    if (Notification.permission === 'granted') { resyncPush(); return }
    if (Notification.permission === 'denied') return
    try { const t = Number(localStorage.getItem(KEY) || 0); if (Date.now() - t < 3 * 86400000) return } catch { /* ignore */ }
    const id = window.setTimeout(() => setShow(true), 2500)
    return () => window.clearTimeout(id)
  }, [])

  if (!show) return null
  const later = () => { try { localStorage.setItem(KEY, String(Date.now())) } catch { /* ignore */ } setShow(false) }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,rgba(212,175,55,0.14),rgba(212,175,55,0.05))', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 14, padding: '12px 14px', marginBottom: 16, direction: 'rtl' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Bell size={18} color="#D4AF37" /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Cairo', fontWeight: 800, fontSize: 13, color: '#fff' }}>فعّل إشعارات الهاتف</div>
        <div style={{ fontFamily: 'Cairo', fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>اعرف فوراً عند وصول إيداعك، نتائج صفقاتك، والفرص الاستثمارية الجديدة.</div>
      </div>
      <button type="button" disabled={busy} onClick={async () => { setBusy(true); const ok = await enablePush(); setBusy(false); if (ok || Notification.permission === 'denied') setShow(false); else later() }}
        style={{ background: 'linear-gradient(135deg,#D4AF37,#E8CC6A)', color: '#0B0B0B', border: 'none', borderRadius: 8, padding: '9px 14px', fontFamily: 'Cairo', fontWeight: 800, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', opacity: busy ? 0.6 : 1 }}>{busy ? '...' : 'تفعيل'}</button>
      <button type="button" aria-label="لاحقاً" onClick={later} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, display: 'flex' }}><X size={16} /></button>
    </div>
  )
}
