import { Link } from 'react-router-dom'
import MarketsBoard from '../../components/MarketsBoard'

export default function MarketsDash() {
  return (
    <div style={{ direction: 'rtl', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}>الأسواق</h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', marginBottom: 20 }}>أسعار حية لأصول التداول.</p>
      <MarketsBoard />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
        <Link to="/dashboard/signals" className="btn-gold" style={{ textDecoration: 'none', padding: '12px 22px', fontSize: 14 }}>الإشارات</Link>
        <Link to="/dashboard/ai" className="btn-outline-gold" style={{ textDecoration: 'none', padding: '12px 22px', fontSize: 14 }}>ذكاء السوق</Link>
      </div>
    </div>
  )
}
