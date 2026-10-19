import { ArrowLeft } from 'lucide-react'

const products = [
  {
    tag: 'AI FUND',
    name: 'صندوق العملات الرقمية بالذكاء الاصطناعي',
    desc: 'صندوق مُدار بالكامل بالذكاء الاصطناعي يستثمر في محفظة متنوعة من الأصول الرقمية باستخدام استراتيجيات كوانتوم المتكيفة.',
    min: 'BHD 500',
    risk: 'متوسط — مرتفع',
    badge: null,
  },
  {
    tag: 'VAULT',
    name: 'قبو كوانتوم',
    desc: 'منتج استثمار رأسمالي محمي يحافظ على الاستقرار مع تحقيق عوائد مدعومة بالأصول الرقمية.',
    min: 'BHD 1,000',
    risk: 'منخفض — متوسط',
    badge: 'الأكثر شعبية',
  },
  {
    tag: 'TOKEN',
    name: 'رمز مدعوم بالذهب',
    desc: 'رمز رقمي مدعوم بالذهب الفعلي يجمع بين مزايا تقنية البلوكتشين والاستقرار الكلاسيكي لمخازن القيمة.',
    min: 'BHD 250',
    risk: 'منخفض',
    badge: null,
  },
  {
    tag: 'YIELD',
    name: 'العائد السيادي',
    desc: 'فرص تمويل الديون ذات العائد المرتفع المرتبطة بالسندات السيادية وصكوك الخليج المعتمدة.',
    min: 'BHD 2,000',
    risk: 'منخفض — متوسط',
    badge: null,
  },
]

export default function ProductsSection() {
  return (
    <section id="investment" style={{
      padding: '100px 24px',
      background: 'linear-gradient(180deg, transparent, rgba(44,44,44,0.15), transparent)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 60 }}>
          <div className="section-label">المنتجات المؤسسية</div>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 800,
            fontFamily: 'Cairo',
          }}>
            منتجات{' '}
            <span className="gold-text">مؤسسية المستوى</span>
          </h2>
          <p style={{
            marginTop: 12,
            fontSize: 15,
            color: 'rgba(255,255,255,0.55)',
            maxWidth: 500,
            lineHeight: 1.8,
            fontFamily: 'Cairo',
          }}>
            فرص استثمار عالية الجودة مع نمذجة مخاطر دقيقة وإفصاح كامل ووصول مباشر للمؤسسين.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20,
        }} className="products-grid">
          {products.map((p, i) => (
            <div key={i} className="glass-card" style={{
              padding: '28px 22px',
              position: 'relative',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              overflow: 'hidden',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.35)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.15)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
              }}
            >
              {p.badge && (
                <div style={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  background: 'linear-gradient(135deg, #D4AF37, #A8871C)',
                  color: '#0B0B0B',
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 100,
                  letterSpacing: 1,
                  fontFamily: 'Cairo',
                }}>{p.badge}</div>
              )}

              <div style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#D4AF37',
                letterSpacing: '2px',
                fontFamily: 'Montserrat',
                marginBottom: 12,
                marginTop: p.badge ? 20 : 0,
              }}>{p.tag}</div>

              <h3 style={{
                fontSize: 15,
                fontWeight: 700,
                fontFamily: 'Cairo',
                color: '#fff',
                marginBottom: 10,
                lineHeight: 1.5,
              }}>{p.name}</h3>

              <p style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.8,
                fontFamily: 'Cairo',
                marginBottom: 20,
              }}>{p.desc}</p>

              <div style={{
                borderTop: '1px solid rgba(212,175,55,0.1)',
                paddingTop: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo', marginBottom: 2 }}>الحد الأدنى</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat' }}>{p.min}</div>
                </div>
                <ArrowLeft size={18} color="rgba(212,175,55,0.5)" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .products-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .products-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </section>
  )
}
