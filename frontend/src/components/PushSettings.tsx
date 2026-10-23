import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { api } from '../lib/api'
import { enablePush, disablePush, isPushOn, pushSupported } from '../lib/push'

const card: React.CSSProperties = { background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 14, padding: 20, display: 'grid', gap: 12 }

// Settings card: turn phone/browser notifications on or off for this device.
export default function PushSettings() {
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { isPushOn().then(setOn) }, [])
  if (!pushSupported()) return <div style={card}><h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', margin: 0 }}>إشعارات الهاتف</h2><div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', lineHeight: 1.9 }}>متصفحك لا يدعم الإشعارات. على الآيفون: أضف الموقع إلى الشاشة الرئيسية أولاً.</div></div>

  const denied = Notification.permission === 'denied'
  const toggle = async () => {
    setBusy(true); setMsg('')
    if (on) { await disablePush(); setOn(false) }
    else { const ok = await enablePush(); setOn(ok); if (!ok) setMsg(Notification.permission === 'denied' ? 'الإذن مرفوض. فعّل الإشعارات للموقع من إعدادات المتصفح.' : 'تعذر التفعيل. حاول مرة أخرى.') }
    setBusy(false)
  }
  const test = async () => {
    setMsg('')
    try { const r = await api.post<{ sent: number }>('/api/push/test', {}); setMsg(r.sent ? 'تم إرسال إشعار تجريبي' : 'لم يُرسل. أعد تفعيل الإشعارات.') } catch { setMsg('تعذر الإرسال') }
  }
  return (
    <div style={card}>
      <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>{on ? <Bell size={18} color="#D4AF37" /> : <BellOff size={18} color="rgba(255,255,255,0.4)" />}إشعارات الهاتف</h2>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', lineHeight: 1.9 }}>تنبيه فوري على هذا الجهاز عند وصول إيداعك، نتائج صفقاتك، والفرص الاستثمارية الجديدة.</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className={on ? 'btn-outline-gold' : 'btn-gold'} disabled={busy || denied} onClick={toggle} style={{ flex: 1, padding: '11px 0', opacity: busy || denied ? 0.5 : 1 }}>{busy ? '...' : on ? 'إيقاف على هذا الجهاز' : 'تفعيل الإشعارات'}</button>
        {on && <button type="button" className="btn-outline-gold" onClick={test} style={{ padding: '11px 16px' }}>تجربة</button>}
      </div>
      {denied && <div style={{ fontSize: 12, color: '#f59e0b', fontFamily: 'Cairo' }}>الإشعارات محظورة لهذا الموقع. فعّلها من إعدادات المتصفح ثم أعد المحاولة.</div>}
      {msg && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo' }}>{msg}</div>}
    </div>
  )
}
