import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const state = location.state as {
    registered?: boolean; email?: string; from?: { pathname: string }
  } | null

  const [email, setEmail] = useState(state?.email || '')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user) {
      const dest = state?.from?.pathname || '/dashboard'
      navigate(dest, { replace: true })
    }
  }, [user, loading, navigate, state])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) return setError('يرجى إدخال البريد الإلكتروني')
    if (!password)     return setError('يرجى إدخال كلمة المرور')

    setSubmitting(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (signInError) {
        setSubmitting(false)
        if (
          signInError.message.includes('Invalid') ||
          signInError.message.includes('credentials') ||
          signInError.message.includes('not found')
        ) {
          return setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        }
        return setError(signInError.message)
      }

      if (!data.user) {
        setSubmitting(false)
        return setError('فشل تسجيل الدخول. حاول مرة أخرى.')
      }

      // Don't navigate here — the useEffect above watches AuthContext's
      // `user` state and will redirect once it's actually updated via
      // onAuthStateChange. Navigating manually here races that update.
      setSubmitting(false)

    } catch (err: any) {
      setSubmitting(false)
      setError('حدث خطأ. يرجى المحاولة مرة أخرى.')
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0B0B0B',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid rgba(212,175,55,0.15)',
          borderTop: '3px solid #D4AF37',
          animation: 'spin 0.9s linear infinite',
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0B0B0B',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', direction: 'rtl',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
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
          }}>مرحباً بعودتك</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>
            سجّل دخولك إلى الثراء كوانتوم
          </p>
        </div>

        {state?.registered && (
          <div style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 10, padding: '13px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <CheckCircle size={16} color="#10b981" />
            <span style={{ fontSize: 13, color: '#10b981', fontFamily: 'Cairo', lineHeight: 1.6 }}>
              تم إنشاء حسابك بنجاح! سجّل دخولك الآن.
            </span>
          </div>
        )}

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
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600,
                color: 'rgba(255,255,255,0.7)', fontFamily: 'Cairo', marginBottom: 8,
              }}>البريد الإلكتروني</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@email.com"
                dir="ltr" disabled={submitting} autoComplete="email"
                style={{
                  width: '100%', background: 'rgba(11,11,11,0.6)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  borderRadius: 8, padding: '12px 14px',
                  color: '#fff', fontSize: 14, fontFamily: 'Montserrat',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600,
                color: 'rgba(255,255,255,0.7)', fontFamily: 'Cairo', marginBottom: 8,
              }}>كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr" disabled={submitting} autoComplete="current-password"
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

            <div style={{ textAlign: 'left', marginBottom: 20 }}>
              <a href="#" style={{
                fontSize: 12, color: '#D4AF37',
                textDecoration: 'none', fontFamily: 'Cairo',
              }}>نسيت كلمة المرور؟</a>
            </div>

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
                  جارٍ تسجيل الدخول...
                </>
              ) : 'تسجيل الدخول'}
            </button>
          </form>

          <div style={{
            textAlign: 'center', marginTop: 20, paddingTop: 20,
            borderTop: '1px solid rgba(212,175,56,0.1)',
          }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>
              ليس لديك حساب؟{' '}
            </span>
            <Link to="/register" style={{
              fontSize: 13, color: '#D4AF37',
              textDecoration: 'none', fontWeight: 600, fontFamily: 'Cairo',
            }}>إنشاء حساب</Link>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
