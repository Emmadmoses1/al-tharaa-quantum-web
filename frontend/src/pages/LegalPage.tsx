import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSite } from '../lib/useSite'

type Kind = 'terms' | 'privacy' | 'risk'
type Doc = { title: string; items: string[] }

const UPDATED = '2026-11-11'

const DOCS: Record<Kind, { ar: Doc; en: Doc }> = {
  terms: {
    ar: { title: 'شروط الخدمة', items: [
      'القبول: باستخدامك المنصة أو إنشاء حساب فإنك توافق على هذه الشروط. إن لم توافق فلا تستخدم المنصة.',
      'الأهلية: يجب أن يكون عمرك 18 عاماً فأكثر وأن تكون مؤهلاً قانونياً لاستخدام خدمات مماثلة في بلدك.',
      'حساب واحد: يُسمح بحساب واحد لكل شخص ولكل جهاز. قد يُوقَف أي حساب إضافي يُكتشف دون إشعار مسبق.',
      'صحة البيانات والتحقق: تلتزم بتقديم بيانات صحيحة. قد نطلب تأكيد بريدك الإلكتروني وصورة حية لوجهك، وقد نقيّد السحب إلى حين اكتمال التحقق.',
      'الإيداع والسحب: تتم المعاملات بالأصول الرقمية المدعومة وعلى الشبكات المعروضة. أنت مسؤول عن صحة عنوان السحب، فتحويلات البلوكتشين لا يمكن استردادها. قد تُطبَّق رسوم تُعرض لك قبل التأكيد.',
      'الإشارات والتداول: الإشارات مولّدة بقواعد تحليل فني آلية، وهي معلومات إرشادية وليست نصيحة مالية.',
      'المخاطر: راجع صفحة إفصاح المخاطر. أنت وحدك المسؤول عن قراراتك.',
      'السلوك المحظور: الاحتيال، التلاعب، استغلال الثغرات، إنشاء حسابات متعددة، غسل الأموال، أو أي نشاط مخالف للقانون.',
      'تعليق الحساب: يحق لنا تعليق أو تقييد الحساب عند الاشتباه بمخالفة الشروط أو لحماية المنصة والمستخدمين، ويمكنك التواصل مع الدعم لمراجعة القرار.',
      'توفّر الخدمة: نسعى لإبقاء المنصة متاحة لكننا لا نضمن عملها دون انقطاع، وقد تتأثر بمزوّدي الأسعار والدفع.',
      'تحديث الشروط: قد نحدّث هذه الشروط وسيظهر تاريخ آخر تحديث أعلاه. استمرارك في الاستخدام يعني قبول التعديلات.',
    ] },
    en: { title: 'Terms of Service', items: [
      'Acceptance: by using the platform or creating an account you agree to these terms. If you do not agree, do not use the platform.',
      'Eligibility: you must be at least 18 and legally allowed to use similar services in your country.',
      'One account: one account per person and per device is allowed. Any additional account we detect may be suspended without notice.',
      'Accurate information and verification: you must provide true information. We may ask you to confirm your email and a live photo of your face, and we may restrict withdrawals until verification is complete.',
      'Deposits and withdrawals: transactions use the supported digital assets on the networks shown. You are responsible for the correctness of your withdrawal address, because blockchain transfers cannot be reversed. Fees may apply and are shown before you confirm.',
      'Signals and trading: signals are produced by automated technical-analysis rules. They are informational and not financial advice.',
      'Risk: see the Risk Disclosure page. You alone are responsible for your decisions.',
      'Prohibited conduct: fraud, manipulation, exploiting bugs, creating multiple accounts, money laundering, or any unlawful activity.',
      'Suspension: we may suspend or restrict an account if we suspect a breach of these terms or to protect the platform and its users. You can contact support to have the decision reviewed.',
      'Availability: we aim to keep the platform available but do not guarantee uninterrupted service. It may be affected by price and payment providers.',
      'Changes: we may update these terms and the date of the last update is shown above. Continued use means you accept the changes.',
    ] },
  },
  privacy: {
    ar: { title: 'سياسة الخصوصية', items: [
      'ما نجمعه: الاسم والبريد الإلكتروني وكلمة المرور (مشفّرة)، صورتك الشخصية، صورة التحقق من الوجه، عنوان IP والدولة، معرّف الجهاز، وسجل نشاط حسابك (دخول، إيداعات، سحوبات، صفقات).',
      'لماذا نجمعه: لتشغيل حسابك، وحماية الأموال، ومنع الاحتيال والحسابات المتعددة، والالتزام بالقوانين، وإرسال رسائل الخدمة والإشعارات.',
      'صورة التحقق: تُحفظ في مخزن خاص، ولا يطّلع عليها إلا فريق المراجعة المخوَّل لغرض التحقق من الهوية ومنع الاحتيال. لا تُستخدم لأي غرض تسويقي، وتُحذف من المخزن بعد 30 يوماً من اعتمادها (و7 أيام من رفضها).',
      'المشاركة: لا نبيع بياناتك. نستعين بمزوّدي خدمة لاستضافة البيانات وإرسال البريد ومعالجة المدفوعات، ويعالجونها لحسابنا فقط. وقد نفصح عن بيانات عند وجود إلزام قانوني.',
      'التخزين على جهازك: نحفظ معرّف الجهاز وجلسة الدخول وتفضيلات بسيطة على جهازك لتشغيل الموقع وحمايته.',
      'الاحتفاظ: نحتفظ بالبيانات ما دام حسابك قائماً، ولمدة يتطلبها القانون أو تقتضيها سجلات المعاملات والأمان.',
      'حقوقك: يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها وفق ما يتيحه قانون حماية البيانات المعمول به، بالتواصل مع الدعم.',
      'الأمان: نستخدم اتصالاً مشفّراً وضوابط وصول، لكن لا يوجد نظام آمن بنسبة 100%.',
    ] },
    en: { title: 'Privacy Policy', items: [
      'What we collect: name, email, password (stored hashed), your profile photo, your face-verification photo, IP address and country, a device identifier, and your account activity (logins, deposits, withdrawals, trades).',
      'Why: to run your account, protect funds, prevent fraud and duplicate accounts, comply with the law, and send service messages and notifications.',
      'Face-verification photo: kept in private storage and seen only by authorised review staff, to confirm identity and prevent fraud. It is never used for marketing, and it is deleted from storage 30 days after approval (7 days after rejection).',
      'Sharing: we do not sell your data. We use service providers for hosting, email and payments, who process it only on our behalf. We may disclose data when legally required.',
      'Storage on your device: we keep a device identifier, your login session and simple preferences on your device to run and protect the site.',
      'Retention: we keep data while your account exists, and for as long as the law or transaction and security records require.',
      'Your rights: you can ask to access, correct or delete your data, as the applicable data-protection law allows, by contacting support.',
      'Security: we use encrypted connections and access controls, but no system is 100% secure.',
    ] },
  },
  risk: {
    ar: { title: 'إفصاح المخاطر', items: [
      'الأصول الرقمية شديدة التقلب، وقد تخسر كامل رأس مالك.',
      'إشارات المنصة مبنية على مؤشرات فنية (EMA وRSI وATR)، وهي تقديرات إرشادية. نسبة الثقة ليست احتمال ربح.',
      'الأداء السابق لا يضمن النتائج المستقبلية.',
      'التداول الثنائي (صعود/هبوط) عالي المخاطر، وقد تخسر المبلغ المستثمر كاملاً خلال مدة قصيرة.',
      'فرص الاستثمار قد لا تحقق عوائد، والعوائد غير مضمونة.',
      'قد تتأخر الأسعار أو تتعطل مصادرها، مما قد يؤثر على التنفيذ والتسوية.',
      'حوالات البلوكتشين لا رجعة فيها. تحقق من عنوان المحفظة والشبكة قبل كل سحب.',
      'لا تستثمر إلا ما تستطيع تحمّل خسارته. هذه المعلومات ليست نصيحة مالية أو قانونية أو ضريبية.',
    ] },
    en: { title: 'Risk Disclosure', items: [
      'Digital assets are highly volatile and you may lose all of your capital.',
      'Platform signals are based on technical indicators (EMA, RSI, ATR) and are informational estimates. The confidence figure is not a probability of profit.',
      'Past performance does not guarantee future results.',
      'Binary trading (up/down) is high risk, and you can lose the entire amount staked within a short time.',
      'Investment opportunities may not produce returns, and returns are not guaranteed.',
      'Prices may be delayed or their sources may fail, which can affect execution and settlement.',
      'Blockchain transfers are irreversible. Check the wallet address and network before every withdrawal.',
      'Only invest what you can afford to lose. This information is not financial, legal or tax advice.',
    ] },
  },
}

const NAV: { kind: Kind; ar: string; en: string; to: string }[] = [
  { kind: 'terms', ar: 'شروط الخدمة', en: 'Terms', to: '/terms' },
  { kind: 'privacy', ar: 'الخصوصية', en: 'Privacy', to: '/privacy' },
  { kind: 'risk', ar: 'إفصاح المخاطر', en: 'Risk', to: '/risk' },
]
const DOCS_LINK = { ar: 'التراخيص والوثائق', en: 'Licences & documents', to: '/documents' }

export default function LegalPage({ kind }: { kind: Kind }) {
  const [lang, setLang] = useState<'ar' | 'en'>('ar')
  const { data: site } = useSite()
  const doc = DOCS[kind][lang]
  const rtl = lang === 'ar'
  const font = rtl ? 'Cairo' : 'Montserrat'
  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0B', padding: '28px 18px 60px', direction: rtl ? 'rtl' : 'ltr' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #D4AF37, #E8CC6A)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#0B0B0B', fontFamily: 'Montserrat' }}>AQ</div>
            <span style={{ color: '#fff', fontFamily: font, fontWeight: 700, fontSize: 14 }}>{rtl ? 'الرئيسية' : 'Home'}</span>
          </Link>
          <button type="button" onClick={() => setLang(rtl ? 'en' : 'ar')} style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, color: '#D4AF37', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, padding: '7px 12px', cursor: 'pointer' }}>{rtl ? 'English' : 'العربية'}</button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
          {NAV.map(n => (
            <Link key={n.kind} to={n.to} style={{ textDecoration: 'none', fontFamily: font, fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 999, border: `1px solid ${n.kind === kind ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`, background: n.kind === kind ? 'rgba(212,175,55,0.12)' : 'transparent', color: n.kind === kind ? '#D4AF37' : 'rgba(255,255,255,0.55)' }}>{rtl ? n.ar : n.en}</Link>
          ))}
          <Link to="/help" style={{ textDecoration: 'none', fontFamily: font, fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 999, border: '1px solid rgba(212,175,55,0.2)', color: 'rgba(255,255,255,0.55)' }}>{rtl ? 'المساعدة' : 'Help'}</Link>
          <Link to={DOCS_LINK.to} style={{ textDecoration: 'none', fontFamily: font, fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 999, border: '1px solid rgba(212,175,55,0.2)', color: 'rgba(255,255,255,0.55)' }}>{rtl ? DOCS_LINK.ar : DOCS_LINK.en}</Link>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontFamily: font, margin: '0 0 6px' }}>{doc.title}</h1>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', margin: '0 0 24px' }}>{rtl ? 'آخر تحديث: ' : 'Last updated: '}{UPDATED}</p>

        <div style={{ display: 'grid', gap: 12 }}>
          {doc.items.map((t, i) => {
            const k = t.indexOf(':')
            const head = k > 0 && k < 40 ? t.slice(0, k) : ''
            const body = head ? t.slice(k + 1).trim() : t
            return (
              <div key={i} style={{ background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12 }}>
                <span style={{ color: '#D4AF37', fontFamily: 'Montserrat', fontWeight: 800, fontSize: 13, flexShrink: 0, paddingTop: 2 }}>{i + 1}</span>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.95, color: 'rgba(255,255,255,0.78)', fontFamily: font }}>
                  {head && <b style={{ color: '#fff' }}>{head}: </b>}{body}
                </p>
              </div>
            )
          })}
        </div>

        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: font, marginTop: 26, lineHeight: 1.9 }}>
          {rtl ? 'للاستفسار أو لطلب بياناتك تواصل معنا' : 'Questions, or a request about your data? Contact us'}
          {site?.support_email ? <>: <a href={`mailto:${site.support_email}`} dir="ltr" style={{ color: '#D4AF37', textDecoration: 'none', fontFamily: 'Montserrat' }}>{site.support_email}</a></> : '.'}
        </p>
      </div>
    </div>
  )
}
