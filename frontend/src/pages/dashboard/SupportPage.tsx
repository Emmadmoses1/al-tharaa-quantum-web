import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

type T = { id: number; subject: string; message: string; status: 'open' | 'answered' | 'closed'; admin_reply: string | null; replied_at: string | null; created_at: string }
const ST: Record<T['status'], [string, string]> = { open: ['قيد المراجعة', '#f59e0b'], answered: ['تم الرد', '#10b981'], closed: ['مغلقة', '#6b7280'] }

export default function SupportPage() {
  const [list, setList] = useState<T[]>([])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const load = useCallback(() => { api.get<T[]>('/api/support').then(setList).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  async function send() {
    setMsg(null)
    if (subject.trim().length < 3) return setMsg({ ok: false, text: 'اكتب عنواناً واضحاً (3 أحرف على الأقل).' })
    if (message.trim().length < 10) return setMsg({ ok: false, text: 'اشرح مشكلتك بتفصيل أكثر (10 أحرف على الأقل).' })
    setBusy(true)
    try {
      await api.post('/api/support', { subject: subject.trim(), message: message.trim() })
      setSubject(''); setMessage(''); setMsg({ ok: true, text: 'وصلتنا رسالتك. سنرد عليك قريباً.' }); load()
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'تعذر الإرسال' }) }
    setBusy(false)
  }
  const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'rgba(11,11,11,0.6)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, padding: '12px 14px', color: '#fff', fontFamily: 'Cairo', fontSize: 14, outline: 'none' }
  return (
    <div style={{ direction: 'rtl', maxWidth: 680 }}>
      <h1 style={{ color: '#fff', fontFamily: 'Cairo', fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>تواصل مع الدعم</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', fontSize: 13, lineHeight: 1.8, margin: '0 0 16px' }}>اكتب مشكلتك أو سؤالك وسنرد عليك هنا وعلى بريدك الإلكتروني. لا ترسل كلمة المرور أبداً.</p>
      <div className="dq-card" style={{ padding: 16, display: 'grid', gap: 10, marginBottom: 20 }}>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="العنوان" maxLength={120} style={field} />
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="اشرح مشكلتك أو سؤالك" maxLength={2000} rows={5} style={{ ...field, resize: 'vertical' }} />
        {msg ? <div style={{ color: msg.ok ? '#10b981' : '#ef4444', fontFamily: 'Cairo', fontSize: 13 }}>{msg.text}</div> : null}
        <button type="button" className="btn-gold" disabled={busy} onClick={send} style={{ padding: 13, opacity: busy ? 0.6 : 1 }}>{busy ? 'جارٍ الإرسال…' : 'إرسال'}</button>
      </div>
      {list.length > 0 ? <div style={{ color: '#D4AF37', fontFamily: 'Cairo', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>رسائلك</div> : null}
      <div style={{ display: 'grid', gap: 10 }}>
        {list.map(t => (
          <div key={t.id} className="dq-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <b style={{ color: '#fff', fontFamily: 'Cairo', fontSize: 14 }}>{t.subject}</b>
              <span style={{ color: ST[t.status][1], fontFamily: 'Cairo', fontSize: 12, fontWeight: 700 }}>{ST[t.status][0]}</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'Cairo', fontSize: 13, lineHeight: 1.8, margin: '6px 0', whiteSpace: 'pre-wrap' }}>{t.message}</div>
            {t.admin_reply ? (
              <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 10, padding: 10, marginTop: 6 }}>
                <div style={{ color: '#D4AF37', fontFamily: 'Cairo', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>رد الدعم</div>
                <div style={{ color: '#fff', fontFamily: 'Cairo', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{t.admin_reply}</div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
