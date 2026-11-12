import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

type Ev = { type: string; ip: string; country: string; at: string }
const LABEL: Record<string, string> = {
  login: 'تسجيل دخول', signup: 'إنشاء الحساب', password_reset: 'تغيير كلمة المرور', avatar_changed: 'تغيير الصورة الشخصية',
  face_submitted: 'إرسال التحقق من الوجه', face_approved: 'اعتماد التحقق من الوجه', face_rejected: 'رفض التحقق من الوجه',
}

export default function ActivityPanel() {
  const q = useQuery({ queryKey: ['account-activity'], staleTime: 30000, queryFn: () => api.get<Ev[]>('/api/account-activity') })
  return (
    <div style={{ marginTop: 18, background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 14, padding: 18, direction: 'rtl' }}>
      <div style={{ color: '#fff', fontFamily: 'Cairo', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>آخر نشاط في حسابك</div>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', fontSize: 12, marginBottom: 12, lineHeight: 1.8 }}>
        إذا رأيت نشاطاً لا تعرفه، غيّر كلمة المرور فوراً وتواصل مع الدعم.
      </div>
      {q.isLoading ? <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>…</div> : null}
      {q.isError ? <div style={{ color: '#ef4444', fontFamily: 'Cairo', fontSize: 13 }}>تعذّر تحميل النشاط</div> : null}
      {q.data && q.data.length === 0 ? <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', fontSize: 13 }}>لا يوجد نشاط بعد.</div> : null}
      {(q.data || []).map((e, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderTop: i ? '1px solid rgba(212,175,55,0.06)' : 'none', fontSize: 13 }}>
          <span style={{ color: '#fff', fontFamily: 'Cairo' }}>{LABEL[e.type] || e.type}</span>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Montserrat', fontSize: 11, textAlign: 'left', direction: 'ltr' }}>
            {[e.country, e.ip, new Date(e.at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })].filter(Boolean).join(' · ')}
          </span>
        </div>
      ))}
    </div>
  )
}
