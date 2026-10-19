import { Twitter, Linkedin, Instagram } from 'lucide-react'

const cols = [
  {
    title: 'المنتجات',
    links: ['التداول بالذكاء الاصطناعي', 'فرص الاستثمار', 'قبو كوانتوم', 'الأسواق'],
  },
  {
    title: 'الشركة',
    links: ['عن المنصة', 'الفريق', 'الشركاء', 'المدونة'],
  },
  {
    title: 'القانون والتنظيم',
    links: ['الامتثال', 'سياسة الخصوصية', 'شروط الخدمة', 'إفصاح المخاطر'],
  },
]

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(212,175,55,0.1)',
      padding: '60px 24px 30px',
      maxWidth: 1200,
      margin: '0 auto',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
        gap: 40,
        marginBottom: 50,
      }} className="footer-grid">

        {/* Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 34,
              height: 34,
              background: 'linear-gradient(135deg, #D4AF37, #E8CC6A)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 14,
              color: '#0B0B0B',
              fontFamily: 'Montserrat',
            }}>AQ</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat', letterSpacing: 2 }}>AL THARAA</div>
              <div style={{ fontSize: 9, color: 'rgba(212,175,55,0.5)', fontFamily: 'Montserrat', letterSpacing: 3 }}>QUANTUM</div>
            </div>
          </div>
          <p style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.4)',
            lineHeight: 1.9,
            fontFamily: 'Cairo',
            marginBottom: 20,
          }}>
            منصة التمويل الرقمي المتميزة بالذكاء الاصطناعي — مرخصة ومنظمة في مملكة البحرين.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            {[Twitter, Linkedin, Instagram].map((Icon, i) => (
              <div key={i} style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(44,44,44,0.6)',
                border: '1px solid rgba(212,175,55,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.4)'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.08)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.15)'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(44,44,44,0.6)'
                }}
              >
                <Icon size={16} color="rgba(212,175,55,0.7)" />
              </div>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {cols.map((col, i) => (
          <div key={i}>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#D4AF37',
              fontFamily: 'Cairo',
              marginBottom: 16,
            }}>{col.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {col.links.map((link, j) => (
                <a key={j} href="#" style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.4)',
                  textDecoration: 'none',
                  fontFamily: 'Cairo',
                  transition: 'color 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#D4AF37')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                >{link}</a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: '1px solid rgba(212,175,55,0.08)',
        paddingTop: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cairo' }}>
          © 2025 الثراء كوانتوم. جميع الحقوق محفوظة. مرخص من مصرف البحرين المركزي.
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'Cairo' }}>
          الاستثمار ينطوي على مخاطر. النتائج السابقة لا تضمن الأداء المستقبلي.
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  )
}
