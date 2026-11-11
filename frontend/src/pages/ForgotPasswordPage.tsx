import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Eye, EyeOff, AlertCircle, CheckCircle, MailCheck } from 'lucide-react'

const field: React.CSSProperties = {
  width: '100%', background: 'rgba(11,11,11,0.6)', border: '1px solid rgba(212,175,55,0.2)',
  borderRadius: 8, padding: '12px 14px', color: '#fff', fontSize: 14, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box',
}
const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontFamily: 'Cairo', marginBottom: 8 }

function arError(m: string): string {
  if (/not set up/i.test(m)) return 'خدمة البريد غير مفعّلة حالياً. حاول لاحقاً'
  if (/could not send/i.test(m)) return 'تعذر إرسال الرمز. حاول مجدداً'
  if (/too many/i.test(m)) return 'محاولات كثيرة. حاول لاحقاً'
  if (/expired/i.test(m)) return 'انتهت صلاحية الرمز. اطلب رمزاً جديداً'
  if (/wrong code/i.test(m)) return `الرمز غير صحيح. ${m.match(/(\d+) attempts/)?.[1] ?? ''} محاولات متبقية`
  if (/failed to fetch|network/i.test(m)) return 'تعذر الاتصال بالخادم. حاول مجدداً'
  return m
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wait, setWait] = useState(0)
  const timer = useRef<number | null>(null)

  const mail = email.trim().toLowerCase()

  useEffect(() => {
    if (wait <= 0) return
    timer.current = window.setTimeout(() => setWait(w => w - 1), 1000)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [wait])

  async function sendCode() {
    setBusy(true); setError(null)
    try {
      await api.post('/api/password/start', { email: mail })
      setStep('reset'); setCode(''); setWait(60)
    } catch (e) { setError(arError(e instanceof Error ? e.message : 'حدث خطأ')) }
    setBusy(false)
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setError('يرجى إدخال بريد إلكتروني صحيح')
    await sendCode()
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^\d{6}$/.test(code)) return setError('أدخل الرمز المكوّن من 6 أرقام')
    if (pw.length < 8) return setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    if (pw !== pw2) return setError('كلمتا المرور غير متطابقتين')
    setBusy(true)
    try {
      await api.post('/api/password/reset', { email: mail, code, password: pw })
      setStep('done')
    } catch (err) { setError(arError(err instanceof Error ? err.message : 'حدث خطأ')) }
    setBusy(false)
  }

  const submit = (text: string, busyText: string): React.ReactNode => (
    <button type="submit" disabled={busy} style={{ width: '100%', background: busy ? 'rgba(212,175,55,0.5)' : 'linear-gradient(135deg, #D4AF37, #E8CC6A)', border: 'none', borderRadius: 8, padding: 14, color: '#0B0B0B', fontSize: 15, fontWeight: 700, fontFamily: 'Cairo', cursor: busy ? 'not-allowed' : 'pointer' }}>
      {busy ? busyText : text}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0B', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #D4AF37, #E8CC6A)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 20, color: '#0B0B0B', fontFamily: 'Montserrat', margin: '0 auto 14px' }}>AQ</div>
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}>استعادة كلمة المرور</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>{step === 'email' ? 'سنرسل رمز تحقق إلى بريدك' : step === 'reset' ? 'أدخل الرمز وكلمة المرور الجديدة' : ''}</p>
        </div>

        <div style={{ background: 'rgba(44,44,44,0.4)', backdropFilter: 'blur(12px)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 16, padding: '28px 26px' }}>
          {error && (
            <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '12px 14px', marginBottom: 18, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: '#ef4444', fontFamily: 'Cairo', lineHeight: 1.6 }}>{error}</span>
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleEmail}>
              <div style={{ marginBottom: 18 }}>
                <label htmlFor="fp-mail" style={label}>البريد الإلكتروني</label>
                <input id="fp-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" dir="ltr" autoComplete="email" disabled={busy} style={{ ...field, fontFamily: 'Montserrat' }} />
              </div>
              {submit('إرسال الرمز', 'جارٍ الإرسال...')}
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleReset}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <MailCheck size={32} color="#D4AF37" />
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo', lineHeight: 1.9, margin: '8px 0 0' }}>إن كان هذا البريد مسجّلاً فقد أرسلنا إليه رمزاً من 6 أرقام<br /><b dir="ltr" style={{ color: '#fff', fontFamily: 'Montserrat' }}>{mail}</b></p>
              </div>
              <input aria-label="رمز التحقق" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} value={code} dir="ltr" disabled={busy}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••"
                style={{ ...field, textAlign: 'center', fontSize: 26, letterSpacing: 10, fontFamily: 'Montserrat', fontWeight: 700, marginBottom: 16 }} />
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="fp-pw" style={label}>كلمة المرور الجديدة</label>
                <div style={{ position: 'relative' }}>
                  <input id="fp-pw" type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="8 أحرف على الأقل" dir="ltr" autoComplete="new-password" disabled={busy} style={{ ...field, padding: '12px 44px 12px 14px', fontFamily: 'Montserrat' }} />
                  <button type="button" onClick={() => setShow(s => !s)} aria-label="إظهار كلمة المرور" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label htmlFor="fp-pw2" style={label}>تأكيد كلمة المرور</label>
                <input id="fp-pw2" type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="••••••••" dir="ltr" autoComplete="new-password" disabled={busy} style={{ ...field, fontFamily: 'Montserrat' }} />
              </div>
              {submit('تغيير كلمة المرور', 'جارٍ الحفظ...')}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontFamily: 'Cairo', fontSize: 13 }}>
                <button type="button" onClick={() => { setStep('email'); setError(null) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'Cairo' }}>تعديل البريد</button>
                <button type="button" disabled={wait > 0 || busy} onClick={sendCode} style={{ background: 'none', border: 'none', color: wait > 0 ? 'rgba(255,255,255,0.3)' : '#D4AF37', cursor: wait > 0 ? 'default' : 'pointer', fontFamily: 'Cairo', fontWeight: 600 }}>
                  {wait > 0 ? `إعادة الإرسال خلال ${wait}ث` : 'إعادة إرسال الرمز'}
                </button>
              </div>
            </form>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><CheckCircle size={32} color="#10b981" /></div>
              <p style={{ fontSize: 15, color: '#fff', fontFamily: 'Cairo', fontWeight: 700, margin: '0 0 6px' }}>تم تغيير كلمة المرور</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', margin: '0 0 18px' }}>يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.</p>
              <Link to="/login" state={{ email: mail }} style={{ display: 'block', background: 'linear-gradient(135deg, #D4AF37, #E8CC6A)', borderRadius: 8, padding: 14, color: '#0B0B0B', fontSize: 15, fontWeight: 700, fontFamily: 'Cairo', textDecoration: 'none' }}>تسجيل الدخول</Link>
            </div>
          )}

          {step !== 'done' && (
            <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(212,175,55,0.1)' }}>
              <Link to="/login" style={{ fontSize: 13, color: '#D4AF37', textDecoration: 'none', fontWeight: 600, fontFamily: 'Cairo' }}>العودة لتسجيل الدخول</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
