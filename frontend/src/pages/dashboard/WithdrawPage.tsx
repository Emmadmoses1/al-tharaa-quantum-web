import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Shield, CheckCircle, Copy } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useWalletBalances } from '../../hooks/useWallet'
import { Skeleton } from '../../components/ui/Skeleton'

type Wd = {
  id: string; asset: string; network: string; amount: number; net_amount: number; status: string
  txid: string | null; admin_note: string | null; destination_address: string; created_at: string
}

const ASSETS = [
  { symbol: 'USDT', networks: ['TRC20', 'ERC20', 'BEP20'] },
  { symbol: 'BTC', networks: ['Bitcoin'] },
  { symbol: 'ETH', networks: ['ERC20'] },
  { symbol: 'USDC', networks: ['ERC20', 'BEP20'] },
]
const ADDRESS: Record<string, RegExp> = {
  TRC20: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
  ERC20: /^0x[0-9a-fA-F]{40}$/,
  BEP20: /^0x[0-9a-fA-F]{40}$/,
  Bitcoin: /^(bc1[a-z0-9]{25,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
}
const MIN: Record<string, number> = { USDT: 10, USDC: 10, BTC: 0.0005, ETH: 0.005 }
const STATUS: Record<string, { c: string; t: string }> = {
  pending: { c: '#f59e0b', t: 'قيد المراجعة' },
  approved: { c: '#6366f1', t: 'تمت الموافقة' },
  processing: { c: '#D4AF37', t: 'قيد التنفيذ' },
  completed: { c: '#10b981', t: 'تم الإرسال' },
  rejected: { c: '#ef4444', t: 'مرفوض' },
  cancelled: { c: '#6b7280', t: 'ملغي' },
}
const num = (v: number) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 8 })
const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'rgba(11,11,11,0.6)', border: '1px solid rgba(212,175,55,0.25)',
  borderRadius: 10, padding: '13px 14px', color: '#fff', fontSize: 16, fontFamily: 'Montserrat', outline: 'none', direction: 'ltr',
}
const lbl: React.CSSProperties = { display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', marginBottom: 8 }

function Badge({ s }: { s: string }) {
  const x = STATUS[s] || STATUS.pending
  return <span style={{ background: x.c + '1a', color: x.c, fontSize: 11, fontWeight: 700, fontFamily: 'Cairo', padding: '4px 10px', borderRadius: 6 }}><span>{x.t}</span></span>
}

export default function WithdrawPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const wallet = useWalletBalances()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [wType, setWType] = useState<'trading' | 'investment_redemption' | null>(null)
  const [asset, setAsset] = useState<string | null>(null)
  const [network, setNetwork] = useState<string | null>(null)
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const ledger = wType === 'trading' ? 'trading' : 'investment'
  const assets = wType === 'trading' ? ASSETS.filter(a => a.symbol === 'USDT') : ASSETS
  const selected = ASSETS.find(a => a.symbol === asset)
  const balance = wallet.data?.find(w => w.ledger_type === ledger && w.asset === asset)?.balance ?? 0
  const amt = parseFloat(amount) || 0
  const min = asset ? MIN[asset] : 0
  const fee = amt * 0.001
  const addr = address.trim()
  const addrOk = !!network && ADDRESS[network]?.test(addr)
  const amountOk = amt >= min && amt <= balance
  const canNext = !!asset && !!network && addrOk && amountOk

  const hist = useQuery({
    queryKey: ['wd-hist', user?.id], enabled: !!user?.id, staleTime: 0, refetchInterval: 20000,
    queryFn: async () => {
      const { data } = await supabase.from('withdrawals').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10)
      return (data || []) as Wd[]
    },
  })
  const hasOpen = !!hist.data?.some(w => ['pending', 'approved', 'processing'].includes(w.status))

  async function submit() {
    if (!wType || !asset || !network || !canNext) return
    setBusy(true); setError(null)
    try {
      await api.post('/api/withdrawals', { withdrawal_type: wType, asset, network, amount: amt, destination_address: addr })
      await supabase.from('notifications').insert({
        user_id: user?.id, type: 'withdrawal', title: 'طلب سحب مقدّم', title_ar: 'طلب سحب مقدّم',
        message: `طلب سحبك بقيمة ${amt} ${asset} قيد المراجعة.`, message_ar: `طلب سحبك بقيمة ${amt} ${asset} قيد المراجعة.`,
      })
      qc.invalidateQueries({ queryKey: ['wd-hist'] })
      qc.invalidateQueries({ queryKey: ['wallet-balances'] })
      setStep(4)
    } catch (e) {
      const m = e instanceof Error ? e.message : ''
      setError(/failed to fetch|networkerror/i.test(m) ? 'تعذر الاتصال بالخادم. تأكد أن الـ backend يعمل ثم حاول مجدداً.' : m || 'فشل تقديم الطلب')
    }
    setBusy(false)
  }

  async function cancel(id: string) {
    if (!window.confirm('إلغاء طلب السحب؟')) return
    try { await api.post(`/api/withdrawals/${id}/cancel`, {}); hist.refetch() } catch (e) { setError(e instanceof Error ? e.message : 'تعذر الإلغاء') }
  }

  function reset() { setStep(1); setWType(null); setAsset(null); setNetwork(null); setAddress(''); setAmount(''); setError(null) }
  function copy(t: string) { navigator.clipboard?.writeText(t).catch(() => {}); setCopied(t); setTimeout(() => setCopied(null), 1800) }

  const h2: React.CSSProperties = { fontSize: 17, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', marginBottom: 16 }

  return (
    <div style={{ direction: 'rtl', maxWidth: 560, margin: '0 auto' }} translate="no" className="notranslate">
      <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}><span>سحب الأصول</span></h1>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', marginBottom: 20 }}><span>سحب العملات المشفرة إلى محفظتك الخارجية</span></p>

      <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 22, display: 'flex', gap: 10 }}>
        <Shield size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: 12, color: 'rgba(239,68,68,0.9)', fontFamily: 'Cairo', lineHeight: 1.8 }}>
          تحقق من عنوان المحفظة والشبكة بعناية، فمعاملات البلوكتشين لا يمكن عكسها. تخضع الطلبات للمراجعة قبل التنفيذ، ويمكنك إلغاء الطلب قبل مراجعته.
        </span>
      </div>

      {error && <div role="alert" style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 10, fontSize: 13, fontFamily: 'Cairo', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}><span>{error}</span></div>}

      {step === 1 && (
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={h2}><span>من أي محفظة تريد السحب؟</span></h2>
          {hasOpen && <div style={{ marginBottom: 14, fontSize: 12, color: '#f59e0b', fontFamily: 'Cairo', lineHeight: 1.8 }}><span>لديك طلب سحب قيد المعالجة. لا يمكن تقديم طلب جديد قبل انتهائه أو إلغائه.</span></div>}
          <div style={{ display: 'grid', gap: 12 }}>
            {([['trading', 'محفظة التداول', 'رصيد التداول (USDT)'], ['investment_redemption', 'محفظة الاستثمار', 'رصيد الاستثمار']] as const).map(([k, t, d]) => (
              <button key={k} type="button" disabled={hasOpen} onClick={() => { setWType(k); setAsset(k === 'trading' ? 'USDT' : null); setNetwork(null); setStep(2) }}
                style={{ background: 'rgba(44,44,44,0.3)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 12, padding: '16px 18px', cursor: hasOpen ? 'not-allowed' : 'pointer', opacity: hasOpen ? 0.5 : 1, textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'Cairo', marginBottom: 4 }}><span>{t}</span></div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo' }}><span>{d}</span></div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={h2}><span>تفاصيل السحب</span></h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {assets.map(a => (
              <button key={a.symbol} type="button" onClick={() => { setAsset(a.symbol); setNetwork(a.networks.length === 1 ? a.networks[0] : null) }}
                style={{ background: asset === a.symbol ? 'rgba(212,175,55,0.1)' : 'rgba(44,44,44,0.3)', border: `1px solid ${asset === a.symbol ? '#D4AF37' : 'rgba(212,175,55,0.12)'}`, borderRadius: 10, padding: 12, cursor: 'pointer', color: asset === a.symbol ? '#D4AF37' : '#fff', fontWeight: 700, fontFamily: 'Montserrat' }}>{a.symbol}</button>
            ))}
          </div>
          {selected && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {selected.networks.map(nw => (
                <button key={nw} type="button" onClick={() => setNetwork(nw)}
                  style={{ background: network === nw ? 'rgba(212,175,55,0.1)' : 'rgba(44,44,44,0.3)', border: `1px solid ${network === nw ? '#D4AF37' : 'rgba(212,175,55,0.12)'}`, borderRadius: 8, padding: '9px 16px', cursor: 'pointer', color: network === nw ? '#D4AF37' : 'rgba(255,255,255,0.6)', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13 }}>{nw}</button>
              ))}
            </div>
          )}
          {asset && network && (
            <>
              <label htmlFor="wd-addr" style={lbl}><span>عنوان المحفظة ({network})</span></label>
              <input id="wd-addr" value={address} onChange={e => setAddress(e.target.value)} dir="ltr" autoComplete="off" placeholder={network === 'TRC20' ? 'T...' : network === 'Bitcoin' ? 'bc1...' : '0x...'} style={{ ...field, fontSize: 14 }} />
              <div style={{ fontSize: 11, margin: '6px 0 14px', fontFamily: 'Cairo', color: addr && !addrOk ? '#ef4444' : 'rgba(255,255,255,0.35)' }}>
                <span>{addr && !addrOk ? `العنوان غير صالح لشبكة ${network}` : addr ? 'صيغة العنوان صحيحة' : ''}</span>
              </div>

              <label htmlFor="wd-amt" style={lbl}><span>المبلغ ({asset})</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input id="wd-amt" type="text" inputMode="decimal" dir="ltr" autoComplete="off" value={amount} placeholder="0.00"
                  onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))} style={{ ...field, flex: 1 }} />
                <button type="button" onClick={() => setAmount(String(balance))} className="btn-outline-gold" style={{ fontSize: 12, padding: '0 14px' }}><span>الأقصى</span></button>
              </div>
              <div style={{ fontSize: 11, marginTop: 6, fontFamily: 'Cairo', color: amount && !amountOk ? '#ef4444' : 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>
                <span>المتاح: {num(balance)} {asset} · الحد الأدنى: {min} {asset}</span>
              </div>
              {amt > 0 && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(44,44,44,0.25)', borderRadius: 8, fontSize: 12, fontFamily: 'Cairo', color: 'rgba(255,255,255,0.6)', lineHeight: 2 }}>
                  <div><span>الرسوم (0.1%): </span><b style={{ fontFamily: 'Montserrat', direction: 'ltr', display: 'inline-block' }}>{num(fee)} {asset}</b></div>
                  <div><span>ستستلم: </span><b style={{ color: '#D4AF37', fontFamily: 'Montserrat', direction: 'ltr', display: 'inline-block' }}>{num(amt - fee)} {asset}</b></div>
                </div>
              )}
            </>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button type="button" onClick={() => setStep(1)} className="btn-outline-gold" style={{ flex: 1, fontSize: 13 }}><span>رجوع</span></button>
            <button type="button" onClick={() => setStep(3)} disabled={!canNext} className="btn-gold" style={{ flex: 1, fontSize: 13, opacity: canNext ? 1 : 0.5 }}><span>متابعة</span></button>
          </div>
        </div>
      )}

      {step === 3 && asset && network && (
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={h2}><span>تأكيد طلب السحب</span></h2>
          {[['الأصل', `${asset} (${network})`], ['المبلغ', `${num(amt)} ${asset}`], ['الرسوم', `${num(fee)} ${asset}`], ['ستستلم', `${num(amt - fee)} ${asset}`]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(212,175,55,0.08)', fontFamily: 'Cairo', fontSize: 13 }}>
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>{k}</span><span style={{ color: '#fff', fontFamily: 'Montserrat', direction: 'ltr' }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', marginBottom: 6 }}><span>إلى العنوان</span></div>
          <div style={{ padding: '12px 14px', background: 'rgba(11,11,11,0.5)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, fontFamily: 'Montserrat', fontSize: 12, wordBreak: 'break-all', direction: 'ltr', textAlign: 'left', color: '#fff' }}>{addr}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button type="button" onClick={() => setStep(2)} disabled={busy} className="btn-outline-gold" style={{ flex: 1, fontSize: 13 }}><span>تعديل</span></button>
            <button type="button" onClick={submit} disabled={busy} className="btn-gold" style={{ flex: 1, fontSize: 13, opacity: busy ? 0.6 : 1 }}><span>{busy ? 'جارٍ الإرسال...' : 'تأكيد السحب'}</span></button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="glass-card" style={{ padding: 28, textAlign: 'center' }}>
          <CheckCircle size={44} color="#10b981" />
          <h2 style={{ ...h2, marginTop: 12, marginBottom: 8 }}><span>تم تقديم طلب السحب</span></h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', lineHeight: 1.9, marginBottom: 18 }}><span>سيراجع الفريق الطلب وتصلك إشعارات عند كل تحديث. تابع حالته أدناه.</span></p>
          <button type="button" onClick={reset} className="btn-outline-gold" style={{ fontSize: 13 }}><span>طلب جديد</span></button>
        </div>
      )}

      <div style={{ marginTop: 30 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Cairo', marginBottom: 10 }}><span>طلبات السحب</span></div>
        {hist.isLoading ? <Skeleton height={64} borderRadius={10} /> : !hist.data?.length ? (
          <div style={{ textAlign: 'center', padding: 22, color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: 'Cairo' }}><span>لا توجد طلبات سحب</span></div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {hist.data.map(w => (
              <div key={w.id} style={{ padding: '12px 14px', background: 'rgba(44,44,44,0.25)', border: '1px solid rgba(212,175,55,0.08)', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#fff', fontFamily: 'Montserrat', fontWeight: 600, direction: 'ltr', textAlign: 'right' }}>{num(w.amount)} {w.asset} · {w.network}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat' }}>{new Date(w.created_at).toLocaleDateString('en-GB')}</div>
                  </div>
                  <Badge s={w.status} />
                </div>
                {w.status === 'completed' && w.txid && (
                  <button type="button" onClick={() => copy(w.txid!)} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#D4AF37', fontFamily: 'Montserrat', fontSize: 11, display: 'flex', gap: 6, alignItems: 'center', direction: 'ltr', wordBreak: 'break-all', textAlign: 'left' }}>
                    <Copy size={12} /><span>{copied === w.txid ? 'Copied' : w.txid}</span>
                  </button>
                )}
                {w.status === 'rejected' && w.admin_note && <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444', fontFamily: 'Cairo' }}><span>السبب: {w.admin_note}</span></div>}
                {w.status === 'pending' && <button type="button" onClick={() => cancel(w.id)} className="btn-outline-gold" style={{ marginTop: 10, fontSize: 12, width: '100%' }}><span>إلغاء الطلب</span></button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
