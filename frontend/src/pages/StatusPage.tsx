import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Skeleton } from '../components/ui/Skeleton'
import { useSeo } from '../lib/useSeo'

type St = 'operational' | 'degraded' | 'down' | 'paused'
type Data = { overall: St; parts: { key: string; status: St }[]; checked_at: string }

const NAMES: Record<string, { ar: string; en: string }> = {
  database: { ar: 'قاعدة البيانات والحسابات', en: 'Database & accounts' },
  prices: { ar: 'أسعار السوق', en: 'Market prices' },
  signals: { ar: 'إشارات الذكاء الاصطناعي', en: 'AI signals' },
  settlement: { ar: 'تسوية الصفقات', en: 'Order settlement' },
}
const LABEL: Record<St, { ar: string; en: string; c: string }> = {
  operational: { ar: 'يعمل بشكل طبيعي', en: 'Operational', c: '#10b981' },
  degraded: { ar: 'بطء أو تأخير', en: 'Degraded', c: '#f59e0b' },
  down: { ar: 'متوقف مؤقتاً', en: 'Disruption', c: '#ef4444' },
  paused: { ar: 'متوقف بقرار الإدارة', en: 'Paused', c: '#9ca3af' },
}

export default function StatusPage() {
  useSeo('حالة المنصة', 'الحالة الحية لقاعدة البيانات وأسعار السوق وإشارات الذكاء الاصطناعي وتسوية الصفقات.', '/status')
  const [lang, setLang] = useState<'ar' | 'en'>('ar')
  const q = useQuery({ queryKey: ['public-status'], refetchInterval: 30000, staleTime: 15000, queryFn: () => api.get<Data>('/api/public/status') })
  const rtl = lang === 'ar'
  const font = rtl ? 'Cairo' : 'Montserrat'
  const card = { background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 12, padding: '14px 16px' } as const
  const o = q.data ? LABEL[q.data.overall] : null
  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0B', padding: '28px 18px 60px', direction: rtl ? 'rtl' : 'ltr' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#fff', fontFamily: font, fontWeight: 700, fontSize: 14 }}>{rtl ? 'الرئيسية' : 'Home'}</Link>
          <button type="button" onClick={() => setLang(rtl ? 'en' : 'ar')} style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, color: '#D4AF37', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, padding: '7px 12px', cursor: 'pointer' }}>{rtl ? 'English' : 'العربية'}</button>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontFamily: font, margin: '0 0 16px' }}>{rtl ? 'حالة المنصة' : 'Platform status'}</h1>

        {q.isLoading ? <Skeleton /> : null}
        {q.isError ? <div style={{ ...card, color: '#ef4444', fontFamily: font, fontSize: 13 }}>{rtl ? 'تعذّر قراءة الحالة الآن. قد تكون الخدمة قيد التشغيل، حاول بعد لحظات.' : 'Could not read the status right now. The service may be waking up; try again in a moment.'}</div> : null}

        {q.data && o ? (
          <>
            <div style={{ ...card, borderColor: o.c, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 12, height: 12, borderRadius: 99, background: o.c, flexShrink: 0 }} />
              <span style={{ color: '#fff', fontFamily: font, fontWeight: 700, fontSize: 16 }}>
                {q.data.overall === 'operational' ? (rtl ? 'جميع الأنظمة تعمل' : 'All systems operational') : q.data.overall === 'degraded' ? (rtl ? 'بعض الأنظمة تعاني من بطء' : 'Some systems are slower than usual') : (rtl ? 'هناك انقطاع في بعض الأنظمة' : 'Some systems are disrupted')}
              </span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {q.data.parts.map(p => {
                const l = LABEL[p.status]
                return (
                  <div key={p.key} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#fff', fontFamily: font, fontSize: 14 }}>{(NAMES[p.key] || { ar: p.key, en: p.key })[lang]}</span>
                    <span style={{ color: l.c, fontFamily: font, fontSize: 13, fontWeight: 700 }}>{rtl ? l.ar : l.en}</span>
                  </div>
                )
              })}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', fontSize: 11, marginTop: 14 }}>
              {rtl ? 'آخر فحص: ' : 'Last checked: '}{new Date(q.data.checked_at).toLocaleString('en-GB')} · {rtl ? 'تتحدث الصفحة تلقائياً' : 'auto-refreshing'}
            </p>
          </>
        ) : null}
      </div>
    </div>
  )
}
