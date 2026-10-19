import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState<'wait' | 'ok' | 'bad'>('wait')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const { data: sub } = supabase.auth.onAuthStateChange((ev, session) => {
      if (alive && (ev === 'PASSWORD_RECOVERY' || session)) setReady('ok')
    })
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession()
      if (alive) setReady(data.session ? 'ok' : 'bad')
    }, 1500)
    return () => { alive = false; clearTimeout(t); sub.subscription.unsubscribe() }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (pw.length < 8) return setErr('كلمة المرور يجب ألا تقل عن 8 أحرف')
    if (pw !== pw2) return setErr('كلمتا المرور غير متطابقتين')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return setErr(error.message)
    navigate('/dashboard', { replace: true })
  }

  const field = { width: '100%', background: 'rgba(11,11,11,0.6)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: '13px 14px', color: '#fff', fontSize: 16, fontFamily: 'Montserrat', outline: 'none', boxSizing: 'border-box' as const, marginBottom: 12 }

  return (
    <div style={{ minHeight: '100dvh', background: '#0B0B0B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, direction: 'rtl' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', textAlign: 'center', marginBottom: 24 }}>كلمة مرور جديدة</h1>
        <div style={{ background: 'rgba(44,44,44,0.4)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 16, padding: '28px 24px' }}>
          {ready === 'wait' && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo' }}>جارٍ التحقق من الرابط…</div>}
          {ready === 'bad' && (
            <div style={{ textAlign: 'center', fontFamily: 'Cairo' }}>
              <div style={{ color: '#ef4444', marginBottom: 14, lineHeight: 1.8 }}>الرابط غير صالح أو منتهي. اطلب رابطاً جديداً.</div>
              <Link to="/forgot-password" style={{ color: '#D4AF37', textDecoration: 'none' }}>طلب رابط جديد</Link>
            </div>
          )}
          {ready === 'ok' && (
            <form onSubmit={submit}>
              {err && (
                <div style={{ display: 'flex', gap: 10, padding: '12px 14px', marginBottom: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8 }}>
                  <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, color: '#ef4444', fontFamily: 'Cairo' }}>{err}</span>
                </div>
              )}
              <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="كلمة المرور الجديدة" dir="ltr" autoComplete="new-password" style={field} />
              <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="تأكيد كلمة المرور" dir="ltr" autoComplete="new-password" style={field} />
              <button type="submit" disabled={busy} className="btn-gold" style={{ width: '100%', minHeight: 48, fontSize: 15, opacity: busy ? 0.6 : 1 }}>
                {busy ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
