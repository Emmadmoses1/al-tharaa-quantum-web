import { ShieldAlert } from 'lucide-react'
import { useSite } from '../lib/useSite'

export default function SuspendedScreen({ onSignOut }: { onSignOut: () => void }) {
  const { data: site } = useSite()
  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0B', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{ width: 72, height: 72, background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><ShieldAlert size={34} color="#ef4444" /></div>
        <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 10 }}>تم إيقاف حسابك</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo', lineHeight: 1.9, margin: '0 0 6px' }}>لا يمكن استخدام الحساب حالياً. إن كنت تعتقد أن هذا خطأ فتواصل مع الدعم لمراجعته.</p>
        {site?.support_email && <p dir="ltr" style={{ fontSize: 13, color: '#D4AF37', fontFamily: 'Montserrat', margin: '0 0 18px' }}>{site.support_email}</p>}
        <button type="button" onClick={onSignOut} className="btn-outline-gold" style={{ padding: '11px 28px', fontFamily: 'Cairo' }}>تسجيل الخروج</button>
      </div>
    </div>
  )
}
