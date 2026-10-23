import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CreditCard, ShieldCheck, ArrowDown, CheckCircle, ExternalLink, Radio } from 'lucide-react'
import { api } from '../lib/api'
import { useSite } from '../lib/useSite'
import { localNotify } from '../lib/push'

type Est = { usdt: number; min_usd: number; max_usd: number }
type Made = { deposit_id: string; invoice_url: string; usdt: number }
type St = { status: string; np_status: string | null; paid: number | null }

const CUR = [
  { c: 'usd', s: '$', n: 'دولار' }, { c: 'eur', s: '€', n: 'يورو' }, { c: 'gbp', s: '£', n: 'جنيه' }, { c: 'ngn', s: '₦', n: 'نايرا' },
]
const KEY = 'aq_card_dep'
const card: React.CSSProperties = { background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 16, padding: 20, display: 'grid', gap: 14 }
const inp: React.CSSProperties = { width: '100%', background: 'rgba(11,11,11,0.6)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, padding: '13px 14px', color: '#fff', fontSize: 20, fontFamily: 'Montserrat', outline: 'none', boxSizing: 'border-box', direction: 'ltr' }
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', marginBottom: 6, display: 'block' }
const TERMINAL = ['failed', 'expired', 'refunded']

function load(): { id: string; url: string } | null {
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.id ? v : null } catch { return null }
}
function save(v: { id: string; url: string } | null) {
  try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY) } catch { /* ignore */ }
}

// Card deposit: the user chooses the amount in the card's currency and sees the USDT estimate.
// The card itself is entered on the payment partner's secure page, never on this site.
export default function CardDeposit() {
  const { data: site } = useSite()
  const qc = useQueryClient()
  const [purpose, setPurpose] = useState<'trading' | 'investment'>('trading')
  const [cur, setCur] = useState('usd')
  const [amount, setAmount] = useState('50')
  const [est, setEst] = useState<Est | null>(null)
  const [estErr, setEstErr] = useState('')
  const [quoting, setQuoting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [track, setTrack] = useState(load())
  const [st, setSt] = useState<St | null>(null)
  const timer = useRef<number | null>(null)
  const notified = useRef(false)

  const meta = CUR.find(x => x.c === cur) || CUR[0]
  const n = Number(amount)

  // live converter
  useEffect(() => {
    setEst(null); setEstErr('')
    if (!(n > 0)) return
    setQuoting(true)
    const id = window.setTimeout(async () => {
      try { setEst(await api.get<Est>(`/api/nowpayments/card/estimate?amount=${n}&currency=${cur}`)) }
      catch (e) { setEstErr(e instanceof Error ? e.message : 'تعذر حساب السعر') }
      setQuoting(false)
    }, 500)
    return () => { window.clearTimeout(id); setQuoting(false) }
  }, [n, cur])

  // follow the payment after the user comes back from the card page
  useEffect(() => {
    if (!track) return
    notified.current = false
    const tick = async () => {
      try {
        const s = await api.get<St>(`/api/nowpayments/status/${track.id}`)
        setSt(s)
        if (s.status === 'confirmed') {
          qc.invalidateQueries({ queryKey: ['wallet-balances'] }); qc.invalidateQueries({ queryKey: ['deposits'] })
          if (!notified.current) { notified.current = true; localNotify('تمت إضافة إيداعك', `تمت إضافة ${s.paid ?? ''} USDT إلى رصيدك.`) }
          save(null)
          return
        }
        if (s.np_status && TERMINAL.includes(s.np_status)) { save(null); return }
      } catch { /* keep polling */ }
      timer.current = window.setTimeout(tick, 5000)
    }
    tick()
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [track, qc])

  const min = est?.min_usd ?? site?.payments?.min_usd ?? 10
  const max = est?.max_usd ?? site?.payments?.max_usd ?? 5000
  const outOfRange = !!est && (est.usdt < min || est.usdt > max)

  async function go() {
    setErr('')
    if (!est || outOfRange) return
    setBusy(true)
    try {
      const m = await api.post<Made>('/api/nowpayments/card/create', { amount: n, currency: cur, purpose })
      const t = { id: m.deposit_id, url: m.invoice_url }
      save(t); setTrack(t)
      window.location.assign(m.invoice_url)
    } catch (e) { setErr(e instanceof Error ? e.message : 'تعذر بدء الدفع') }
    setBusy(false)
  }

  const done = st?.status === 'confirmed'
  const npStatus = st?.np_status || 'waiting'
  const seen = ['confirming', 'confirmed', 'sending'].includes(npStatus)
  const dead = TERMINAL.includes(npStatus)

  if (track || done) {
    const label = done ? 'تمت إضافة الإيداع إلى رصيدك' : dead ? 'لم تكتمل العملية' : seen ? 'تم الدفع، يجري تحويله إلى USDT وإضافته' : 'بانتظار إتمام الدفع بالبطاقة'
    const color = done ? '#10b981' : dead ? '#ef4444' : seen ? '#6366f1' : '#9ca3af'
    return (
      <div style={{ direction: 'rtl', maxWidth: 560, margin: '0 auto 20px' }}>
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#D4AF37', fontFamily: 'Cairo', fontWeight: 800, fontSize: 18 }}><CreditCard size={18} />الإيداع بالبطاقة</div>
          <div style={{ background: `${color}22`, border: `1px solid ${color}55`, color, padding: '12px 14px', borderRadius: 10, fontFamily: 'Cairo', fontWeight: 700, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
            {done ? <CheckCircle size={16} /> : !dead && <Radio size={16} />}{label}
          </div>
          {!done && !dead && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', lineHeight: 1.9 }}>يمكنك إغلاق هذه الصفحة. ما إن يصل المبلغ يُضاف إلى رصيدك تلقائياً وتصلك رسالة وإشعار.</div>}
          {!done && !dead && track?.url && <a href={track.url} target="_blank" rel="noreferrer" className="btn-outline-gold" style={{ textAlign: 'center', padding: '11px 0', textDecoration: 'none', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo' }}><ExternalLink size={15} />فتح صفحة الدفع مرة أخرى</a>}
          <button type="button" className={done ? 'btn-gold' : 'btn-outline-gold'} style={{ padding: '11px 0' }} onClick={() => { save(null); setTrack(null); setSt(null) }}>{done || dead ? 'إيداع جديد' : 'إخفاء'}</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ direction: 'rtl', maxWidth: 560, margin: '0 auto 20px' }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#D4AF37', fontFamily: 'Cairo', fontWeight: 800, fontSize: 18 }}><CreditCard size={18} />الإيداع بالبطاقة البنكية</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', lineHeight: 1.9 }}>اختر المبلغ بعملة بطاقتك، وسنعرض لك ما يعادله بعملة USDT. تُخصم قيمته من بطاقتك وتُضاف إلى رصيدك.</div>

        <div>
          <label style={lbl}>المحفظة</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {([['trading', 'محفظة التداول'], ['investment', 'محفظة الاستثمار']] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setPurpose(k)} style={{ flex: 1, padding: '11px 0', borderRadius: 10, cursor: 'pointer', fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, background: purpose === k ? 'rgba(212,175,55,0.14)' : 'transparent', border: `1px solid ${purpose === k ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`, color: purpose === k ? '#D4AF37' : 'rgba(255,255,255,0.6)' }}>{l}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={lbl}>عملة البطاقة</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {CUR.map(x => (
              <button key={x.c} type="button" onClick={() => setCur(x.c)} style={{ padding: '10px 0', borderRadius: 10, cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 800, fontSize: 13, background: cur === x.c ? 'rgba(212,175,55,0.14)' : 'transparent', border: `1px solid ${cur === x.c ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`, color: cur === x.c ? '#D4AF37' : '#fff' }}>
                <div style={{ fontSize: 16 }}>{x.s}</div><div style={{ fontSize: 10, opacity: 0.7 }}>{x.c.toUpperCase()}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={lbl}>المبلغ الذي سيُخصم من بطاقتك ({meta.c.toUpperCase()})</label>
          <input style={inp} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', color: '#D4AF37' }}><ArrowDown size={18} /></div>

        <div style={{ background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', marginBottom: 4 }}>ما يعادله تقريباً بعملة USDT</div>
          <div dir="ltr" style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Montserrat', color: est ? '#D4AF37' : 'rgba(255,255,255,0.3)' }}>
            {quoting ? '...' : est ? `≈ ${est.usdt.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT` : '—'}
          </div>
          {estErr && <div style={{ fontSize: 12, color: '#ef4444', fontFamily: 'Cairo', marginTop: 6 }}>{estErr}</div>}
          {outOfRange && <div style={{ fontSize: 12, color: '#f59e0b', fontFamily: 'Cairo', marginTop: 6 }}>المبلغ يجب أن يعادل بين {min} و {max} USDT</div>}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', lineHeight: 1.9 }}>
          <ShieldCheck size={16} color="#10b981" style={{ flexShrink: 0, marginTop: 4 }} />
          <span>تُدخل بيانات بطاقتك في صفحة دفع آمنة لدى شريك الدفع (وقد يطلب التحقق من هويتك)، ولا نحتفظ ببيانات بطاقتك. السعر تقديري، والرسوم والمبلغ النهائي يظهران في صفحة الدفع قبل التأكيد.</span>
        </div>

        <button type="button" className="btn-gold" disabled={busy || !est || outOfRange} onClick={go} style={{ padding: '14px 0', fontSize: 15, opacity: busy || !est || outOfRange ? 0.5 : 1 }}>{busy ? '...' : 'المتابعة للدفع بالبطاقة'}</button>
        {err && <div style={{ color: '#ef4444', fontSize: 13, fontFamily: 'Cairo' }}>{err}</div>}
      </div>
    </div>
  )
}
