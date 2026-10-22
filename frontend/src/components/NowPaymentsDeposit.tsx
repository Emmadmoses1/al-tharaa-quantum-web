import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, CheckCircle, Zap, Bell, Clock, Radio } from 'lucide-react'
import { api } from '../lib/api'
import { useSite } from '../lib/useSite'
import { enablePush, localNotify, pushSupported } from '../lib/push'

type Created = { deposit_id: string; address: string; pay_amount: number | null; network: string; expires_at: string; price_usd?: number }
type St = { status: string; np_status: string | null; paid: number | null; expected: number | null; expires_at: string | null }

const NETS = [
  { k: 'TRC20', l: 'TRON (TRC20)', hint: 'رسوم منخفضة' },
  { k: 'BEP20', l: 'BNB Chain (BEP20)', hint: 'سريع' },
  { k: 'ERC20', l: 'Ethereum (ERC20)', hint: 'رسوم أعلى' },
]
const card: React.CSSProperties = { background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 16, padding: 20, display: 'grid', gap: 14 }
const inp: React.CSSProperties = { width: '100%', background: 'rgba(11,11,11,0.6)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, padding: '13px 14px', color: '#fff', fontSize: 18, fontFamily: 'Montserrat', outline: 'none', boxSizing: 'border-box', direction: 'ltr' }
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', marginBottom: 6, display: 'block' }

const STEPS: Record<string, { t: string; c: string }> = {
  waiting: { t: 'بانتظار التحويل', c: '#9ca3af' }, confirming: { t: 'تم رصد التحويل، بانتظار تأكيد الشبكة', c: '#6366f1' },
  confirmed: { t: 'تم التأكيد، جارٍ الإضافة', c: '#6366f1' }, sending: { t: 'جارٍ الإضافة', c: '#6366f1' },
  partially_paid: { t: 'المبلغ المحوّل أقل من المطلوب. تواصل مع الدعم', c: '#f59e0b' }, finished: { t: 'تمت إضافة الإيداع إلى رصيدك', c: '#10b981' },
  failed: { t: 'فشل الدفع', c: '#ef4444' }, expired: { t: 'انتهت صلاحية الطلب', c: '#6b7280' }, refunded: { t: 'تم الاسترداد', c: '#6b7280' },
}
const TRACK = ['إنشاء الطلب', 'بانتظار التحويل', 'تأكيد الشبكة', 'إضافة الرصيد']
const TERMINAL = ['failed', 'expired', 'refunded']

function stage(np: string | null, done: boolean) {
  if (done) return 3
  if (np === 'confirming' || np === 'confirmed' || np === 'sending') return 2
  return 1
}
const two = (n: number) => String(n).padStart(2, '0')

export default function NowPaymentsDeposit() {
  const { data: site } = useSite()
  const qc = useQueryClient()
  const [amount, setAmount] = useState('50')
  const [network, setNetwork] = useState('TRC20')
  const [purpose, setPurpose] = useState<'trading' | 'investment'>('trading')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [pay, setPay] = useState<Created | null>(null)
  const [st, setSt] = useState<St | null>(null)
  const [copied, setCopied] = useState('')
  const [now, setNow] = useState(Date.now())
  const [checkedAt, setCheckedAt] = useState(0)
  const [pushOn, setPushOn] = useState(pushSupported() && Notification.permission === 'granted')
  const timer = useRef<number | null>(null)
  const notified = useRef(false)

  const min = site?.payments?.min_usd ?? 10
  const max = site?.payments?.max_usd ?? 5000

  // continue a payment that is still waiting (page reloaded or reopened)
  useEffect(() => {
    api.get<Created | null>('/api/nowpayments/active').then(a => { if (a) setPay(a) }).catch(() => { /* ignore */ })
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!pay) return
    notified.current = false
    const tick = async () => {
      try {
        const s = await api.get<St>(`/api/nowpayments/status/${pay.deposit_id}`)
        setSt(s); setCheckedAt(Date.now())
        if (s.status === 'confirmed') {
          qc.invalidateQueries({ queryKey: ['wallet-balances'] })
          qc.invalidateQueries({ queryKey: ['deposits'] })
          if (!notified.current) { notified.current = true; localNotify('تمت إضافة إيداعك', `تمت إضافة ${s.paid ?? ''} USDT إلى رصيدك.`) }
          return
        }
        if (s.np_status && TERMINAL.includes(s.np_status)) return
      } catch { /* keep polling */ }
      timer.current = window.setTimeout(tick, 5000)
    }
    tick()
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [pay, qc])

  async function create() {
    setErr('')
    const n = Number(amount)
    if (!(n >= min && n <= max)) return setErr(`المبلغ بين ${min}$ و ${max}$`)
    setBusy(true)
    try { setSt(null); setPay(await api.post<Created>('/api/nowpayments/create', { amount_usd: n, network, purpose })) }
    catch (e) { setErr(e instanceof Error ? e.message : 'تعذر إنشاء الطلب') }
    setBusy(false)
  }
  async function copy(text: string, k: string) { try { await navigator.clipboard.writeText(text); setCopied(k); setTimeout(() => setCopied(''), 1500) } catch { /* ignore */ } }

  const done = st?.status === 'confirmed'
  const npStatus = st?.np_status || 'waiting'
  const step = STEPS[npStatus] || STEPS.waiting
  const dead = TERMINAL.includes(npStatus)
  const cur = stage(npStatus, done)
  const expiresAt = st?.expires_at || pay?.expires_at || null
  const left = expiresAt ? Math.max(0, new Date(expiresAt).getTime() - now) : 0
  const d = Math.floor(left / 86400000), h = Math.floor(left / 3600000) % 24, m = Math.floor(left / 60000) % 60, s = Math.floor(left / 1000) % 60
  const expected = Number(st?.expected ?? pay?.pay_amount ?? 0)
  const paid = Number(st?.paid ?? 0)
  const pct = expected > 0 ? Math.min(100, Math.round((paid / expected) * 100)) : 0
  const ago = checkedAt ? Math.max(0, Math.round((now - checkedAt) / 1000)) : null

  return (
    <div style={{ direction: 'rtl', maxWidth: 560, margin: '0 auto 20px' }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#D4AF37', fontFamily: 'Cairo', fontWeight: 800, fontSize: 18 }}><Zap size={18} />إيداع تلقائي بالعملات الرقمية</div>
        {!pay ? (
          <>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', lineHeight: 1.9 }}>ادفع USDT وتُضاف إلى رصيدك تلقائياً بعد التأكيد، بدون انتظار موافقة يدوية. ستصلك رسالة بريد وإشعار على هاتفك.</div>
            <div>
              <label style={lbl}>المحفظة</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {([['trading', 'محفظة التداول'], ['investment', 'محفظة الاستثمار']] as const).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setPurpose(k)} style={{ flex: 1, padding: '11px 0', borderRadius: 10, cursor: 'pointer', fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, background: purpose === k ? 'rgba(212,175,55,0.14)' : 'transparent', border: `1px solid ${purpose === k ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`, color: purpose === k ? '#D4AF37' : 'rgba(255,255,255,0.6)' }}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>الشبكة</label>
              <div style={{ display: 'grid', gap: 8 }}>
                {NETS.map(n => (
                  <button key={n.k} type="button" onClick={() => setNetwork(n.k)} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Montserrat', fontSize: 13, background: network === n.k ? 'rgba(212,175,55,0.14)' : 'transparent', border: `1px solid ${network === n.k ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`, color: network === n.k ? '#D4AF37' : '#fff' }}>
                    <span>{n.l}</span><span style={{ fontFamily: 'Cairo', opacity: 0.6, fontSize: 12 }}>{n.hint}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>المبلغ بالدولار ({min}$ - {max}$)</label>
              <input style={inp} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
            </div>
            <button type="button" className="btn-gold" disabled={busy} onClick={create} style={{ padding: '14px 0', fontSize: 15, opacity: busy ? 0.6 : 1 }}>{busy ? '...' : 'إنشاء عنوان الدفع'}</button>
            {err && <div style={{ color: '#ef4444', fontSize: 13, fontFamily: 'Cairo' }}>{err}</div>}
          </>
        ) : (
          <>
            {/* progress track */}
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              {TRACK.map((t, i) => {
                const on = i <= cur
                return (
                  <div key={t} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                    {i > 0 && <div style={{ position: 'absolute', top: 11, right: '50%', width: '100%', height: 2, background: i <= cur ? '#D4AF37' : 'rgba(255,255,255,0.1)' }} />}
                    <div style={{ position: 'relative', zIndex: 1, width: 24, height: 24, margin: '0 auto', borderRadius: '50%', background: on ? '#D4AF37' : '#1a1a1a', border: `2px solid ${on ? '#D4AF37' : 'rgba(255,255,255,0.15)'}`, color: '#0B0B0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, fontFamily: 'Montserrat', animation: i === cur && !done && !dead ? 'aqpulse 1.6s ease-in-out infinite' : 'none' }}>{on && (i < cur || done) ? '✓' : i + 1}</div>
                    <div style={{ marginTop: 6, fontSize: 10, fontFamily: 'Cairo', color: on ? '#D4AF37' : 'rgba(255,255,255,0.4)', fontWeight: on ? 700 : 400 }}>{t}</div>
                  </div>
                )
              })}
            </div>

            <div style={{ background: `${(done ? STEPS.finished : step).c}22`, border: `1px solid ${(done ? STEPS.finished : step).c}55`, color: (done ? STEPS.finished : step).c, padding: '10px 12px', borderRadius: 10, fontFamily: 'Cairo', fontWeight: 700, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
              {done ? <CheckCircle size={16} /> : !dead && <Radio size={16} />}{done ? STEPS.finished.t : step.t}
            </div>

            {!done && !dead && (
              <>
                {/* counter */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(11,11,11,0.55)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 12, padding: '10px 14px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo' }}><Clock size={14} color="#D4AF37" />الوقت المتبقي للدفع</span>
                  <span dir="ltr" style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 20, color: left < 600000 ? '#f59e0b' : '#D4AF37', letterSpacing: 1 }}>{d > 0 ? `${d}d ` : ''}{two(h)}:{two(m)}:{two(s)}</span>
                </div>

                <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div style={{ background: '#fff', padding: 8, borderRadius: 12, lineHeight: 0 }}><QRCodeSVG value={pay.address} size={132} bgColor="#ffffff" fgColor="#0B0B0B" /></div>
                  <div style={{ flex: 1, minWidth: 190 }}>
                    <label style={lbl}>أرسل بالضبط</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input style={{ ...inp, fontWeight: 800, color: '#D4AF37', fontSize: 16 }} readOnly value={`${pay.pay_amount ?? amount} USDT`} />
                      <button type="button" className="btn-outline-gold" style={{ padding: '0 14px' }} onClick={() => copy(String(pay.pay_amount ?? amount), 'a')}>{copied === 'a' ? <CheckCircle size={16} /> : <Copy size={16} />}</button>
                    </div>
                  </div>
                </div>
                <div>
                  <label style={lbl}>إلى العنوان ({pay.network})</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...inp, fontSize: 12 }} readOnly value={pay.address} />
                    <button type="button" className="btn-outline-gold" style={{ padding: '0 14px' }} onClick={() => copy(pay.address, 'b')}>{copied === 'b' ? <CheckCircle size={16} /> : <Copy size={16} />}</button>
                  </div>
                </div>

                {/* received */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'Cairo', marginBottom: 6 }}>
                    <span style={{ color: 'rgba(255,255,255,0.55)' }}>المبلغ المستلم</span>
                    <span dir="ltr" style={{ fontFamily: 'Montserrat', fontWeight: 700, color: paid > 0 ? '#10b981' : 'rgba(255,255,255,0.5)' }}>{paid} / {expected || '—'} USDT</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#D4AF37,#10b981)', transition: 'width .6s ease' }} />
                  </div>
                  {ago !== null && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo', marginTop: 6 }}>يتم الفحص تلقائياً · آخر فحص قبل {ago} ث</div>}
                </div>

                <div style={{ fontSize: 12, color: '#f59e0b', fontFamily: 'Cairo', lineHeight: 1.9 }}>أرسل USDT على شبكة {pay.network} فقط. التحويل بعملة أو شبكة أخرى يضيع ولا يمكن استرجاعه. يمكنك إغلاق الصفحة، وستُضاف الأموال تلقائياً وتصلك رسالة.</div>

                {pushSupported() && !pushOn && Notification.permission !== 'denied' && (
                  <button type="button" className="btn-outline-gold" style={{ padding: '10px 0', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo' }} onClick={async () => setPushOn(await enablePush())}><Bell size={15} />نبّهني على هاتفي عند وصول الدفع</button>
                )}
              </>
            )}

            {done ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to="/dashboard/invoices" className="btn-outline-gold" style={{ flex: 1, textAlign: 'center', padding: '12px 0', textDecoration: 'none' }}>الفاتورة</Link>
                <button type="button" className="btn-gold" style={{ flex: 1, padding: '12px 0' }} onClick={() => { setPay(null); setSt(null) }}>إيداع جديد</button>
              </div>
            ) : (
              <button type="button" className="btn-outline-gold" style={{ padding: '11px 0' }} onClick={() => { setPay(null); setSt(null) }}>{dead ? 'طلب جديد' : 'إخفاء (يستمر الفحص تلقائياً)'}</button>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes aqpulse { 0%,100% { box-shadow: 0 0 0 0 rgba(212,175,55,.5) } 50% { box-shadow: 0 0 0 7px rgba(212,175,55,0) } }`}</style>
    </div>
  )
}
