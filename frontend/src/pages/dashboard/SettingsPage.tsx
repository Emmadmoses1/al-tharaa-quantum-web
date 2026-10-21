import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, CheckCircle, Gift } from 'lucide-react'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useCurrencies } from '../../hooks/useData'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

type Prefs = { full_name: string | null; phone: string | null; preferred_language: string; preferred_currency: string; notify_email: boolean }
type Ref = { code: string; referred: number; earned_usdt: number; enabled: boolean; reward_usdt: number; min_deposit_usdt: number }

const card: React.CSSProperties = { background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 14, padding: 20, display: 'grid', gap: 14 }
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.65)', fontFamily: 'Cairo', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', background: 'rgba(11,11,11,0.5)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 8, padding: '11px 14px', color: '#fff', fontSize: 14, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }
const h2: React.CSSProperties = { fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', margin: 0 }

export default function SettingsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data: currencies } = useCurrencies()
  const prefs = useQuery({ queryKey: ['prefs'], staleTime: 0, queryFn: () => api.get<Prefs>('/api/settings') })
  const ref = useQuery({ queryKey: ['referral'], staleTime: 0, retry: 0, queryFn: () => api.get<Ref>('/api/referral/me') })
  const [d, setD] = useState<Partial<Prefs>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [pw, setPw] = useState({ a: '', b: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const p = prefs.data
  const v = <K extends keyof Prefs>(k: K) => (k in d ? d[k] : p?.[k]) as Prefs[K]

  async function save() {
    setBusy(true); setMsg('')
    try {
      await api.patch('/api/settings', { full_name: v('full_name') || '', phone: v('phone') || '', preferred_language: v('preferred_language'), preferred_currency: v('preferred_currency'), notify_email: v('notify_email') })
      setD({}); await prefs.refetch(); qc.invalidateQueries({ queryKey: ['profile'] })
      setMsg('تم الحفظ')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'فشل الحفظ') }
    setBusy(false)
  }

  async function changePw() {
    setPwMsg('')
    if (pw.a.length < 8) return setPwMsg('كلمة المرور 8 أحرف على الأقل')
    if (pw.a !== pw.b) return setPwMsg('كلمتا المرور غير متطابقتين')
    const { error } = await supabase.auth.updateUser({ password: pw.a })
    if (error) return setPwMsg(error.message)
    setPw({ a: '', b: '' }); setPwMsg('تم تغيير كلمة المرور')
  }

  const link = ref.data ? `${window.location.origin}/register?ref=${ref.data.code}` : ''
  const cur = (currencies && currencies.length ? currencies : [{ code: 'USD', name_ar: 'دولار أمريكي' }]) as { code: string; name_ar?: string; name?: string }[]

  if (prefs.isLoading) return <Skeleton height={300} borderRadius={14} />
  if (prefs.isError || !p) return <ErrorState onRetry={prefs.refetch} />

  return (
    <div style={{ direction: 'rtl', maxWidth: 640, margin: '0 auto', display: 'grid', gap: 16 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', margin: 0 }}>الإعدادات</h1>

      <div style={card}>
        <h2 style={h2}>الحساب</h2>
        <div><label style={lbl}>الاسم</label><input style={inp} value={v('full_name') || ''} onChange={e => setD(x => ({ ...x, full_name: e.target.value }))} /></div>
        <div><label style={lbl}>البريد</label><input style={{ ...inp, opacity: 0.6 }} value={user?.email || ''} disabled dir="ltr" /></div>
        <div><label style={lbl}>الهاتف</label><input style={inp} dir="ltr" value={v('phone') || ''} onChange={e => setD(x => ({ ...x, phone: e.target.value }))} /></div>
        <div><label style={lbl}>اللغة</label>
          <select style={inp} value={v('preferred_language')} onChange={e => setD(x => ({ ...x, preferred_language: e.target.value }))}>
            <option value="ar">العربية</option><option value="en">English</option>
          </select></div>
        <div><label style={lbl}>العملة المفضلة</label>
          <select style={inp} value={v('preferred_currency')} onChange={e => setD(x => ({ ...x, preferred_currency: e.target.value }))}>
            {cur.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name_ar || c.name}</option>)}
          </select></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', fontFamily: 'Cairo', fontSize: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!v('notify_email')} onChange={e => setD(x => ({ ...x, notify_email: e.target.checked }))} />
          إرسال الإشعارات والفواتير إلى بريدي
        </label>
        <button className="btn-gold" disabled={busy || !Object.keys(d).length} onClick={save} style={{ padding: '12px', opacity: busy || !Object.keys(d).length ? 0.5 : 1 }}>{busy ? '...' : 'حفظ'}</button>
        {msg && <div style={{ fontSize: 13, color: msg === 'تم الحفظ' ? '#10b981' : '#ef4444', fontFamily: 'Cairo', display: 'flex', gap: 6, alignItems: 'center' }}>{msg === 'تم الحفظ' && <CheckCircle size={14} />}{msg}</div>}
      </div>

      <div style={card}>
        <h2 style={h2}>تغيير كلمة المرور</h2>
        <input type="password" style={inp} dir="ltr" placeholder="كلمة المرور الجديدة" value={pw.a} onChange={e => setPw(x => ({ ...x, a: e.target.value }))} autoComplete="new-password" />
        <input type="password" style={inp} dir="ltr" placeholder="تأكيد كلمة المرور" value={pw.b} onChange={e => setPw(x => ({ ...x, b: e.target.value }))} autoComplete="new-password" />
        <button className="btn-outline-gold" onClick={changePw} style={{ padding: '11px' }}>تغيير</button>
        {pwMsg && <div style={{ fontSize: 13, color: pwMsg.startsWith('تم') ? '#10b981' : '#ef4444', fontFamily: 'Cairo' }}>{pwMsg}</div>}
      </div>

      {ref.data && (
        <div style={card}>
          <h2 style={{ ...h2, display: 'flex', alignItems: 'center', gap: 8 }}><Gift size={18} color="#D4AF37" />دعوة الأصدقاء</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', lineHeight: 1.9 }}>
            {ref.data.enabled
              ? `تحصل على ${ref.data.reward_usdt} USDT عندما يودع صديقك لأول مرة ${ref.data.min_deposit_usdt}$ أو أكثر.`
              : 'برنامج المكافآت غير مفعّل حالياً، لكن رابطك جاهز.'}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...inp, direction: 'ltr', fontSize: 12 }} readOnly value={link} />
            <button className="btn-outline-gold" style={{ padding: '0 14px' }} onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* ignore */ } }}>
              {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo' }}>المدعوون: {ref.data.referred} · المكتسب: {ref.data.earned_usdt} USDT</div>
        </div>
      )}
    </div>
  )
}
