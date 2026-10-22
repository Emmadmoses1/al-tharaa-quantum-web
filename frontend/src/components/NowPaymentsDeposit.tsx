import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, CheckCircle, Zap } from 'lucide-react'
import { api } from '../lib/api'
import { useSite } from '../lib/useSite'

type Created = { deposit_id: string; address: string; pay_amount: number | null; network: string; expires_at: string }
type St = { status: string; np_status: string | null; paid: number | null; expected: number | null }

const NETS = [
  { k: 'TRC20', l: 'TRON (TRC20)', hint: 'رسوم منخفضة' },
  { k: 'BEP20', l: 'BNB Chain (BEP20)', hint: 'سريع' },
  { k: 'ERC20', l: 'Ethereum (ERC20)', hint: 'رسوم أعلى' },
]
const card: React.CSSProperties = { background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 16, padding: 20, display: 'grid', gap: 14 }
const inp: React.CSSProperties = { width: '100%', background: 'rgba(11,11,11,0.6)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, padding: '13px 14px', color: '#fff', fontSize: 18, fontFamily: 'Montserrat', outline: 'none', boxSizing: 'border-box', direction: 'ltr' }
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', marginBottom: 6, display: 'block' }

const STEPS: Record<string, { t: string; c: string }> = {
  waiting: { t: 'بانتظار التحويل', c: '#9ca3af' }, confirming: { t: 'تم رصد التحويل، بانتظار التأكيد', c: '#6366f1' },
  confirmed: { t: 'تم التأكيد، جارٍ الإضافة', c: '#6366f1' }, sending: { t: 'جارٍ الإضافة', c: '#6366f1' },
  partially_paid: { t: 'المبلغ المحوّل أقل من المطلوب. تواصل مع الدعم', c: '#f59e0b' }, finished: { t: 'تمت إضافة الإيداع', c: '#10b981' },
  failed: { t: 'فشل الدفع', c: '#ef4444' }, expired: { t: 'انتهت صلاحية الطلب', c: '#6b7280' }, refunded: { t: 'تم الاسترداد', c: '#6b7280' },
}

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
  const timer = useRef<number | null>(null)

  const min = site?.payments?.min_usd ?? 10
  const max = site?.payments?.max_usd ?? 5000

  useEffect(() => {
    if (!pay) return
    const tick = async () => {
      try {
        const s = await api.get<St>(`/api/nowpayments/status/${pay.deposit_id}`)
        setSt(s)
        if (s.status === 'confirmed') {
          qc.invalidateQueries({ queryKey: ['wallet-balances'] })
          qc.invalidateQueries({ queryKey: ['deposits'] })
          return
        }
      } catch { /* keep polling */ }
      timer.current = window.setTimeout(tick, 6000)
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

  const step = STEPS[st?.np_status || 'waiting'] || STEPS.waiting
  const done = st?.status === 'confirmed'

  return (
    <div style={{ direction: 'rtl', maxWidth: 560, margin: '0 auto 20px' }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#D4AF37', fontFamily: 'Cairo', fontWeight: 800, fontSize: 18 }}><Zap size={18} />إيداع تلقائي بالعملات الرقمية</div>
        {!pay ? (
          <>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', lineHeight: 1.9 }}>ادفع USDT وتُضاف إلى رصيدك تلقائياً بعد التأكيد، بدون انتظار موافقة يدوية.</div>
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
            <div style={{ background: `${step.c}22`, border: `1px solid ${step.c}55`, color: step.c, padding: '10px 12px', borderRadius: 10, fontFamily: 'Cairo', fontWeight: 700, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
              {done && <CheckCircle size={16} />}{done ? STEPS.finished.t : step.t}
            </div>
            {!done && (
              <>
                <div>
                  <label style={lbl}>أرسل بالضبط</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...inp, fontWeight: 800, color: '#D4AF37' }} readOnly value={`${pay.pay_amount ?? amount} USDT`} />
                    <button type="button" className="btn-outline-gold" style={{ padding: '0 14px' }} onClick={() => copy(String(pay.pay_amount ?? amount), 'a')}>{copied === 'a' ? <CheckCircle size={16} /> : <Copy size={16} />}</button>
                  </div>
                </div>
                <div>
                  <label style={lbl}>إلى العنوان ({pay.network})</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...inp, fontSize: 12 }} readOnly value={pay.address} />
                    <button type="button" className="btn-outline-gold" style={{ padding: '0 14px' }} onClick={() => copy(pay.address, 'b')}>{copied === 'b' ? <CheckCircle size={16} /> : <Copy size={16} />}</button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#f59e0b', fontFamily: 'Cairo', lineHeight: 1.9 }}>أرسل USDT على شبكة {pay.network} فقط. التحويل بعملة أو شبكة أخرى يضيع ولا يمكن استرجاعه. ينتهي الطلب في {new Date(pay.expires_at).toLocaleString('en-GB')}.</div>
              </>
            )}
            {done ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to="/dashboard/invoices" className="btn-outline-gold" style={{ flex: 1, textAlign: 'center', padding: '12px 0', textDecoration: 'none' }}>الفاتورة</Link>
                <button type="button" className="btn-gold" style={{ flex: 1, padding: '12px 0' }} onClick={() => { setPay(null); setSt(null) }}>إيداع جديد</button>
              </div>
            ) : (
              <button type="button" className="btn-outline-gold" style={{ padding: '11px 0' }} onClick={() => { setPay(null); setSt(null) }}>إلغاء المتابعة</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
