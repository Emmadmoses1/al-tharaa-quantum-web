import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import { getDevice } from '../lib/device'
import { uploadAvatar } from '../lib/avatar'
import { useAuth } from '../context/AuthContext'
import AvatarPicker from '../components/AvatarPicker'
import { Eye, EyeOff, AlertCircle, CheckCircle, MailCheck, ShieldAlert } from 'lucide-react'

const field: React.CSSProperties = {
  width: '100%', background: 'rgba(11,11,11,0.6)', border: '1px solid rgba(212,175,55,0.2)',
  borderRadius: 8, padding: '12px 14px', color: '#fff', fontSize: 14, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box',
}
const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontFamily: 'Cairo', marginBottom: 8 }

function arError(m: string): string {
  if (/already registered/i.test(m)) return 'هذا البريد الإلكتروني مسجّل بالفعل'
  if (/wait a minute/i.test(m)) return 'انتظر دقيقة قبل طلب رمز جديد'
  if (/too many/i.test(m)) return 'محاولات كثيرة. حاول لاحقاً'
  if (/not set up/i.test(m)) return 'خدمة البريد غير مفعّلة حالياً. حاول لاحقاً'
  if (/could not send/i.test(m)) return 'تعذر إرسال الرمز. تأكد من البريد وحاول مجدداً'
  if (/expired/i.test(m)) return 'انتهت صلاحية الرمز. اطلب رمزاً جديداً'
  if (/wrong code/i.test(m)) return `الرمز غير صحيح. ${m.match(/(\d+) attempts/)?.[1] ?? ''} محاولات متبقية`
  if (/failed to fetch|network/i.test(m)) return 'تعذر الاتصال بالخادم. حاول مجدداً'
  return m
}

export default function RegisterPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<'form' | 'code' | 'done' | 'suspended'>('form')
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [code, setCode] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wait, setWait] = useState(0)
  const timer = useRef<number | null>(null)

  const email = form.email.trim().toLowerCase()
  function setF(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  useEffect(() => {
    if (step === 'done' && !loading && user) navigate('/dashboard', { replace: true })
  }, [step, user, loading, navigate])

  useEffect(() => {
    if (wait <= 0) return
    timer.current = window.setTimeout(() => setWait(w => w - 1), 1000)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [wait])

  async function sendCode() {
    setBusy(true); setError(null)
    try {
      await api.post('/api/signup/start', { email, full_name: form.fullName.trim() })
      setStep('code'); setCode(''); setWait(60)
    } catch (e) { setError(arError(e instanceof Error ? e.message : 'حدث خطأ')) }
    setBusy(false)
  }

  async function handleForm(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!photo)                         return setError('يرجى إضافة صورتك الشخصية')
    if (form.fullName.trim().length < 2) return setError('يرجى إدخال الاسم الكامل')
    if (!/^\S+@\S+\.\S+$/.test(email))  return setError('يرجى إدخال بريد إلكتروني صحيح')
    if (form.password.length < 8)       return setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    if (form.password !== form.confirm) return setError('كلمتا المرور غير متطابقتين')
    await sendCode()
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^\d{6}$/.test(code)) return setError('أدخل الرمز المكوّن من 6 أرقام')
    setBusy(true)
    try {
      const device = await getDevice()
      const r = await api.post<{ suspended: boolean }>('/api/signup/verify', { email, code, password: form.password, full_name: form.fullName.trim(), device })
      if (r.suspended) { setStep('suspended'); setBusy(false); return }
      const { data, error: se } = await supabase.auth.signInWithPassword({ email, password: form.password })
      if (se || !data.user) throw new Error(se?.message || 'فشل تسجيل الدخول')
      if (photo) { try { await uploadAvatar(data.user.id, photo) } catch (err) { console.warn('avatar upload failed', err) } }
      setStep('done')
    } catch (err) { setError(arError(err instanceof Error ? err.message : 'حدث خطأ')) }
    setBusy(false)
  }

  const center: React.CSSProperties = { minHeight: '100vh', background: '#0B0B0B', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl', padding: 24 }

  if (step === 'done') {
    return (
      <div style={center}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><CheckCircle size={36} color="#10b981" /></div>
          <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 10 }}>تم إنشاء حسابك بنجاح!</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo' }}>جارٍ تحويلك...</p>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(212,175,55,0.15)', borderTop: '3px solid #D4AF37', animation: 'spin 0.9s linear infinite', margin: '24px auto 0' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    )
  }

  if (step === 'suspended') {
    return (
      <div style={center}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{ width: 72, height: 72, background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><ShieldAlert size={34} color="#ef4444" /></div>
          <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 10 }}>تم إيقاف الحساب</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo', lineHeight: 1.9 }}>تم اكتشاف حساب آخر مسجّل من هذا الجهاز. يُسمح بحساب واحد لكل جهاز. إن كان هذا خطأً فتواصل مع الدعم لمراجعة حسابك.</p>
          <Link to="/login" style={{ display: 'inline-block', marginTop: 14, color: '#D4AF37', fontFamily: 'Cairo', textDecoration: 'none', fontWeight: 600 }}>العودة لتسجيل الدخول</Link>
        </div>
      </div>
    )
  }

  const errBox = error && (
    <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '12px 14px', marginBottom: 18, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontSize: 13, color: '#ef4444', fontFamily: 'Cairo', lineHeight: 1.6 }}>{error}</span>
    </div>
  )

  const submitBtn = (text: string, busyText: string): React.ReactNode => (
    <button type="submit" disabled={busy} style={{ width: '100%', background: busy ? 'rgba(212,175,55,0.5)' : 'linear-gradient(135deg, #D4AF37, #E8CC6A)', border: 'none', borderRadius: 8, padding: 14, color: '#0B0B0B', fontSize: 15, fontWeight: 700, fontFamily: 'Cairo', cursor: busy ? 'not-allowed' : 'pointer' }}>
      {busy ? busyText : text}
    </button>
  )

  return (
    <div style={{ ...center, alignItems: 'flex-start', paddingTop: 40 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #D4AF37, #E8CC6A)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 20, color: '#0B0B0B', fontFamily: 'Montserrat', margin: '0 auto 14px' }}>AQ</div>
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}>{step === 'form' ? 'إنشاء حساب جديد' : 'تأكيد البريد الإلكتروني'}</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>{step === 'form' ? 'انضم إلى الثراء كوانتوم' : 'خطوة أخيرة لإنشاء حسابك'}</p>
        </div>

        <div style={{ background: 'rgba(44,44,44,0.4)', backdropFilter: 'blur(12px)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 16, padding: '28px 26px' }}>
          {errBox}

          {step === 'form' && (
            <form onSubmit={handleForm}>
              <div style={{ marginBottom: 20 }}><AvatarPicker onPick={setPhoto} disabled={busy} label="أضف صورتك الشخصية (مطلوبة)" /></div>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="rg-name" style={label}>الاسم الكامل</label>
                <input id="rg-name" type="text" value={form.fullName} onChange={e => setF('fullName', e.target.value)} placeholder="محمد عبدالله" disabled={busy} style={field} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="rg-mail" style={label}>البريد الإلكتروني</label>
                <input id="rg-mail" type="email" value={form.email} onChange={e => setF('email', e.target.value)} placeholder="example@email.com" dir="ltr" disabled={busy} style={{ ...field, fontFamily: 'Montserrat' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="rg-pass" style={label}>كلمة المرور</label>
                <div style={{ position: 'relative' }}>
                  <input id="rg-pass" type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setF('password', e.target.value)} placeholder="8 أحرف على الأقل" dir="ltr" disabled={busy} style={{ ...field, padding: '12px 44px 12px 14px', fontFamily: 'Montserrat' }} />
                  <button type="button" onClick={() => setShowPass(s => !s)} aria-label="إظهار كلمة المرور" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label htmlFor="rg-conf" style={label}>تأكيد كلمة المرور</label>
                <input id="rg-conf" type="password" value={form.confirm} onChange={e => setF('confirm', e.target.value)} placeholder="••••••••" dir="ltr" disabled={busy} style={{ ...field, fontFamily: 'Montserrat' }} />
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cairo', lineHeight: 1.7, marginBottom: 18 }}>بالتسجيل أنت توافق على شروط الخدمة. الاستثمار ينطوي على مخاطر. يُسمح بحساب واحد لكل جهاز.</p>
              {submitBtn('إرسال رمز التحقق', 'جارٍ الإرسال...')}
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleVerify}>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <MailCheck size={34} color="#D4AF37" />
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo', lineHeight: 1.9, margin: '10px 0 0' }}>أرسلنا رمزاً من 6 أرقام إلى<br /><b dir="ltr" style={{ color: '#fff', fontFamily: 'Montserrat' }}>{email}</b></p>
              </div>
              <input aria-label="رمز التحقق" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} value={code} dir="ltr" disabled={busy}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••"
                style={{ ...field, textAlign: 'center', fontSize: 26, letterSpacing: 10, fontFamily: 'Montserrat', fontWeight: 700, marginBottom: 18 }} />
              {submitBtn('تأكيد وإنشاء الحساب', 'جارٍ التحقق...')}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontFamily: 'Cairo', fontSize: 13 }}>
                <button type="button" onClick={() => { setStep('form'); setError(null) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'Cairo' }}>تعديل البيانات</button>
                <button type="button" disabled={wait > 0 || busy} onClick={sendCode} style={{ background: 'none', border: 'none', color: wait > 0 ? 'rgba(255,255,255,0.3)' : '#D4AF37', cursor: wait > 0 ? 'default' : 'pointer', fontFamily: 'Cairo', fontWeight: 600 }}>
                  {wait > 0 ? `إعادة الإرسال خلال ${wait}ث` : 'إعادة إرسال الرمز'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cairo', textAlign: 'center', marginTop: 14 }}>لم يصل الرمز؟ تحقق من مجلد الرسائل غير المرغوبة (Spam).</p>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(212,175,55,0.1)' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>لديك حساب؟{' '}</span>
            <Link to="/login" style={{ fontSize: 13, color: '#D4AF37', textDecoration: 'none', fontWeight: 600, fontFamily: 'Cairo' }}>تسجيل الدخول</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
