import { Lock, Eye, Server } from 'lucide-react'

const items = [
  {
    icon: <Lock size={22} color="#D4AF37" />,
    title: 'تشفير مقاوم للكم',
    desc: 'حماية بيانات المستخدم باستخدام خوارزميات تشفير حديثة مصممة لمقاومة الحوسبة الكمومية المستقبلية.',
  },
  {
    icon: <Eye size={22} color="#D4AF37" />,
    title: 'محافظ باردة متعددة التوقيع',
    desc: 'تخزين غالبية الأصول في محافظ باردة معزولة تماماً عن الشبكة، تتطلب توقيعات متعددة لأي معاملة.',
  },
  {
    icon: <Server size={22} color="#D4AF37" />,
    title: 'رقابة CBB التنظيمية',
    desc: 'المنصة خاضعة لرقابة مصرف البحرين المركزي مع الالتزام بمعايير الإبلاغ وحماية العملاء المقررة.',
  },
]

export default function SecuritySection() {
  return (
    <section id="security" style={{
      padding: '100px 24px',
      maxWidth: 1200,
      margin: '0 auto',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 80,
        alignItems: 'center',
      }} className="security-grid">

        {/* Left visual */}
        <div style={{
          position: 'relative',
          height: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Animated rings */}
          {[280, 220, 160, 100].map((size, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: '50%',
              border: `1px solid rgba(212,175,55,${0.05 + i * 0.05})`,
              animation: `ringRotate ${6 + i * 3}s linear infinite ${i % 2 === 0 ? '' : 'reverse'}`,
            }} />
          ))}
          {/* Center icon */}
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4AF37, #A8871C)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(212,175,55,0.4)',
            zIndex: 2,
          }}>
            <Lock size={32} color="#0B0B0B" strokeWidth={2.5} />
          </div>
        </div>

        {/* Right content */}
        <div>
          <div className="section-label">الأمان الكوانتومي</div>
          <h2 style={{
            fontSize: 'clamp(26px, 3.5vw, 40px)',
            fontWeight: 800,
            fontFamily: 'Cairo',
            marginBottom: 16,
            lineHeight: 1.3,
          }}>
            آمن ومرخّص في{' '}
            <span className="gold-text">مملكة البحرين</span>
          </h2>
          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.9,
            fontFamily: 'Cairo',
            marginBottom: 36,
          }}>
            بنية تحتية أمنية مؤسسية وأنظمة ذكاء اصطناعي متطورة، تحت إشراف تنظيمي من مصرف البحرين المركزي.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {items.map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '10px',
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid rgba(212,175,55,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: 'Cairo',
                    color: '#fff',
                    marginBottom: 4,
                  }}>{item.title}</div>
                  <div style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.45)',
                    lineHeight: 1.8,
                    fontFamily: 'Cairo',
                  }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .security-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .security-grid > div:first-child { height: 260px !important; }
        }
      `}</style>
    </section>
  )
}
