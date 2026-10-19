import { useState } from 'react'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const input: React.CSSProperties = {
  width: '100%', background: 'rgba(44,44,44,0.5)', border: '1px solid rgba(212,175,55,0.2)',
  borderRadius: 8, padding: '12px 14px', color: '#fff', fontFamily: 'Montserrat', fontSize: 14, outline: 'none',
}

export default function SecurityPanel() {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function submit() {
    setMsg(null)
    if (pw.length < 8) return setMsg({ ok: false, text: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
    if (pw !== pw2) return setMsg({ ok: false, text: 'كلمتا المرور غير متطابقتين' })
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return setMsg({ ok: false, text: error.message })
    setPw(''); setPw2('')
    setMsg({ ok: true, text: 'تم تغيير كلمة المرور بنجاح' })
  }

  const soon = (label: string, desc: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 0', borderTop: '1px solid rgba(212,175,55,0.06)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: 'Cairo', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo' }}>{desc}</div>
      </div>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 100, padding: '4px 12px', fontFamily: 'Cairo', flexShrink: 0 }}>قريباً</span>
    </div>
  )

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', marginBottom: 16 }}>إعدادات الأمان</h2>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: 'Cairo', marginBottom: 10 }}>تغيير كلمة المرور</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420, marginBottom: 14 }}>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="كلمة المرور الجديدة" style={input} dir="ltr" autoComplete="new-password" />
        <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="تأكيد كلمة المرور" style={input} dir="ltr" autoComplete="new-password" />
        <button className="btn-gold" onClick={submit} disabled={busy} style={{ opacity: busy ? 0.6 : 1 }}>
          {busy ? 'جارٍ الحفظ...' : 'تحديث كلمة المرور'}
        </button>
      </div>
      {msg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontFamily: 'Cairo', marginBottom: 14, color: msg.ok ? '#10b981' : '#ef4444' }}>
          {msg.ok ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}{msg.text}
        </div>
      )}
      {soon('المصادقة الثنائية (2FA)', 'ستتوفر في تحديث قادم')}
      {soon('عناوين السحب الموثوقة', 'ستتوفر في تحديث قادم')}
    </div>
  )
}
