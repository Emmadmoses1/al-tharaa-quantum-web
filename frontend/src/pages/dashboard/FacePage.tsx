import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import FaceCapture from '../../components/FaceCapture'

export default function FacePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const status = profile?.face_status || 'none'
  const note = (icon: React.ReactNode, title: string, text: string) => (
    <div style={{ textAlign: 'center', background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 16, padding: 28 }}>
      <div style={{ marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', fontFamily: 'Cairo', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', lineHeight: 1.9 }}>{text}</div>
    </div>
  )
  return (
    <div style={{ maxWidth: 440, margin: '0 auto', direction: 'rtl' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', margin: '0 0 16px' }}>التحقق من الوجه</h1>
      {status === 'approved' && note(<ShieldCheck size={40} color="#10b981" />, 'تم التحقق من وجهك', 'حسابك موثّق ويمكنك استخدام كل الخدمات بما فيها السحب.')}
      {status === 'pending' && note(<Clock size={40} color="#f59e0b" />, 'صورتك قيد المراجعة', 'سنُبلغك عبر البريد الإلكتروني فور الانتهاء. عادةً لا تستغرق المراجعة طويلاً.')}
      {(status === 'none' || status === 'rejected') && user && (
        <>
          {status === 'rejected' && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '12px 14px', marginBottom: 14, fontSize: 13, color: '#ef4444', fontFamily: 'Cairo', lineHeight: 1.8 }}>
              لم تُقبل صورتك السابقة{profile?.face_reject_reason ? `: ${profile.face_reject_reason}` : ''}. التقط صورة جديدة.
            </div>
          )}
          <FaceCapture userId={user.id} onDone={() => navigate('/dashboard')} />
        </>
      )}
    </div>
  )
}
