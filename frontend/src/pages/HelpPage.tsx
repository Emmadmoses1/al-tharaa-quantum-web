import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Mail } from 'lucide-react'
import { useSite } from '../lib/useSite'

type QA = { q: string; a: string }
const FAQ: Record<'ar' | 'en', QA[]> = {
  ar: [
    { q: 'كيف أنشئ حساباً؟', a: 'أدخل اسمك وبريدك الإلكتروني، ثم أدخل الرمز الذي يصلك على البريد، وأضف صورتك الشخصية، ثم أكمل التحقق من الوجه بصورة سيلفي حية.' },
    { q: 'لماذا يُطلب التحقق من الوجه؟', a: 'لحماية الحسابات ومنع الحسابات المزورة. تُراجع الصورة من فريق الإدارة، ويلزم اعتمادها قبل طلب أي سحب.' },
    { q: 'نسيت كلمة المرور، ماذا أفعل؟', a: 'من صفحة تسجيل الدخول اختر "نسيت كلمة المرور"، أدخل بريدك، ثم أدخل الرمز المرسل إليك واختر كلمة مرور جديدة.' },
    { q: 'كيف أودع؟', a: 'من صفحة الإيداع في حسابك، اختر طريقة الدفع المتاحة وأتبع التعليمات. يظهر الرصيد بعد تأكيد الدفع.' },
    { q: 'كيف أسحب أرباحي؟', a: 'من صفحة السحب بعد اعتماد التحقق من الوجه. تُراجع الطلبات من الإدارة، وتصلك رسالة عند المعالجة.' },
    { q: 'ما هو بونص الترحيب؟', a: 'إن كان مفعّلاً يُضاف مرة واحدة لكل حساب، ويصبح قابلاً للسحب بعد استيفاء شرط حجم التداول الموضح في حسابك.' },
    { q: 'هل الإشارات نصيحة مالية؟', a: 'لا. الإشارات معلومات مولّدة بقواعد تحليل فني آلية، والتداول ينطوي على مخاطر. اقرأ صفحة إفصاح المخاطر قبل البدء.' },
    { q: 'أين أجد تراخيص المنصة؟', a: 'في صفحة التراخيص والوثائق، حيث تُعرض الوثائق الرسمية كما رفعتها الإدارة.' },
  ],
  en: [
    { q: 'How do I create an account?', a: 'Enter your name and email, type the code sent to your email, add a profile photo, then complete face verification with a live selfie.' },
    { q: 'Why is face verification required?', a: 'To protect accounts and prevent fake ones. Our team reviews the selfie, and it must be approved before you can request a withdrawal.' },
    { q: 'I forgot my password. What now?', a: 'On the login page choose "Forgot password", enter your email, then enter the code we send you and pick a new password.' },
    { q: 'How do I deposit?', a: 'Open the Deposit page in your account, choose an available payment method and follow the instructions. Your balance updates once the payment is confirmed.' },
    { q: 'How do I withdraw?', a: 'Use the Withdraw page once your face verification is approved. Requests are reviewed by our team and you are notified when processed.' },
    { q: 'What is the welcome bonus?', a: 'When enabled, it is credited once per account and becomes withdrawable after the trading-volume requirement shown in your account is met.' },
    { q: 'Are signals financial advice?', a: 'No. Signals are information produced by automated technical-analysis rules, and trading involves risk. Please read the Risk Disclosure before you start.' },
    { q: 'Where can I see the platform’s licences?', a: 'On the Licences & documents page, which shows the official documents exactly as uploaded by the administration.' },
  ],
}

export default function HelpPage() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar')
  const [open, setOpen] = useState<number | null>(0)
  const { data: site } = useSite()
  const rtl = lang === 'ar'
  const font = rtl ? 'Cairo' : 'Montserrat'
  const email = site?.support_email || ''
  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0B', padding: '28px 18px 60px', direction: rtl ? 'rtl' : 'ltr' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#fff', fontFamily: font, fontWeight: 700, fontSize: 14 }}>{rtl ? 'الرئيسية' : 'Home'}</Link>
          <button type="button" onClick={() => setLang(rtl ? 'en' : 'ar')} style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, color: '#D4AF37', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, padding: '7px 12px', cursor: 'pointer' }}>{rtl ? 'English' : 'العربية'}</button>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontFamily: font, margin: '0 0 18px' }}>{rtl ? 'المساعدة والأسئلة الشائعة' : 'Help & FAQ'}</h1>

        <div style={{ display: 'grid', gap: 10 }}>
          {FAQ[lang].map((it, i) => {
            const isOpen = open === i
            return (
              <div key={i} style={{ background: 'rgba(20,20,20,0.85)', border: `1px solid ${isOpen ? 'rgba(212,175,55,0.4)' : 'rgba(212,175,55,0.12)'}`, borderRadius: 12 }}>
                <button type="button" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 16px', color: '#fff', fontFamily: font, fontSize: 14, fontWeight: 700, textAlign: rtl ? 'right' : 'left', minHeight: 48 }}>
                  <span>{it.q}</span>
                  <ChevronDown size={18} color="#D4AF37" style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </button>
                {isOpen ? <p style={{ margin: 0, padding: '0 16px 16px', fontSize: 14, lineHeight: 1.95, color: 'rgba(255,255,255,0.72)', fontFamily: font }}>{it.a}</p> : null}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 22, background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 12, padding: '16px', fontFamily: font }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{rtl ? 'لم تجد إجابتك؟' : 'Didn’t find your answer?'}</div>
          {email ? (
            <a href={`mailto:${email}`} style={{ color: '#D4AF37', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontFamily: 'Montserrat' }}><Mail size={16} />{email}</a>
          ) : (
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{rtl ? 'تواصل معنا عبر حسابك بعد تسجيل الدخول.' : 'Contact us from your account after signing in.'}</span>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13 }}>
            <Link to="/documents" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>{rtl ? 'التراخيص والوثائق' : 'Licences & documents'}</Link>
            <Link to="/risk" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>{rtl ? 'إفصاح المخاطر' : 'Risk disclosure'}</Link>
            <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>{rtl ? 'الخصوصية' : 'Privacy'}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
