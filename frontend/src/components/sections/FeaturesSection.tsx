import { Brain, TrendingUp, Shield } from 'lucide-react'

const features = [
  {
    icon: <Brain size={28} color="#D4AF37" />,
    title: 'التعرف على الأنماط العصبية',
    desc: 'تحليل عميق بالتعلم الآلي لخوارزميات الترددات العالية، يستخرج إشارات دقيقة من ضوضاء السوق.',
  },
  {
    icon: <TrendingUp size={28} color="#D4AF37" />,
    title: 'توليد ألفا تنبؤي',
    desc: 'نماذج متعددة الأبعاد تنتج فرص ألفا مستدامة عبر فئات الأصول والتوقيت والمعنويات السوقية.',
  },
  {
    icon: <Shield size={28} color="#D4AF37" />,
    title: 'التشغيل الآلي المؤسسي',
    desc: 'بنية تحتية مؤسسية مع تنفيذ عالي التردد وإدارة مخاطر آنية واستمرارية تشغيلية على مدار الساعة.',
  },
]

export default function FeaturesSection() {
  return (
    <section id="trading" style={{
      padding: '100px 24px',
      maxWidth: 1200,
      margin: '0 auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <div className="section-label" style={{ justifyContent: 'center' }}>
          ذكاء كوانتوم المتميز
        </div>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 44px)',
          fontWeight: 800,
          fontFamily: 'Cairo',
          marginBottom: 16,
        }}>
          ذكاء تداول{' '}
          <span className="gold-text">كوانتوم المتميز</span>
        </h2>
        <p style={{
          fontSize: 15,
          color: 'rgba(255,255,255,0.55)',
          maxWidth: 540,
          margin: '0 auto',
          lineHeight: 1.8,
          fontFamily: 'Cairo',
        }}>
          نماذج تعلم عميق عالية الترددات مُهيَّأة لتخصيص رأس المال المؤسسي في الأصول الرقمية.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 24,
      }} className="features-grid">
        {features.map((f, i) => (
          <div key={i} className="glass-card" style={{
            padding: '36px 28px',
            transition: 'all 0.3s ease',
            cursor: 'default',
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.35)'
              ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 20px 60px rgba(212,175,55,0.12)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.15)'
              ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
            }}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '12px',
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}>
              {f.icon}
            </div>
            <h3 style={{
              fontSize: 17,
              fontWeight: 700,
              fontFamily: 'Cairo',
              marginBottom: 10,
              color: '#fff',
            }}>{f.title}</h3>
            <p style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.8,
              fontFamily: 'Cairo',
            }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .features-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .features-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </section>
  )
}
