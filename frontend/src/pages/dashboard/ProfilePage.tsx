import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { User, Shield, Bell, CheckCircle, Clock, Mail, Save } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useProfile, useUpdateProfile, useCurrencies } from '../../hooks/useData'
import { useSite } from '../../lib/useSite'
import { api } from '../../lib/api'
import { Skeleton } from '../../components/ui/Skeleton'
import SecurityPanel from '../../components/SecurityPanel'
import PushSettings from '../../components/PushSettings'
import { PageStyles, PageHeader, Pill } from '../../components/PageKit'

type Tab = 'profile' | 'security' | 'notifications'

export default function ProfilePage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data: profile, isLoading } = useProfile()
  const { data: currencies } = useCurrencies()
  const { data: site } = useSite()
  const updateProfile = useUpdateProfile()
  const prefs = useQuery({ queryKey: ['prefs'], staleTime: 0, queryFn: () => api.get<{ notify_email: boolean }>('/api/settings') })

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<Tab>('profile')
  const [mailBusy, setMailBusy] = useState(false)
  const [mailErr, setMailErr] = useState('')

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setPhone(profile.phone || '')
      setCurrency(profile.preferred_currency || 'USD')
    }
  }, [profile])

  async function handleSave() {
    await updateProfile.mutateAsync({
      full_name: fullName, phone: phone || null, preferred_currency: currency,
    } as Parameters<typeof updateProfile.mutateAsync>[0])
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const emailOn = prefs.data ? prefs.data.notify_email !== false : true
  async function toggleEmail() {
    setMailBusy(true); setMailErr('')
    try {
      await api.patch('/api/settings', { notify_email: !emailOn })
      await qc.invalidateQueries({ queryKey: ['prefs'] })
    } catch (e) { setMailErr(e instanceof Error ? e.message : 'تعذر الحفظ') }
    setMailBusy(false)
  }

  const kyc = profile?.kyc_status
  const verified = kyc === 'approved'
  const name = profile?.full_name || user?.email || ''
  const list = currencies || [
    { code: 'USD', name: 'US Dollar' }, { code: 'EUR', name: 'Euro' }, { code: 'SAR', name: 'Saudi Riyal' },
    { code: 'AED', name: 'UAE Dirham' }, { code: 'BHD', name: 'Bahraini Dinar' }, { code: 'NGN', name: 'Nigerian Naira' },
  ]

  return (
    <div style={{ direction: 'rtl', maxWidth: 700, margin: '0 auto' }} translate="no" className="notranslate">
      <PageStyles />
      <PageHeader icon={<User size={22} color="#D4AF37" />} title="الملف الشخصي" sub="إدارة معلوماتك وأمان حسابك" />

      <div className="pk-panel" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#D4AF37,#8a6d1a)', color: '#0B0B0B', font: '800 22px Cairo,sans-serif' }}>
          {(name[0] || '?').toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'Cairo', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          <div dir="ltr" style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Montserrat', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.email || user?.email}</div>
        </div>
        {isLoading ? <Skeleton width={90} height={26} borderRadius={13} /> : verified
          ? <Pill color="#10b981"><CheckCircle size={11} style={{ verticalAlign: -1, marginLeft: 4 }} />الهوية موثّقة</Pill>
          : <Pill color="#f59e0b"><Clock size={11} style={{ verticalAlign: -1, marginLeft: 4 }} />{kyc === 'pending' ? 'التحقق قيد المراجعة' : 'الهوية غير موثّقة'}</Pill>}
      </div>

      {!isLoading && !verified && (
        <div className="pk-note" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: 'rgba(245,158,11,0.92)', marginBottom: 18 }}>
          <Clock size={16} style={{ flexShrink: 0, marginTop: 3 }} />
          <span>
            تتم مراجعة توثيق الهوية يدوياً من فريق الإدارة.
            {site?.support_email ? <> للاستفسار راسلنا على <b dir="ltr" style={{ fontFamily: 'Montserrat' }}>{site.support_email}</b>.</> : ' للاستفسار تواصل مع الدعم.'}
          </span>
        </div>
      )}

      <div className="pk-tabs">
        {([['profile', 'المعلومات', <User key="u" size={14} />], ['security', 'الأمان', <Shield key="s" size={14} />], ['notifications', 'الإشعارات', <Bell key="b" size={14} />]] as const).map(([k, l, ic]) => (
          <button key={k} type="button" className={`pk-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{ic}{l}</button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="pk-panel">
          <h2 className="pk-h2">البيانات الشخصية</h2>
          {isLoading ? (
            <div style={{ display: 'grid', gap: 16 }}>{[1, 2, 3, 4].map(i => <Skeleton key={i} height={46} borderRadius={10} />)}</div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label htmlFor="pf-name" className="pk-lbl">الاسم الكامل</label>
                <input id="pf-name" className="pk-input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={{ fontFamily: 'Cairo' }} />
              </div>
              <div>
                <label htmlFor="pf-mail" className="pk-lbl">البريد الإلكتروني</label>
                <input id="pf-mail" className="pk-input" type="email" value={profile?.email || user?.email || ''} disabled dir="ltr" />
              </div>
              <div>
                <label htmlFor="pf-phone" className="pk-lbl">رقم الهاتف (اختياري)</label>
                <input id="pf-phone" className="pk-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234 XXX XXX XXXX" dir="ltr" />
              </div>
              <div>
                <label htmlFor="pf-cur" className="pk-lbl">عملة العرض المفضّلة</label>
                <select id="pf-cur" className="pk-input" value={currency} onChange={e => setCurrency(e.target.value)} style={{ cursor: 'pointer', fontFamily: 'Cairo' }}>
                  {list.map((c: { code: string; name: string }) => (
                    <option key={c.code} value={c.code} style={{ background: '#141414', color: '#fff' }}>{c.code} — {c.name}</option>
                  ))}
                </select>
              </div>
              {updateProfile.isError && <div className="pk-note" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>فشل حفظ التغييرات. حاول مرة أخرى.</div>}
              <button type="button" onClick={handleSave} disabled={updateProfile.isPending} className="btn-gold"
                style={{ fontSize: 14, padding: 12, opacity: updateProfile.isPending ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {saved ? <><CheckCircle size={16} /> تم الحفظ</> : updateProfile.isPending ? 'جارٍ الحفظ...' : <><Save size={16} /> حفظ التغييرات</>}
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'security' && <SecurityPanel />}

      {tab === 'notifications' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="pk-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <h2 className="pk-h2" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><Mail size={17} color="#D4AF37" />إشعارات البريد الإلكتروني</h2>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', lineHeight: 1.9 }}>رسائل عن الإيداعات ونتائج الصفقات والفرص الاستثمارية الجديدة.</div>
              </div>
              <button type="button" role="switch" aria-checked={emailOn} aria-label="إشعارات البريد" disabled={mailBusy || prefs.isLoading} onClick={toggleEmail}
                style={{ width: 46, height: 26, borderRadius: 13, flexShrink: 0, position: 'relative', padding: 0, cursor: 'pointer', transition: 'all .25s', opacity: mailBusy ? 0.6 : 1,
                  background: emailOn ? '#D4AF37' : 'rgba(44,44,44,0.8)', border: `1px solid ${emailOn ? '#D4AF37' : 'rgba(212,175,55,0.25)'}` }}>
                <span style={{ position: 'absolute', top: 3, right: emailOn ? 3 : 23, width: 18, height: 18, borderRadius: '50%', background: emailOn ? '#0B0B0B' : '#fff', transition: 'all .25s' }} />
              </button>
            </div>
            {mailErr && <div style={{ marginTop: 10, fontSize: 12, color: '#ef4444', fontFamily: 'Cairo' }}>{mailErr}</div>}
          </div>
          <PushSettings />
        </div>
      )}
    </div>
  )
}
