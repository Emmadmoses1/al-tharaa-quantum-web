import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { User, Shield, Bell, CheckCircle, AlertTriangle } from 'lucide-react'
import { useProfile, useUpdateProfile, useCurrencies } from '../../hooks/useData'
import { Skeleton } from '../../components/ui/Skeleton'
import SecurityPanel from '../../components/SecurityPanel'

export default function ProfilePage() {
  const { user } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const { data: currencies } = useCurrencies()
  const updateProfile = useUpdateProfile()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [currency, setCurrency] = useState('BHD')
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile')

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setPhone(profile.phone || '')
      setCurrency(profile.preferred_currency || 'BHD')
    }
  }, [profile])

  async function handleSave() {
    await updateProfile.mutateAsync({
      full_name: fullName,
      phone: phone || null,
      preferred_currency: currency,
    } as Parameters<typeof updateProfile.mutateAsync>[0])
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(11,11,11,0.5)',
    border: '1px solid rgba(212,175,55,0.15)', borderRadius: 8,
    padding: '11px 14px', color: '#fff', fontSize: 14,
    fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'Cairo', marginBottom: 8,
  }

  return (
    <div style={{ direction: 'rtl', maxWidth: 680 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}>
          الملف الشخصي
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo' }}>
          إدارة معلوماتك الشخصية وإعداداتك
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
        {[
          { key: 'profile', label: 'المعلومات الشخصية', icon: <User size={14} /> },
          { key: 'security', label: 'الأمان', icon: <Shield size={14} /> },
          { key: 'notifications', label: 'الإشعارات', icon: <Bell size={14} /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            style={{
              background: 'none', border: 'none',
              borderBottom: `2px solid ${activeTab === tab.key ? '#D4AF37' : 'transparent'}`,
              padding: '11px 18px', cursor: 'pointer',
              color: activeTab === tab.key ? '#D4AF37' : 'rgba(255,255,255,0.4)',
              fontSize: 13, fontFamily: 'Cairo',
              fontWeight: activeTab === tab.key ? 700 : 400,
              display: 'flex', alignItems: 'center', gap: 7,
              marginBottom: -1, transition: 'all 0.2s',
            }}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* KYC status */}
          {isLoading ? (
            <Skeleton height={52} borderRadius={10} />
          ) : (
            <div style={{
              padding: '14px 18px', borderRadius: 10,
              background: profile?.kyc_status === 'approved'
                ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)',
              border: `1px solid ${profile?.kyc_status === 'approved'
                ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              {profile?.kyc_status === 'approved'
                ? <CheckCircle size={18} color="#10b981" />
                : <AlertTriangle size={18} color="#f59e0b" />
              }
              <div>
                <div style={{
                  fontSize: 13, fontWeight: 700, fontFamily: 'Cairo',
                  color: profile?.kyc_status === 'approved' ? '#10b981' : '#f59e0b',
                }}>
                  {profile?.kyc_status === 'approved' ? 'الهوية موثّقة' : 'التحقق من الهوية مطلوب'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>
                  {profile?.kyc_status === 'approved'
                    ? 'حسابك موثّق بالكامل'
                    : 'أكمل التحقق لتفعيل الإيداع والسحب'}
                </div>
              </div>
              {profile?.kyc_status !== 'approved' && (
                <button
                  className="btn-outline-gold"
                  style={{ marginRight: 'auto', fontSize: 12, padding: '7px 14px', flexShrink: 0 }}
                >
                  التحقق الآن
                </button>
              )}
            </div>
          )}

          <div className="glass-card" style={{ padding: 24 }}>
            <h2 style={{
              fontSize: 15, fontWeight: 700,
              fontFamily: 'Cairo', color: '#fff', marginBottom: 20,
            }}>البيانات الشخصية</h2>

            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[1, 2, 3, 4].map(i => <Skeleton key={i} height={44} borderRadius={8} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>الاسم الكامل</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(212,175,55,0.15)'}
                  />
                </div>

                <div>
                  <label style={labelStyle}>البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={profile?.email || user?.email || ''}
                    disabled
                    dir="ltr"
                    style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>رقم الهاتف (اختياري)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+973 XXXX XXXX"
                    dir="ltr"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(212,175,55,0.15)'}
                  />
                </div>

                <div>
                  <label style={labelStyle}>عملة العرض المفضّلة</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    style={{
                      ...inputStyle,
                      cursor: 'pointer',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23D4AF37' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'left 12px center',
                      paddingLeft: 32,
                      appearance: 'none' as const,
                    }}
                  >
                    {(currencies || [
                      { code: 'BHD', name: 'Bahraini Dinar' },
                      { code: 'USD', name: 'US Dollar' },
                      { code: 'EUR', name: 'Euro' },
                      { code: 'SAR', name: 'Saudi Riyal' },
                      { code: 'AED', name: 'UAE Dirham' },
                      { code: 'NGN', name: 'Nigerian Naira' },
                    ]).map((c: { code: string; name: string }) => (
                      <option key={c.code} value={c.code}
                        style={{ background: '#141414', color: '#fff' }}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {updateProfile.isError && (
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8, fontSize: 13,
                    color: '#ef4444', fontFamily: 'Cairo',
                  }}>
                    فشل حفظ التغييرات. يرجى المحاولة مرة أخرى.
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={updateProfile.isPending}
                  className="btn-gold"
                  style={{
                    fontSize: 14, padding: '12px',
                    opacity: updateProfile.isPending ? 0.7 : 1,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 8,
                  }}
                >
                  {saved
                    ? <><CheckCircle size={16} /> تم الحفظ</>
                    : updateProfile.isPending ? 'جارٍ الحفظ...' : 'حفظ التغييرات'
                  }
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'security' && <SecurityPanel />}
      {false && (
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', marginBottom: 20 }}>
            إعدادات الأمان
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { label: 'تغيير كلمة المرور', desc: 'يُنصح بتغييرها كل 3 أشهر', action: 'تغيير' },
              { label: 'المصادقة الثنائية (2FA)', desc: 'غير مفعّلة — أضف طبقة حماية إضافية', action: 'تفعيل' },
              { label: 'عناوين السحب الموثوقة', desc: 'لم تُضف أي عناوين بعد', action: 'إدارة' },
            ].map((item, i, arr) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 0',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(212,175,55,0.06)' : 'none',
                gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: 'Cairo', marginBottom: 3 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo' }}>
                    {item.desc}
                  </div>
                </div>
                <button className="btn-outline-gold" style={{ fontSize: 12, padding: '7px 16px', flexShrink: 0 }}>
                  {item.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', marginBottom: 20 }}>
            تفضيلات الإشعارات
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { label: 'تأكيد الإيداع', desc: 'إشعار عند تأكيد إيداعك' },
              { label: 'تحديثات الاستثمار', desc: 'أخبار وتحديثات فرصك الاستثمارية' },
              { label: 'صفقات الذكاء الاصطناعي', desc: 'فتح وإغلاق الصفقات الآلية' },
              { label: 'تنبيهات المخاطر', desc: 'عند الوصول لحدود المخاطر' },
              { label: 'سحب مكتمل', desc: 'تأكيد اكتمال طلبات السحب' },
              { label: 'تنبيهات الأمان', desc: 'تسجيل دخول من جهاز جديد' },
            ].map((item, i, arr) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '13px 0',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(212,175,55,0.06)' : 'none',
                gap: 16,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: 'Cairo' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo', marginTop: 2 }}>
                    {item.desc}
                  </div>
                </div>
                <NotifToggle />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function NotifToggle() {
  const [on, setOn] = useState(true)
  return (
    <button
      onClick={() => setOn(!on)}
      style={{
        width: 40, height: 22, borderRadius: 11, flexShrink: 0,
        background: on ? '#D4AF37' : 'rgba(44,44,44,0.8)',
        border: `1px solid ${on ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`,
        cursor: 'pointer', position: 'relative', transition: 'all 0.3s', padding: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2,
        right: on ? 2 : undefined,
        left: on ? undefined : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: on ? '#0B0B0B' : '#fff',
        transition: 'all 0.3s',
      }} />
    </button>
  )
}
