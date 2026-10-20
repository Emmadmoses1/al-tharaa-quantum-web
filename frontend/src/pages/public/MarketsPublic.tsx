import { Link } from 'react-router-dom'
import PublicShell from '../../components/layout/PublicShell'
import MarketsBoard from '../../components/MarketsBoard'
import PriceChart from '../../components/PriceChart'
import { useAuth } from '../../context/AuthContext'

export default function MarketsPublic() {
  const { user } = useAuth()
  return (
    <PublicShell title="الأسواق" subtitle="أسعار ورسوم بيانية حية لأصول المنصة الرئيسية.">
      <MarketsBoard />
      <div className="glass-card" style={{ padding: 14, marginTop: 18 }}>
        <PriceChart />
      </div>
      <div style={{ marginTop: 24 }}>
        <Link to={user ? '/dashboard/signals' : '/register'} className="btn-gold" style={{ textDecoration: 'none', padding: '13px 24px', fontSize: 14, display: 'inline-block' }}>
          {user ? 'عرض الإشارات' : 'أنشئ حساباً لرؤية إشارات الذكاء الاصطناعي'}
        </Link>
      </div>
    </PublicShell>
  )
}
