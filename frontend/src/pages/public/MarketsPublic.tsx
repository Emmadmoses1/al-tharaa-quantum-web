import { Link } from 'react-router-dom'
import PublicShell from '../../components/layout/PublicShell'
import MarketsBoard from '../../components/MarketsBoard'
import { useAuth } from '../../context/AuthContext'

export default function MarketsPublic() {
  const { user } = useAuth()
  return (
    <PublicShell title="الأسواق" subtitle="أسعار حية لأصول المنصة الرئيسية.">
      <MarketsBoard />
      <div style={{ marginTop: 24 }}>
        <Link to={user ? '/dashboard/signals' : '/register'} className="btn-gold" style={{ textDecoration: 'none', padding: '13px 24px', fontSize: 14, display: 'inline-block' }}>
          {user ? 'عرض الإشارات' : 'أنشئ حساباً لرؤية الإشارات'}
        </Link>
      </div>
    </PublicShell>
  )
}
