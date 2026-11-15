import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Skeleton } from '../components/ui/Skeleton'

type Item = { id: string; name: string; name_ar: string | null; category: string; currency: string; raised: number; target: number; duration_days: number | null; actual_return_percent: number | null; cover_image_url: string | null; investors: number }
type Data = { count: number; items: Item[] }

// Public list of completed opportunities. Returns appear only where the admin recorded the real outcome.
export default function TrackRecordPage() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar')
  const rtl = lang === 'ar'
  const font = rtl ? 'Cairo' : 'Montserrat'
  const q = useQuery({ queryKey: ['public-track'], staleTime: 60000, queryFn: () => api.get<Data>('/api/public/track-record') })
  const card = { background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 12, padding: '14px 16px' } as const
  const items = q.data?.items || []
  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0B', padding: '28px 18px 60px', direction: rtl ? 'rtl' : 'ltr' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#fff', fontFamily: font, fontWeight: 700, fontSize: 14 }}>{rtl ? 'الرئيسية' : 'Home'}</Link>
          <button type="button" onClick={() => setLang(rtl ? 'en' : 'ar')} style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, color: '#D4AF37', fontFamily: 'Montserrat', fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}>{rtl ? 'English' : 'العربية'}</button>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontFamily: font, margin: '0 0 6px' }}>{rtl ? 'سجل المشاريع المكتملة' : 'Completed projects'}</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: font, fontSize: 13, lineHeight: 1.8, margin: '0 0 18px' }}>
          {rtl ? 'المشاريع التي انتهت فعلاً. تظهر النسبة المحققة فقط عندما تُسجَّل النتيجة الفعلية، والنتائج السابقة لا تضمن نتائج مستقبلية.' : 'Projects that have actually finished. The achieved return is shown only when the real outcome has been recorded. Past results do not guarantee future results.'}
        </p>
        {q.isLoading ? <Skeleton /> : null}
        {q.isError ? <div style={{ ...card, color: '#ef4444', fontFamily: font, fontSize: 13 }}>{rtl ? 'تعذّر تحميل السجل الآن.' : 'Could not load the record right now.'}</div> : null}
        {q.data && items.length === 0 ? <div style={{ ...card, color: 'rgba(255,255,255,0.5)', fontFamily: font, fontSize: 13 }}>{rtl ? 'لا توجد مشاريع مكتملة بعد. سنعرضها هنا فور اكتمالها.' : 'No completed projects yet. They will appear here as they finish.'}</div> : null}
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map(o => (
            <div key={o.id} style={{ ...card, display: 'flex', gap: 14, alignItems: 'center' }}>
              {o.cover_image_url ? <img src={o.cover_image_url} alt="" loading="lazy" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} /> : null}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontFamily: font, fontWeight: 700, fontSize: 15 }}>{(rtl ? o.name_ar : null) || o.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontFamily: font, fontSize: 12, marginTop: 4, lineHeight: 1.8 }}>
                  {o.investors} {rtl ? 'مستثمر' : 'investors'} · {o.currency} {o.raised.toLocaleString()} {rtl ? 'تم جمعها' : 'raised'}
                  {o.duration_days ? ` · ${o.duration_days} ${rtl ? 'يوم' : 'days'}` : ''}
                </div>
              </div>
              {o.actual_return_percent != null ? (
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ color: '#10b981', fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18 }}>{o.actual_return_percent}%</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: font, fontSize: 10 }}>{rtl ? 'العائد المحقق' : 'achieved'}</div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
