import { Link } from 'react-router-dom'
import { CheckCircle2, ExternalLink } from 'lucide-react'
import { usePayouts } from '../lib/usePayouts'

const n = (v: number, d = 2) => Number(v).toLocaleString('en-US', { maximumFractionDigits: d })

function ago(iso: string) {
  const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 1) return 'الآن'
  if (m < 60) return `منذ ${m} دقيقة`
  const h = Math.floor(m / 60)
  if (h < 24) return `منذ ${h} ساعة`
  return `منذ ${Math.floor(h / 24)} يوم`
}
function duration(min: number) {
  if (min < 60) return `${min} دقيقة`
  const h = Math.round(min / 6) / 10
  return h < 24 ? `${h} ساعة` : `${Math.round(h / 24)} يوم`
}

// Real payouts only. If nothing has been paid out yet the section does not appear at all.
export default function PayoutProof({ full = false }: { full?: boolean }) {
  const q = usePayouts(full ? 30 : 6)
  const d = q.data
  if (!d || d.count < 1) return null
  const tile = (label: string, value: string) => (
    <div style={{ background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 14, padding: '18px 12px', textAlign: 'center' }}>
      <div dir="ltr" style={{ fontSize: 'clamp(18px,4.5vw,26px)', fontWeight: 800, color: '#D4AF37', fontFamily: 'Montserrat' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', marginTop: 4 }}>{label}</div>
    </div>
  )
  return (
    <section id="payouts" style={{ padding: full ? '10px 0 40px' : '80px 24px', maxWidth: 900, margin: '0 auto', direction: 'rtl' }}>
      <div style={{ textAlign: 'center', marginBottom: 26 }}>
        <h2 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 800, color: '#fff', fontFamily: 'Cairo', marginBottom: 10 }}>إثباتات السحب الحقيقية</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', lineHeight: 1.9, maxWidth: 560, margin: '0 auto' }}>
          أرقام حية من سجلات المنصة، تُحدَّث تلقائياً. كل عملية سحب يمكنك التحقق منها بنفسك على البلوكتشين.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${d.median_minutes != null ? 3 : 2},1fr)`, gap: 12, marginBottom: 20 }}>
        {tile('سحب منفّذ', n(d.count, 0))}
        {tile('إجمالي المبالغ المرسلة', `$${n(d.total_usd, 0)}`)}
        {d.median_minutes != null && tile('متوسط زمن التنفيذ', duration(d.median_minutes))}
      </div>
      {d.items.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {d.items.map(i => (
            <div key={i.txid} style={{ background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={18} color="#10b981" />
                <div>
                  <div dir="ltr" style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Montserrat', textAlign: 'right' }}>{n(i.amount, 4)} {i.asset}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>{i.name} · {i.network} · {ago(i.at)}</div>
                </div>
              </div>
              {i.url ? (
                <a href={i.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#D4AF37', fontFamily: 'Cairo', textDecoration: 'none', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8, padding: '6px 12px' }}>
                  تحقق على البلوكتشين <ExternalLink size={13} />
                </a>
              ) : (
                <span dir="ltr" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', wordBreak: 'break-all' }}>{i.txid.slice(0, 18)}…</span>
              )}
            </div>
          ))}
        </div>
      )}
      {!full && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/payouts" style={{ color: '#D4AF37', fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>عرض كل الإثباتات ←</Link>
        </div>
      )}
    </section>
  )
}
