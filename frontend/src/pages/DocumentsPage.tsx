import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, ExternalLink } from 'lucide-react'
import { useLegal, DOC_TYPES } from '../lib/useLegal'
import { Skeleton } from '../components/ui/Skeleton'

// Public page: licences, registrations and certificates exactly as the admin uploaded them. Nothing here is hardcoded.
export default function DocumentsPage() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar')
  const { data, isLoading, isError } = useLegal()
  const rtl = lang === 'ar'
  const font = rtl ? 'Cairo' : 'Montserrat'
  const card = { background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 12, padding: '14px 16px' } as const
  const company = data?.company
  const hasCompany = !!(company && (company.name || company.address || company.tax_id))
  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0B', padding: '28px 18px 60px', direction: rtl ? 'rtl' : 'ltr' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#fff', fontFamily: font, fontWeight: 700, fontSize: 14 }}>{rtl ? 'الرئيسية' : 'Home'}</Link>
          <button type="button" onClick={() => setLang(rtl ? 'en' : 'ar')} style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, color: '#D4AF37', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, padding: '7px 12px', cursor: 'pointer' }}>{rtl ? 'English' : 'العربية'}</button>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontFamily: font, margin: '0 0 8px' }}>{rtl ? 'التراخيص والوثائق القانونية' : 'Licences & legal documents'}</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: font, lineHeight: 1.9, margin: '0 0 22px' }}>
          {rtl ? 'الوثائق الرسمية للمنصة كما رفعتها الإدارة، يمكنك فتحها والتحقق منها.' : 'The platform’s official documents as uploaded by the administration. You can open and verify them.'}
        </p>

        {data?.license_text ? (
          <div style={{ ...card, borderColor: 'rgba(212,175,55,0.4)', marginBottom: 14, color: '#D4AF37', fontFamily: font, fontWeight: 700, fontSize: 14, lineHeight: 1.9 }}>{data.license_text}</div>
        ) : null}

        {hasCompany && company ? (
          <div style={{ ...card, marginBottom: 14, display: 'grid', gap: 6, fontFamily: font, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
            {company.name ? <div><b style={{ color: '#fff' }}>{rtl ? 'الشركة: ' : 'Company: '}</b>{company.name}</div> : null}
            {company.address ? <div><b style={{ color: '#fff' }}>{rtl ? 'العنوان: ' : 'Address: '}</b>{company.address}</div> : null}
            {company.tax_id ? <div><b style={{ color: '#fff' }}>{rtl ? 'رقم التسجيل / الضريبة: ' : 'Registration / tax no.: '}</b>{company.tax_id}</div> : null}
          </div>
        ) : null}

        {isLoading ? <Skeleton /> : null}
        {isError ? <div style={{ ...card, color: '#ef4444', fontFamily: font, fontSize: 13 }}>{rtl ? 'تعذّر تحميل الوثائق. حاول مرة أخرى.' : 'Could not load documents. Please try again.'}</div> : null}
        {data && data.documents.length === 0 ? (
          <div style={{ ...card, color: 'rgba(255,255,255,0.5)', fontFamily: font, fontSize: 13 }}>{rtl ? 'لم تُنشر وثائق بعد.' : 'No documents have been published yet.'}</div>
        ) : null}

        <div style={{ display: 'grid', gap: 12 }}>
          {(data?.documents || []).map(d => {
            const expired = d.expires_at ? new Date(d.expires_at + 'T23:59:59') < new Date() : false
            return (
              <div key={d.id} style={{ ...card, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <FileText size={22} color="#D4AF37" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0, fontFamily: font }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{rtl ? d.title_ar : (d.title || d.title_ar)}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4, lineHeight: 1.8 }}>
                    {rtl ? DOC_TYPES[d.doc_type].ar : DOC_TYPES[d.doc_type].en}
                    {d.issuer ? ` · ${rtl ? 'الجهة المصدرة' : 'Issuer'}: ${d.issuer}` : ''}
                    {d.number ? ` · ${rtl ? 'الرقم' : 'No.'}: ${d.number}` : ''}
                    {d.issued_at ? ` · ${rtl ? 'الإصدار' : 'Issued'}: ${d.issued_at}` : ''}
                    {d.expires_at ? ` · ${rtl ? 'الانتهاء' : 'Expires'}: ${d.expires_at}` : ''}
                  </div>
                  {expired ? <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{rtl ? 'انتهت صلاحية هذه الوثيقة' : 'This document has expired'}</div> : null}
                </div>
                <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ color: '#D4AF37', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', whiteSpace: 'nowrap', fontFamily: font }}>
                  {rtl ? 'عرض' : 'View'} <ExternalLink size={14} />
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
