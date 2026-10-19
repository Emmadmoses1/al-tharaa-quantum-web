import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, CheckCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { Skeleton } from '../../components/ui/Skeleton'

type Dep = {
  id: string; asset: string; network: string; purpose: string; wallet_address: string
  requested_amount: number | null; payable_amount: number | null; amount: number | null
  status: string; confirmations: number; required_confirmations: number
  txid: string | null; expires_at: string | null; created_at: string
}

const ASSETS = [
  { symbol: 'USDT', name: 'Tether USD', networks: ['TRC20', 'ERC20', 'BEP20'] },
  { symbol: 'BTC', name: 'Bitcoin', networks: ['Bitcoin'] },
  { symbol: 'ETH', name: 'Ethereum', networks: ['ERC20'] },
  { symbol: 'USDC', name: 'USD Coin', networks: ['ERC20', 'BEP20'] },
]
const OPEN = ['awaiting_payment', 'detected', 'confirming']
const STATUS: Record<string, { color: string; label: string }> = {
  awaiting_payment: { color: '#9ca3af', label: 'في انتظار الدفع' },
  detected: { color: '#f59e0b', label: 'تم رصد التحويل' },
  confirming: { color: '#6366f1', label: 'جارٍ التأكيد' },
  confirmed: { color: '#10b981', label: 'تمت الإضافة لرصيدك' },
  failed: { color: '#ef4444', label: 'فشل' },
  expired: { color: '#6b7280', label: 'منتهي' },
  rejected: { color: '#ef4444', label: 'مرفوض' },
}

function Badge({ status }: { status: string }) {
  const s = STATUS[status] || STATUS.awaiting_payment
  return (
    <span style={{ background: s.color + '1a', color: s.color, fontSize: 11, fontWeight: 700, fontFamily: 'Cairo', padding: '4px 10px', borderRadius: 6 }}>
      <span>{s.label}</span>
    </span>
  )
}

const fmt = (n: number | null | undefined) => (n == null ? '—' : String(Number(n)))
const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'rgba(11,11,11,0.6)', border: '1px solid rgba(212,175,55,0.25)',
  borderRadius: 10, padding: '13px 14px', color: '#fff', fontSize: 16, fontFamily: 'Montserrat', outline: 'none', direction: 'ltr',
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button" onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); setDone(true); setTimeout(() => setDone(false), 2000) }}
      style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: done ? '#10b981' : '#D4AF37', fontSize: 12, fontFamily: 'Cairo', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      {done ? <CheckCircle size={14} /> : <Copy size={14} />}
      <span>{done ? 'تم' : label}</span>
    </button>
  )
}

export default function DepositPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [purpose, setPurpose] = useState<'investment' | 'trading' | null>(null)
  const [asset, setAsset] = useState<string | null>(null)
  const [network, setNetwork] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [txid, setTxid] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const assets = purpose === 'trading' ? ASSETS.filter(a => a.symbol === 'USDT') : ASSETS
  const selected = ASSETS.find(a => a.symbol === asset)

  const minQ = useQuery({
    queryKey: ['dep-min', asset, network],
    enabled: !!asset && !!network,
    queryFn: async () => {
      const { data } = await supabase.from('deposit_addresses').select('minimum_deposit').eq('asset', asset!).eq('network', network!).eq('status', 'active').maybeSingle()
      return data ? Number(data.minimum_deposit) : null
    },
  })

  const openQ = useQuery({
    queryKey: ['dep-open', user?.id], enabled: !!user?.id, staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase.from('deposits').select('*').eq('user_id', user!.id).in('status', OPEN)
        .gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false })
      return (data || []) as Dep[]
    },
  })

  const liveQ = useQuery({
    queryKey: ['dep-live', activeId], enabled: !!activeId, staleTime: 0,
    refetchInterval: q => (q.state.data && !OPEN.includes((q.state.data as Dep).status) ? false : 8000),
    queryFn: async () => {
      const { data, error } = await supabase.from('deposits').select('*').eq('id', activeId!).single()
      if (error) throw error
      return data as Dep
    },
  })
  const dep = liveQ.data

  const histQ = useQuery({
    queryKey: ['dep-hist', user?.id], enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from('deposits').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10)
      return (data || []) as Dep[]
    },
  })

  function say(ok: boolean, text: string) {
    setNotice({ ok, text })
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch { /* ignore */ }
  }
  function errText(e: unknown) {
    const m = e instanceof Error ? e.message : ''
    if (/failed to fetch|networkerror/i.test(m)) return 'تعذر الاتصال بالخادم. تأكد أن الـ backend يعمل ثم حاول مجدداً.'
    return m || 'حدث خطأ غير متوقع'
  }
  function resetFlow() {
    setStep(1); setPurpose(null); setAsset(null); setNetwork(null); setAmount(''); setActiveId(null); setTxid(''); setNotice(null)
    qc.invalidateQueries({ queryKey: ['dep-open'] })
  }

  const amt = Number(amount)
  const min = minQ.data ?? 0
  const amountOk = amt > 0 && amt >= min

  async function createDeposit() {
    if (!asset || !network || !purpose || !amountOk) return
    setBusy(true); setNotice(null)
    try {
      const d = await api.post<Dep>('/api/deposits', { asset, network, purpose, amount: amt })
      setActiveId(d.id); setStep(3)
      qc.invalidateQueries({ queryKey: ['dep-open'] })
    } catch (e) { say(false, errText(e)) }
    setBusy(false)
  }

  async function sendTxid() {
    if (!dep || !txid.trim()) return
    setBusy(true)
    try {
      await api.patch(`/api/deposits/${dep.id}/txid`, { txid: txid.trim() })
      setTxid(''); say(true, 'تم حفظ رقم المعاملة. سيتم التحقق منها تلقائياً.')
      liveQ.refetch()
    } catch (e) { say(false, errText(e)) }
    setBusy(false)
  }

  async function cancelDeposit() {
    if (!dep) return
    setBusy(true)
    try { await api.post(`/api/deposits/${dep.id}/cancel`, {}); resetFlow() } catch (e) { say(false, errText(e)) }
    setBusy(false)
  }

  function resume(d: Dep) {
    setPurpose(d.purpose as 'investment' | 'trading'); setAsset(d.asset); setNetwork(d.network); setActiveId(d.id); setStep(3)
  }

  const card: React.CSSProperties = { padding: 24 }
  const h2: React.CSSProperties = { fontSize: 17, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }
  const sub: React.CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', marginBottom: 18, lineHeight: 1.8 }
  const done = dep?.status === 'confirmed'

  return (
    <div style={{ direction: 'rtl', maxWidth: 600, margin: '0 auto' }} translate="no" className="notranslate">
      <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}><span>إيداع الأصول</span></h1>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', marginBottom: 22 }}><span>يُضاف الرصيد تلقائياً بعد رصد التحويل وتأكيده على الشبكة</span></p>

      {notice && (
        <div role="alert" style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 10, fontSize: 13, fontFamily: 'Cairo', lineHeight: 1.7,
          background: notice.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: '1px solid ' + (notice.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'), color: notice.ok ? '#10b981' : '#ef4444' }}>
          <span>{notice.text}</span>
        </div>
      )}

      {step !== 3 && (openQ.data?.length ?? 0) > 0 && (
        <div className="glass-card" style={{ ...card, marginBottom: 16 }}>
          <div style={{ ...h2, fontSize: 14 }}><span>لديك طلبات إيداع نشطة</span></div>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {openQ.data!.map(d => (
              <button key={d.id} type="button" onClick={() => resume(d)} style={{ background: 'rgba(44,44,44,0.3)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#D4AF37', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, direction: 'ltr' }}>{fmt(d.payable_amount)} {d.asset}</span>
                <Badge status={d.status} />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="glass-card" style={card}>
          <h2 style={h2}><span>ما الذي تريد تمويله؟</span></h2>
          <p style={sub}><span>رصيد الاستثمار ورصيد التداول منفصلان</span></p>
          <div style={{ display: 'grid', gap: 12 }}>
            {([['investment', 'محفظة الاستثمار', 'للاستثمار في الفرص والصناديق'], ['trading', 'محفظة التداول الذكي', 'للتداول على إشارات الذكاء الاصطناعي (USDT)']] as const).map(([k, t, d]) => (
              <button key={k} type="button" onClick={() => { setPurpose(k); setAsset(null); setNetwork(null); setStep(2) }}
                style={{ background: 'rgba(44,44,44,0.3)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'Cairo', marginBottom: 4 }}><span>{t}</span></div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo' }}><span>{d}</span></div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="glass-card" style={card}>
          <h2 style={h2}><span>الأصل والشبكة والمبلغ</span></h2>
          <p style={sub}><span>{purpose === 'trading' ? 'محفظة التداول تقبل USDT فقط' : 'اختر العملة التي سترسلها'}</span></p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            {assets.map(a => (
              <button key={a.symbol} type="button" onClick={() => { setAsset(a.symbol); setNetwork(a.networks.length === 1 ? a.networks[0] : null) }}
                style={{ background: asset === a.symbol ? 'rgba(212,175,55,0.1)' : 'rgba(44,44,44,0.3)', border: `1px solid ${asset === a.symbol ? '#D4AF37' : 'rgba(212,175,55,0.12)'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: asset === a.symbol ? '#D4AF37' : '#fff', fontFamily: 'Montserrat' }}>{a.symbol}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}><span>{a.name}</span></div>
              </button>
            ))}
          </div>

          {selected && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
              {selected.networks.map(n => (
                <button key={n} type="button" onClick={() => setNetwork(n)}
                  style={{ background: network === n ? 'rgba(212,175,55,0.1)' : 'rgba(44,44,44,0.3)', border: `1px solid ${network === n ? '#D4AF37' : 'rgba(212,175,55,0.12)'}`, borderRadius: 8, padding: '9px 16px', cursor: 'pointer', color: network === n ? '#D4AF37' : 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Montserrat', fontWeight: 600 }}>{n}</button>
              ))}
            </div>
          )}

          {asset && network && (
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="dep-amount" style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', marginBottom: 8 }}>
                <span>المبلغ الذي ستودعه ({asset})</span>
              </label>
              <input id="dep-amount" type="text" inputMode="decimal" dir="ltr" autoComplete="off" value={amount} placeholder="0.00"
                onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))} style={field} />
              <div style={{ fontSize: 11, marginTop: 7, fontFamily: 'Cairo', color: amount && !amountOk ? '#ef4444' : 'rgba(255,255,255,0.35)' }}>
                <span>{minQ.isLoading ? '...' : min > 0 ? `الحد الأدنى ${min} ${asset}` : 'أدخل المبلغ بالضبط كما ستحوله'}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={() => setStep(1)} className="btn-outline-gold" style={{ flex: 1, fontSize: 13 }}><span>رجوع</span></button>
            <button type="button" onClick={createDeposit} disabled={!amountOk || !network || busy} className="btn-gold"
              style={{ flex: 1, fontSize: 13, opacity: !amountOk || !network || busy ? 0.5 : 1 }}>
              <span>{busy ? 'جارٍ الإنشاء...' : 'متابعة'}</span>
            </button>
          </div>
        </div>
      )}

      {step === 3 && !dep && <Skeleton height={260} borderRadius={14} />}

      {step === 3 && dep && (
        <div style={{ display: 'grid', gap: 16 }}>
          {done ? (
            <div className="glass-card" style={{ ...card, textAlign: 'center' }}>
              <CheckCircle size={44} color="#10b981" />
              <h2 style={{ ...h2, marginTop: 12, fontSize: 20 }}><span>تمت إضافة الإيداع إلى رصيدك</span></h2>
              <div style={{ color: '#D4AF37', fontFamily: 'Montserrat', fontWeight: 800, fontSize: 24, direction: 'ltr', margin: '8px 0 18px' }}>{fmt(dep.amount)} {dep.asset}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Link to={dep.purpose === 'trading' ? '/dashboard/signals' : '/dashboard'} className="btn-gold" style={{ flex: 1, textDecoration: 'none', fontSize: 13, textAlign: 'center' }}><span>{dep.purpose === 'trading' ? 'ابدأ التداول' : 'لوحة التحكم'}</span></Link>
                <button type="button" onClick={resetFlow} className="btn-outline-gold" style={{ flex: 1, fontSize: 13 }}><span>إيداع جديد</span></button>
              </div>
            </div>
          ) : (
            <>
              <div className="glass-card" style={card}>
                <div style={{ display: 'flex', gap: 10, padding: '11px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, marginBottom: 18 }}>
                  <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 12, color: 'rgba(245,158,11,0.95)', fontFamily: 'Cairo', lineHeight: 1.8 }}>
                    أرسل <strong>{dep.asset}</strong> عبر شبكة <strong>{dep.network}</strong> فقط، وبالمبلغ المحدد أدناه بالضبط. المبلغ يحتوي على كسر صغير يميّز طلبك، وبه تُضاف الأموال لحسابك تلقائياً.
                  </span>
                </div>

                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', marginBottom: 6 }}><span>المبلغ المطلوب إرساله بالضبط</span></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'rgba(11,11,11,0.5)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#D4AF37', fontFamily: 'Montserrat', direction: 'ltr', wordBreak: 'break-all' }}>{fmt(dep.payable_amount)} {dep.asset}</span>
                  <CopyBtn text={fmt(dep.payable_amount)} label="نسخ" />
                </div>

                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ background: '#fff', borderRadius: 12, padding: 10, display: 'inline-block' }}>
                    <QRCodeSVG value={dep.wallet_address} size={140} />
                  </div>
                </div>

                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', marginBottom: 6 }}><span>عنوان المحفظة</span></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'rgba(11,11,11,0.5)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'Montserrat', wordBreak: 'break-all', direction: 'ltr', textAlign: 'left' }}>{dep.wallet_address}</span>
                  <CopyBtn text={dep.wallet_address} label="نسخ" />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(44,44,44,0.2)', border: '1px solid rgba(212,175,55,0.08)', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {dep.status === 'awaiting_payment' ? <Clock size={13} /> : <RefreshCw size={13} />}
                    <span>الحالة{dep.status === 'confirming' ? ` (${dep.confirmations}/${dep.required_confirmations})` : ''}</span>
                  </span>
                  <Badge status={dep.status} />
                </div>
                {dep.expires_at && OPEN.includes(dep.status) && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo', marginTop: 10 }}>
                    <span>ينتهي الطلب: {new Date(dep.expires_at).toLocaleString('en-GB')}</span>
                  </div>
                )}
              </div>

              {dep.status === 'awaiting_payment' && (
                <div className="glass-card" style={card}>
                  <h3 style={{ ...h2, fontSize: 14 }}><span>رقم المعاملة (اختياري)</span></h3>
                  <p style={sub}><span>لا حاجة له عادةً، فالنظام يرصد التحويل بنفسه. أضفه فقط لتسريع التطابق.</span></p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input value={txid} onChange={e => setTxid(e.target.value)} dir="ltr" placeholder="0x... / txid" style={{ ...field, fontSize: 13, flex: 1 }} />
                    <button type="button" onClick={sendTxid} disabled={!txid.trim() || busy} className="btn-gold" style={{ fontSize: 12, padding: '10px 16px', opacity: !txid.trim() || busy ? 0.5 : 1 }}><span>إرسال</span></button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                {dep.status === 'awaiting_payment' && !dep.txid && (
                  <button type="button" onClick={cancelDeposit} disabled={busy} className="btn-outline-gold" style={{ flex: 1, fontSize: 13 }}><span>إلغاء الطلب</span></button>
                )}
                <button type="button" onClick={resetFlow} className="btn-outline-gold" style={{ flex: 1, fontSize: 13 }}><span>رجوع</span></button>
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ marginTop: 30 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Cairo', marginBottom: 10 }}><span>آخر الإيداعات</span></div>
        {histQ.isLoading ? <Skeleton height={60} borderRadius={10} /> : !histQ.data?.length ? (
          <div style={{ textAlign: 'center', padding: 22, color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: 'Cairo' }}><span>لا توجد إيداعات سابقة</span></div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {histQ.data.map(d => (
              <div key={d.id} style={{ padding: '12px 14px', background: 'rgba(44,44,44,0.25)', border: '1px solid rgba(212,175,55,0.08)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#fff', fontFamily: 'Montserrat', fontWeight: 600, direction: 'ltr', textAlign: 'right' }}>{fmt(d.amount ?? d.payable_amount)} {d.asset} · {d.network}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat' }}>{new Date(d.created_at).toLocaleDateString('en-GB')}</div>
                </div>
                <Badge status={d.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
