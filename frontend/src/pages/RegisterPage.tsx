import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function setF(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  useEffect(() => {
    if (success && !loading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [success, user, loading, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.fullName.trim())          return setError('يرجى إدخال الاسم الكامل')
    if (!form.email.trim())             return setError('يرجى إدخال البريد الإلكتروني')
    if (form.password.length < 8)       return setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    if (form.password !== form.confirm) return setError('كلمتا المرور غير متطابقتين')

    setSubmitting(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: { data: { full_name: form.fullName.trim() } },
      })

      if (signUpError) {
        setSubmitting(false)
        if (
          signUpError.message.toLowerCase().includes('already') ||
          signUpError.message.toLowerCase().includes('registered') ||
          signUpError.message.toLowerCase().includes('exists') ||
          signUpError.message.toLowerCase().includes('rate')
        ) {
          return setError('هذا البريد الإلكتروني مسجّل بالفعل أو حاول مرة أخرى لاحقاً')
        }
        return setError(signUpError.message)
      }

      if (!data.user) {
        setSubmitting(false)
        return setError('فشل إنشاء الحساب. حاول مرة أخرى.')
      }

      setSuccess(true)

    } catch (err: any) {
      setSubmitting(false)
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.')
    }
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0B0B0B',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        direction: 'rtl',
      }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{
            width: 72, height: 72,
            background: 'rgba(16,185,129,0.1)',
            border: '2px solid rgba(16,185,129,0.3)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <CheckCircle size={36} color="#10b981" />
          </div>
          <h2 style={{
            fontSize: 22, fontWeight: 800,
            fontFamily: 'Cairo', color: '#fff', marginBottom: 10,
          }}>تم إنشاء حسابك بنجاح!</h2>
          <p style={{
            fontSize: 14, color: 'rgba(255,255,255,0.5)',
            fontFamily: 'Cairo', lineHeight: 1.8,
          }}>جارٍ تحويلك...</p>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid rgba(212,175,55,0.15)',
            borderTop: '3px solid #D4AF37',
            animation: 'spin 0.9s linear infinite',
            margin: '24px auto 0',
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0B0B0B',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', direction: 'rtl',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{
              width: 52, height: 52,
              background: 'linear-gradient(135deg, #D4AF37, #E8CC6A)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 20,
              color: '#0B0B0B', fontFamily: 'Montserrat',
              margin: '0 auto 14px',
            }}>AQ</div>
          </Link>
          <h1 style={{
            fontSize: 24, fontWeight: 800,
            fontFamily: 'Cairo', color: '#fff', marginBottom: 6,
          }}>إنشاء حساب جديد</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>
            انضم إلى الثراء كوانتوم
          </p>
        </div>

        <div style={{
          background: 'rgba(44,44,44,0.4)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(212,175,55,0.15)',
          borderRadius: 16, padding: '32px 28px',
        }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8, padding: '12px 14px', marginBottom: 18,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: '#ef4444', fontFamily: 'Cairo', lineHeight: 1.6 }}>
                {error}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600,
                color: 'rgba(255,255,255,0.7)', fontFamily: 'Cairo', marginBottom: 8,
              }}>الاسم الكامل</label>
              <input
                type="text" value={form.fullName}
                onChange={e => setF('fullName', e.target.value)}
                placeholder="محمد عبدالله" disabled={submitting}
                style={{
                  width: '100%', background: 'rgba(11,11,11,0.6)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  borderRadius: 8, padding: '12px 14px',
                  color: '#fff', fontSize: 14, fontFamily: 'Cairo',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600,
                color: 'rgba(255,255,255,0.7)', fontFamily: 'Cairo', marginBottom: 8,
              }}>البريد الإلكتروني</label>
              <input
                type="email" value={form.email}
                onChange={e => setF('email', e.target.value)}
                placeholder="example@email.com" dir="ltr" disabled={submitting}
                style={{
                  width: '100%', background: 'rgba(11,11,11,0.6)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  borderRadius: 8, padding: '12px 14px',
                  color: '#fff', fontSize: 14, fontFamily: 'Montserrat',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600,
                color: 'rgba(255,255,255,0.7)', fontFamily: 'Cairo', marginBottom: 8,
              }}>كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => setF('password', e.target.value)}
                  placeholder="8 أحرف على الأقل" dir="ltr" disabled={submitting}
                  style={{
                    width: '100%', background: 'rgba(11,11,11,0.6)',
                    border: '1px solid rgba(212,175,55,0.2)',
                    borderRadius: 8, padding: '12px 44px 12px 14px',
                    color: '#fff', fontSize: 14, fontFamily: 'Montserrat',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, color: 'rgba(255,255,255,0.4)', display: 'flex',
                }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600,
                color: 'rgba(255,255,255,0.7)', fontFamily: 'Cairo', marginBottom: 8,
              }}>تأكيد كلمة المرور</label>
              <input
                type="password" value={form.confirm}
                onChange={e => setF('confirm', e.target.value)}
                placeholder="••••••••" dir="ltr" disabled={submitting}
                style={{
                  width: '100%', background: 'rgba(11,11,11,0.6)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  borderRadius: 8, padding: '12px 14px',
                  color: '#fff', fontSize: 14, fontFamily: 'Montserrat',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <p style={{
              fontSize: 11, color: 'rgba(255,255,255,0.25)',
              fontFamily: 'Cairo', lineHeight: 1.7, marginBottom: 18,
            }}>
              بالتسجيل أنت توافق على شروط الخدمة. الاستثمار ينطوي على مخاطر.
            </p>

            <button
              type="submit" disabled={submitting}
              style={{
                width: '100%',
                background: submitting
                  ? 'rgba(212,175,55,0.5)'
                  : 'linear-gradient(135deg, #D4AF37, #E8CC6A)',
                border: 'none', borderRadius: 8,
                padding: '14px', color: '#0B0B0B',
                fontSize: 15, fontWeight: 700, fontFamily: 'Cairo',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 10, transition: 'all 0.2s',
              }}
            >
              {submitting ? (
                <>
                  <div style={{
                    width: 18, height: 18,
                    border: '2px solid rgba(11,11,11,0.3)',
                    borderTop: '2px solid #0B0B0B',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  جارٍ إنشاء الحساب...
                </>
              ) : 'إنشاء الحساب'}
            </button>
          </form>

          <div style={{
            textAlign: 'center', marginTop: 20, paddingTop: 20,
            borderTop: '1px solid rgba(212,175,55,0.1)',
          }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>
              لديك حساب؟{' '}
            </span>
            <Link to="/login" style={{
              fontSize: 13, color: '#D4AF37',
              textDecoration: 'none', fontWeight: 600, fontFamily: 'Cairo',
            }}>تسجيل الدخول</Link>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
