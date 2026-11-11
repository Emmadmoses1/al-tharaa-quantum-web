import { Link } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// Reminder for accounts that must verify their face (new accounts) and have not been approved yet.
export default function FaceBanner() {
  const { profile } = useAuth()
  if (!profile || !profile.face_required) return null
  const s = profile.face_status || 'none'
  if (s === 'approved') return null
  const text = s === 'pending' ? 'صورتك قيد المراجعة. سنُبلغك بالنتيجة عبر البريد.' : s === 'rejected' ? 'لم تُقبل صورتك. أعد التقاطها لتتمكن من السحب.' : 'أكمل التحقق من وجهك لتتمكن من السحب.'
  return (
    <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, direction: 'rtl' }}>
      <Camera size={22} color="#f59e0b" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, fontSize: 13, color: '#fff', fontFamily: 'Cairo', lineHeight: 1.7 }}>{text}</div>
      {s !== 'pending' && <Link to="/dashboard/verify-face" style={{ background: '#f59e0b', color: '#0B0B0B', fontFamily: 'Cairo', fontWeight: 700, fontSize: 12, padding: '8px 14px', borderRadius: 8, textDecoration: 'none', flexShrink: 0 }}>تحقق الآن</Link>}
    </div>
  )
}
