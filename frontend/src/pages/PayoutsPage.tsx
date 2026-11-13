import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import PayoutProof from '../components/PayoutProof'
import Footer from '../components/layout/Footer'

export default function PayoutsPage() {
  useEffect(() => { document.title = 'إثباتات السحب | الثراء كوانتوم' }, [])
  return (
    <div style={{ background: '#0B0B0B', minHeight: '100vh', color: '#fff', direction: 'rtl' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px 0' }}>
        <Link to="/" style={{ color: '#D4AF37', fontFamily: 'Cairo', fontSize: 14, textDecoration: 'none' }}>→ الرئيسية</Link>
        <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Cairo', margin: '18px 0 6px', textAlign: 'center' }}>إثباتات السحب</h1>
      </div>
      <PayoutProof full />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 40px', fontFamily: 'Cairo', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 2 }}>
        <b style={{ color: '#fff' }}>كيف تتحقق بنفسك؟</b> اضغط «تحقق على البلوكتشين» لفتح العملية في مستكشف الشبكة، وقارن المبلغ والشبكة والوقت. الأسماء مخفية حفاظاً على خصوصية العملاء. تُعرض فقط عمليات السحب المكتملة من سجلات المنصة.
      </div>
      <Footer />
    </div>
  )
}
