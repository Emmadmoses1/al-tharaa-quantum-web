import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Activity, Database, LineChart, ShieldCheck, Zap, BookOpenCheck } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { AiStatus, RISK_AR, minutesAgo } from '../../lib/ai'
import PublicShell, { Block, Notice, Bullets } from '../../components/layout/PublicShell'

const STEPS = [
  { icon: Database, t: 'بيانات السوق', d: 'شموع وأسعار حية من Binance لـ BTC و ETH على أطر زمنية مختلفة.' },
  { icon: LineChart, t: 'المؤشرات', d: 'المتوسطات EMA 20 و 50، ومؤشر RSI، والتذبذب ATR.' },
  { icon: Zap, t: 'الإشارة', d: 'شراء أو احتفاظ أو انتظار أو تجنّب، مع منطقة دخول ووقف خسارة وأهداف.' },
  { icon: ShieldCheck, t: 'الإدارة', d: 'كل صفقة بوقف خسارة وهدف، تراقبهما المنصة كل 30 ثانية وتغلقان الصفقة تلقائياً.' },
  { icon: BookOpenCheck, t: 'السجل', d: 'كل قرار يُسجَّل مع المؤشرات والنسخة، وكل صفقة تُقيَّد في سجل التداول.' },
]

export default function AiTradingPage() {
  const { user } = useAuth()
  const q = useQuery({ queryKey: ['ai-status-public'], queryFn: () => api.get<AiStatus>('/api/ai-status'), refetchInterval: 60000 })
  const e = q.data?.engine

  return (
    <PublicShell title="التداول بالذكاء الاصطناعي" subtitle="إشارات مبنية على مؤشرات فنية حقيقية، وصفقات بوقف خسارة وهدف، وسجل كامل لكل قرار.">
      <Notice>الأداء السابق لا يضمن النتائج المستقبلية. نسبة الثقة تقدير مبني على المؤشرات وليست احتمال ربح، وقد تخسر جزءاً من رأس مالك أو كله.</Notice>

      <Block title="كيف يعمل">
        <div className="ai-steps">
          {STEPS.map((s, i) => (
            <div key={i} style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 12, padding: 14 }}>
              <s.icon size={20} color="#D4AF37" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{i + 1}. {s.t}</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.9 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </Block>

      <Block title="الحالة الحالية">
        {q.isLoading ? 'جارٍ التحميل…' : q.isError || !e ? 'تعذّر جلب الحالة الآن.' : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Activity size={16} color={e.online ? '#10b981' : '#f59e0b'} />
              <b style={{ color: e.online ? '#10b981' : '#f59e0b' }}>{e.online ? 'محرك الإشارات يعمل' : e.enabled ? 'محرك الإشارات متأخر عن موعده' : 'محرك الإشارات متوقف'}</b>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>آخر تشغيل: {minutesAgo(e.last_run_at)}</span>
            </div>
            <div style={{ marginBottom: 6 }}>إشارات نشطة الآن: <b style={{ color: '#D4AF37' }} dir="ltr">{q.data!.active_signals}</b></div>
            {q.data!.strategies.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.45)' }}>لا توجد استراتيجيات مفعّلة حالياً.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {q.data!.strategies.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                    <b style={{ color: '#fff' }}>{s.name}</b>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>مخاطر {RISK_AR[s.risk_level] || s.risk_level} · {s.timeframe} · {s.supported_assets.join('/')}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Block>

      <Block title="ما هو متاح اليوم">
        <Bullets items={[
          'وضع الإشارات: تختار الإشارة والمبلغ وتفتح الصفقة بنفسك من رصيد التداول (USDT).',
          'المراقبة التلقائية لوقف الخسارة والهدف بعد فتح الصفقة.',
          'إيقاف طارئ يمنع فتح صفقات جديدة.',
          'التنفيذ التلقائي الكامل بواسطة الذكاء الاصطناعي غير مفعّل بعد.',
        ]} />
      </Block>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
        <Link to={user ? '/dashboard/signals' : '/register'} className="btn-gold" style={{ textDecoration: 'none', padding: '13px 24px', fontSize: 14 }}>{user ? 'عرض الإشارات' : 'ابدأ الآن'}</Link>
        <Link to="/risk" className="btn-outline-gold" style={{ textDecoration: 'none', padding: '13px 24px', fontSize: 14 }}>إفصاح المخاطر</Link>
      </div>
      <style>{`.ai-steps{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}@media(max-width:900px){.ai-steps{grid-template-columns:1fr 1fr}}@media(max-width:520px){.ai-steps{grid-template-columns:1fr}}`}</style>
    </PublicShell>
  )
}
