import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useUpdateProfile, useCurrencies } from '../../hooks/useData'
import { Globe, Bell, Palette, Shield, CheckCircle } from 'lucide-react'

const LANGUAGES = [
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
]

const CURRENCIES_FALLBACK = [
  { code: 'BHD', name: 'دينار بحريني' },
  { code: 'USD', name: 'دولار أمريكي' },
  { code: 'EUR', name: 'يورو' },
  { code: 'SAR', name: 'ريال سعودي' },
  { code: 'AED', name: 'درهم إماراتي' },
  { code: 'KWD', name: 'دينار كويتي' },
  { code: 'OMR', name: 'ريال عماني' },
  { code: 'QAR', name: 'ريال قطري' },
  { code: 'GBP', name: 'جنيه إسترليني' },
  { code: 'NGN', name: 'نيرة نيجيرية' },
]

export default function SettingsPage() {
  const { profile } = useAuth()
  const { data: currencies } = useCurrencies()
  const updateProfile = useUpdateProfile()

  const [language, setLanguage] = useState(profile?.preferred_language || 'ar')
  const [currency, setCurrency] = useState(profile?.preferred_currency || 'BHD')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState('general')

  // Notification preferences (stored locally — connect to DB later)
  const [notifs, setNotifs] = useState({
    deposit_confirmed: true,
    withdrawal_processed: true,
    investment_update: true,
    ai_trade_opened: false,
    ai_trade_closed: true,
    risk_alert: true,
    security_alert: true,
    marketing: false,
  })

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile.mutateAsync({
        preferred_language: language,
        preferred_currency: currency,
      } as Parameters<typeof updateProfile.mutateAsync>[0])
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    { key: 'general', label: 'عام', icon: <Globe size={15} /> },
    { key: 'notifications', label: 'الإشعارات', icon: <Bell size={15} /> },
    { key: 'appearance', label: 'المظهر', icon: <Palette size={15} /> },
    { key: 'privacy', label: 'الخصوصية', icon: <Shield size={15} /> },
  ]

  const notifLabels: Record<string, { label: string; desc: string }> = {
    deposit_confirmed: { label: 'تأكيد الإيداع', desc: 'عند تأكيد إيداعك على البلوكتشين' },
    withdrawal_processed: { label: 'معالجة السحب', desc: 'عند اكتمال طلب السحب' },
    investment_update: { label: 'تحديثات الاستثمار', desc: 'أخبار وتحديثات فرصك الاستثمارية' },
    ai_trade_opened: { label: 'فتح صفقة ذكاء اصطناعي', desc: 'عند فتح صفقة جديدة بالذكاء الاصطناعي' },
    ai_trade_closed: { label: 'إغلاق صفقة ذكاء اصطناعي', desc: 'عند إغلاق صفقة مع النتيجة' },
    risk_alert: { label: 'تنبيهات المخاطر', desc: 'عند الوصول لحدود المخاطر المحددة' },
    security_alert: { label: 'تنبيهات الأمان', desc: 'تسجيل دخول من جهاز أو موقع جديد' },
    marketing: { label: 'عروض ومستجدات', desc: 'فرص استثمارية جديدة ونشرات إخبارية' },
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(11,11,11,0.5)',
    border: '1px solid rgba(212,175,55,0.15)', borderRadius: 8,
    padding: '11px 14px', color: '#fff', fontSize: 14,
    fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box',
    appearance: 'none' as const, cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23D4AF37' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'left 12px center',
    paddingLeft: 36,
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: 'rgba(255,255,255,0.65)', fontFamily: 'Cairo', marginBottom: 8,
  }

  return (
    <div style={{ direction: 'rtl', maxWidth: 700 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}>
          الإعدادات
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo' }}>
          تخصيص تجربتك في الثراء كوانتوم
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 20 }} className="settings-layout">
        {/* Sidebar */}
        <div style={{
          background: 'rgba(20,20,20,0.7)',
          border: '1px solid rgba(212,175,55,0.08)',
          borderRadius: 12, padding: '10px 0',
          height: 'fit-content',
        }}>
          {sections.map(s => (
            <button key={s.key} onClick={() => setActiveSection(s.key)} style={{
              width: '100%', background: activeSection === s.key
                ? 'rgba(212,175,55,0.08)' : 'transparent',
              border: 'none',
              borderRight: `2px solid ${activeSection === s.key ? '#D4AF37' : 'transparent'}`,
              padding: '11px 16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 9,
              color: activeSection === s.key ? '#D4AF37' : 'rgba(255,255,255,0.5)',
              fontSize: 13, fontFamily: 'Cairo',
              fontWeight: activeSection === s.key ? 600 : 400,
              transition: 'all 0.15s', textAlign: 'right',
            }}>
              {s.icon}{s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="glass-card" style={{ padding: 28 }}>

          {/* General */}
          {activeSection === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', marginBottom: 4 }}>
                الإعدادات العامة
              </h2>

              <div>
                <label style={labelStyle}>اللغة المفضّلة</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => setLanguage(l.code)} style={{
                      flex: 1, padding: '12px',
                      background: language === l.code ? 'rgba(212,175,55,0.1)' : 'rgba(44,44,44,0.3)',
                      border: `1px solid ${language === l.code ? '#D4AF37' : 'rgba(212,175,55,0.1)'}`,
                      borderRadius: 8, cursor: 'pointer',
                      color: language === l.code ? '#D4AF37' : 'rgba(255,255,255,0.6)',
                      fontSize: 14, fontFamily: l.code === 'ar' ? 'Cairo' : 'Montserrat',
                      fontWeight: language === l.code ? 700 : 400, transition: 'all 0.2s',
                    }}>{l.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>عملة العرض</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle}>
                  {(currencies as { code: string; name: string }[] || CURRENCIES_FALLBACK).map(c => (
                    <option key={c.code} value={c.code} style={{ background: '#141414', color: '#fff' }}>
                      {c.code} — {(c as { code: string; name_ar?: string; name: string }).name_ar || c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>المنطقة الزمنية</label>
                <select style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} disabled>
                  <option>Asia/Bahrain (GMT+3)</option>
                </select>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cairo', marginTop: 6 }}>
                  يتم تحديدها تلقائياً بناءً على موقعك
                </div>
              </div>

              {updateProfile.isError && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8, fontSize: 13,
                  color: '#ef4444', fontFamily: 'Cairo',
                }}>
                  فشل حفظ الإعدادات. يرجى المحاولة مرة أخرى.
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-gold"
                style={{
                  fontSize: 14, padding: '13px',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saved
                  ? <><CheckCircle size={16} /> تم الحفظ</>
                  : saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'
                }
              </button>
            </div>
          )}

          {/* Notifications */}
          {activeSection === 'notifications' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', marginBottom: 20 }}>
                إعدادات الإشعارات
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {Object.entries(notifs).map(([key, value], i, arr) => {
                  const info = notifLabels[key] || { label: key, desc: '' }
                  return (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid rgba(212,175,55,0.06)' : 'none',
                      gap: 16,
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: 'Cairo' }}>
                          {info.label}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo', marginTop: 2 }}>
                          {info.desc}
                        </div>
                      </div>
                      <button
                        onClick={() => setNotifs(n => ({ ...n, [key]: !n[key as keyof typeof n] }))}
                        style={{
                          width: 42, height: 23, borderRadius: 12, flexShrink: 0,
                          background: value ? '#D4AF37' : 'rgba(44,44,44,0.8)',
                          border: `1px solid ${value ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`,
                          cursor: 'pointer', position: 'relative', transition: 'all 0.3s', padding: 0,
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: 2,
                          right: value ? 2 : undefined,
                          left: value ? undefined : 2,
                          width: 17, height: 17, borderRadius: '50%',
                          background: value ? '#0B0B0B' : '#fff',
                          transition: 'all 0.3s',
                        }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeSection === 'appearance' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', marginBottom: 20 }}>
                المظهر والألوان
              </h2>
              <div style={{
                padding: '20px',
                background: 'rgba(44,44,44,0.2)',
                border: '1px solid rgba(212,175,55,0.08)',
                borderRadius: 10,
                textAlign: 'center',
              }}>
                <div style={{
                  width: 52, height: 52,
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid rgba(212,175,55,0.1)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px',
                }}>
                  <Palette size={22} color="rgba(212,175,55,0.4)" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo', marginBottom: 8 }}>
                  الوضع الداكن (مفعّل)
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cairo' }}>
                  منصة الثراء كوانتوم تعمل بالوضع الداكن الأمثل حصراً.
                  سيتم إضافة خيارات المظهر في تحديثات قادمة.
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.65)', fontFamily: 'Cairo', marginBottom: 14 }}>
                  لوحة الألوان الحالية
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[
                    { label: 'الأساسي', color: '#0B0B0B' },
                    { label: 'ذهبي', color: '#D4AF37' },
                    { label: 'رمادي', color: '#2C2C2C' },
                    { label: 'أخضر', color: '#10b981' },
                    { label: 'أحمر', color: '#ef4444' },
                  ].map(c => (
                    <div key={c.label} style={{ textAlign: 'center' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: c.color,
                        border: '1px solid rgba(212,175,55,0.15)',
                        marginBottom: 6,
                      }} />
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo' }}>
                        {c.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Privacy */}
          {activeSection === 'privacy' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', marginBottom: 20 }}>
                الخصوصية والبيانات
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  {
                    label: 'سجل النشاط',
                    desc: 'نحتفظ بسجل كامل لجميع معاملاتك المالية لأغراض الأمان والامتثال',
                    locked: true,
                  },
                  {
                    label: 'مشاركة بيانات التحليل',
                    desc: 'السماح للمنصة باستخدام بيانات الاستخدام المجهولة لتحسين الخدمة',
                    locked: false,
                  },
                  {
                    label: 'تحسين نماذج الذكاء الاصطناعي',
                    desc: 'المساهمة في تحسين دقة إشارات التداول (مجهولة الهوية)',
                    locked: false,
                  },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '16px',
                    background: 'rgba(44,44,44,0.2)',
                    border: '1px solid rgba(212,175,55,0.07)',
                    borderRadius: 10, gap: 16,
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: 'Cairo', marginBottom: 4 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', lineHeight: 1.6 }}>
                        {item.desc}
                      </div>
                      {item.locked && (
                        <div style={{ fontSize: 10, color: '#f59e0b', fontFamily: 'Cairo', marginTop: 4 }}>
                          ⚠ مطلوب قانوناً — لا يمكن إلغاؤه
                        </div>
                      )}
                    </div>
                    <div style={{
                      width: 42, height: 23, borderRadius: 12, flexShrink: 0,
                      background: item.locked ? '#D4AF37' : 'rgba(44,44,44,0.8)',
                      border: `1px solid ${item.locked ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`,
                      opacity: item.locked ? 0.5 : 1,
                      position: 'relative',
                    }}>
                      <div style={{
                        position: 'absolute', top: 2, right: item.locked ? 2 : undefined, left: item.locked ? undefined : 2,
                        width: 17, height: 17, borderRadius: '50%',
                        background: item.locked ? '#0B0B0B' : '#fff',
                      }} />
                    </div>
                  </div>
                ))}

                <div style={{
                  marginTop: 8, padding: '16px',
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.12)',
                  borderRadius: 10,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#ef4444', fontFamily: 'Cairo', marginBottom: 6 }}>
                    تصدير أو حذف البيانات
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', lineHeight: 1.7, marginBottom: 14 }}>
                    يمكنك طلب تصدير بياناتك أو حذف حسابك. ملاحظة: لا يمكن حذف السجلات المالية وفق متطلبات الامتثال.
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-outline-gold" style={{ fontSize: 12, padding: '8px 16px' }}>
                      تصدير البيانات
                    </button>
                    <button style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 8, padding: '8px 16px',
                      cursor: 'pointer', color: '#ef4444',
                      fontSize: 12, fontFamily: 'Cairo',
                    }}>
                      طلب حذف الحساب
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width:768px) {
          .settings-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
