import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AlertCircle, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!email.trim()) return setErr('يرجى إدخال البريد الإلكتروني')
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    setSent(true)
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0B0B0B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, direction: 'rtl' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', textAlign: 'center', marginBottom: 8 }}>استعادة كلمة المرور</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', textAlign: 'center', marginBottom: 24 }}>
          أدخل بريدك وسنرسل لك رابط إعادة التعيين
        </p>
        <div style={{ background: 'rgba(44,44,44,0.4)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 16, padding: '28px 24px' }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle size={42} color="#10b981" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 14, color: '#fff', fontFamily: 'Cairo', lineHeight: 1.8 }}>
                إذا كان البريد مسجلاً لدينا فقد أرسلنا رابط إعادة التعيين. تحقق من الوارد ومن الرسائل غير المرغوبة.
              </div>
            </div>
          ) : (
            <form onSubmit={submit}>
              {err && (
                <div style={{ display: 'flex', gap: 10, padding: '12px 14px', marginBottom: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8 }}>
                  <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, color: '#ef4444', fontFamily: 'Cairo' }}>{err}</span>
                </div>
              )}
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" dir="ltr" autoComplete="email"
                style={{ width: '100%', background: 'rgba(11,11,11,0.6)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: '13px 14px', color: '#fff', fontSize: 16, fontFamily: 'Montserrat', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
              <button type="submit" disabled={busy} className="btn-gold" style={{ width: '100%', minHeight: 48, fontSize: 15, opacity: busy ? 0.6 : 1 }}>
                {busy ? 'جارٍ الإرسال…' : 'إرسال الرابط'}
              </button>
            </form>
          )}
        </div>
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <Link to="/login" style={{ fontSize: 13, color: '#D4AF37', fontFamily: 'Cairo', textDecoration: 'none' }}>العودة لتسجيل الدخول</Link>
        </div>
      </div>
    </div>
  )
}
