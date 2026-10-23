import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Shield, CheckCircle, Copy, ArrowUpFromLine, Wallet, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useWalletBalances } from '../../hooks/useWallet'
import { Skeleton } from '../../components/ui/Skeleton'
import { PageStyles, PageHeader, Steps, Pill, Empty } from '../../components/PageKit'

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

  const balText = (l: 'trading' | 'investment') => {
    const rows = (wallet.data || []).filter(w => w.ledger_type === l && Number(w.balance) > 0)
    return rows.length ? rows.map(w => `${num(w.balance)} ${w.asset}`).join(' · ') : '0'
  }

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
      setError(/failed to fetch|networkerror/i.test(m) ? 'تعذر الاتصال بالخادم. حاول مجدداً بعد قليل.' : m || 'فشل تقديم الطلب')
    }
    setBusy(false)
  }

  async function cancel(id: string) {
    if (!window.confirm('إلغاء طلب السحب؟')) return
    try { await api.post(`/api/withdrawals/${id}/cancel`, {}); hist.refetch() } catch (e) { setError(e instanceof Error ? e.message : 'تعذر الإلغاء') }
  }

  function reset() { setStep(1); setWType(null); setAsset(null); setNetwork(null); setAddress(''); setAmount(''); setError(null) }
  function copy(t: string) { navigator.clipboard?.writeText(t).catch(() => {}); setCopied(t); setTimeout(() => setCopied(null), 1800) }

  return (
    <div style={{ direction: 'rtl', maxWidth: 600, margin: '0 auto' }} translate="no" className="notranslate">
      <PageStyles />
      <PageHeader icon={<ArrowUpFromLine size={22} color="#D4AF37" />} title="سحب الأصول" sub="أرسل أرباحك إلى محفظتك الخارجية" />
      <Steps labels={['المحفظة', 'التفاصيل', 'التأكيد', 'تم']} current={step} />

      <div className="pk-note" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.92)', marginBottom: 18 }}>
        <Shield size={16} style={{ flexShrink: 0, marginTop: 3 }} />
        <span>تحقق من عنوان المحفظة والشبكة بعناية، فمعاملات البلوكتشين لا يمكن عكسها. تخضع الطلبات للمراجعة قبل التنفيذ ويمكنك إلغاء الطلب قبل مراجعته.</span>
      </div>

      {error && <div role="alert" className="pk-note" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', marginBottom: 14 }}>{error}</div>}

      {step === 1 && (
        <div className="pk-panel">
          <h2 className="pk-h2">من أي محفظة تريد السحب؟</h2>
          {hasOpen && <div className="pk-note" style={{ background: 'rgba(245,158,11,0.07)', color: '#f59e0b', marginBottom: 12 }}>لديك طلب سحب قيد المعالجة. لا يمكن تقديم طلب جديد قبل انتهائه أو إلغائه.</div>}
          <div style={{ display: 'grid', gap: 12 }}>
            {([['trading', 'محفظة التداول', 'trading', <TrendingUp key="t" size={20} color="#D4AF37" />], ['investment_redemption', 'محفظة الاستثمار', 'investment', <Wallet key="w" size={20} color="#D4AF37" />]] as const).map(([k, t, l, ic]) => (
              <button key={k} type="button" className="pk-opt" disabled={hasOpen}
                onClick={() => { setWType(k); setAsset(k === 'trading' ? 'USDT' : null); setNetwork(null); setStep(2) }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
                <span className="pk-ico" style={{ width: 42, height: 42 }}>{ic}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontFamily: 'Cairo', fontSize: 15, marginBottom: 3 }}>{t}</span>
                  <span className="pk-mono" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{wallet.isLoading ? '...' : balText(l)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="pk-panel">
          <h2 className="pk-h2">تفاصيل السحب</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 10, marginBottom: 16 }}>
            {assets.map(a => (
              <button key={a.symbol} type="button" className={`pk-opt ${asset === a.symbol ? 'sel' : ''}`} style={{ textAlign: 'center' }}
                onClick={() => { setAsset(a.symbol); setNetwork(a.networks.length === 1 ? a.networks[0] : null) }}>{a.symbol}</button>
            ))}
          </div>
          {selected && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
              {selected.networks.map(nw => (
                <button key={nw} type="button" className={`pk-opt ${network === nw ? 'sel' : ''}`} style={{ padding: '9px 16px', fontSize: 13 }} onClick={() => setNetwork(nw)}>{nw}</button>
              ))}
            </div>
          )}
          {asset && network && (
            <>
              <label htmlFor="wd-addr" className="pk-lbl">عنوان المحفظة ({network})</label>
              <input id="wd-addr" className="pk-input" value={address} onChange={e => setAddress(e.target.value)} dir="ltr" autoComplete="off"
                placeholder={network === 'TRC20' ? 'T...' : network === 'Bitcoin' ? 'bc1...' : '0x...'} style={{ fontSize: 14 }} />
              <div style={{ fontSize: 11, margin: '6px 0 16px', fontFamily: 'Cairo', minHeight: 16, color: addr && !addrOk ? '#ef4444' : '#10b981' }}>
                {addr && !addrOk ? `العنوان غير صالح لشبكة ${network}` : addr ? 'صيغة العنوان صحيحة' : ''}
              </div>

              <label htmlFor="wd-amt" className="pk-lbl">المبلغ ({asset})</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input id="wd-amt" className="pk-input" type="text" inputMode="decimal" dir="ltr" autoComplete="off" value={amount} placeholder="0.00"
                  onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))} style={{ flex: 1 }} />
                <button type="button" onClick={() => setAmount(String(balance))} className="btn-outline-gold" style={{ fontSize: 12, padding: '0 16px' }}>الأقصى</button>
              </div>
              <div style={{ fontSize: 11, marginTop: 6, fontFamily: 'Cairo', color: amount && !amountOk ? '#ef4444' : 'rgba(255,255,255,0.45)', lineHeight: 1.8 }}>
                المتاح: <span className="pk-mono">{num(balance)} {asset}</span> · الحد الأدنى: <span className="pk-mono">{min} {asset}</span>
              </div>
              {amt > 0 && (
                <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 10, fontSize: 12, fontFamily: 'Cairo', color: 'rgba(255,255,255,0.6)', lineHeight: 2 }}>
                  <div>الرسوم (0.1%): <b className="pk-mono">{num(fee)} {asset}</b></div>
                  <div>ستستلم: <b className="pk-mono" style={{ color: '#D4AF37' }}>{num(amt - fee)} {asset}</b></div>
                </div>
              )}
            </>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
            <button type="button" onClick={() => setStep(1)} className="btn-outline-gold" style={{ flex: 1, fontSize: 13 }}>رجوع</button>
            <button type="button" onClick={() => setStep(3)} disabled={!canNext} className="btn-gold" style={{ flex: 1, fontSize: 13, opacity: canNext ? 1 : 0.5 }}>متابعة</button>
          </div>
        </div>
      )}

      {step === 3 && asset && network && (
        <div className="pk-panel">
          <h2 className="pk-h2">تأكيد طلب السحب</h2>
          {[['الأصل', `${asset} (${network})`], ['المبلغ', `${num(amt)} ${asset}`], ['الرسوم', `${num(fee)} ${asset}`], ['ستستلم', `${num(amt - fee)} ${asset}`]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid rgba(212,175,55,0.08)', fontFamily: 'Cairo', fontSize: 13 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{k}</span>
              <span className="pk-mono" style={{ color: k === 'ستستلم' ? '#D4AF37' : '#fff', fontWeight: 700 }}>{v}</span>
            </div>
          ))}
          <div className="pk-lbl" style={{ marginTop: 16 }}>إلى العنوان</div>
          <div style={{ padding: '12px 14px', background: 'rgba(11,11,11,0.6)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 12, fontFamily: 'Montserrat', fontSize: 12, wordBreak: 'break-all', direction: 'ltr', textAlign: 'left', color: '#fff' }}>{addr}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
            <button type="button" onClick={() => setStep(2)} disabled={busy} className="btn-outline-gold" style={{ flex: 1, fontSize: 13 }}>تعديل</button>
            <button type="button" onClick={submit} disabled={busy} className="btn-gold" style={{ flex: 1, fontSize: 13, opacity: busy ? 0.6 : 1 }}>{busy ? 'جارٍ الإرسال...' : 'تأكيد السحب'}</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="pk-panel" style={{ textAlign: 'center', padding: 30 }}>
          <CheckCircle size={48} color="#10b981" />
          <h2 className="pk-h2" style={{ marginTop: 12, marginBottom: 8 }}>تم تقديم طلب السحب</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', lineHeight: 1.9, margin: '0 0 18px' }}>سيراجع الفريق الطلب وتصلك إشعارات عند كل تحديث. تابع حالته أدناه.</p>
          <button type="button" onClick={reset} className="btn-outline-gold" style={{ fontSize: 13 }}>طلب جديد</button>
        </div>
      )}

      <h2 className="pk-h2" style={{ marginTop: 30 }}>طلبات السحب</h2>
      {hist.isLoading ? <Skeleton height={64} borderRadius={12} /> : !hist.data?.length ? (
        <div className="pk-panel"><Empty icon={<ArrowUpFromLine size={22} color="rgba(212,175,55,0.5)" />} text="لا توجد طلبات سحب" /></div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {hist.data.map(w => {
            const st = STATUS[w.status] || STATUS.pending
            return (
              <div key={w.id} className="pk-panel" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div className="pk-mono" style={{ fontSize: 14, color: '#fff', fontWeight: 700 }}>{num(w.amount)} {w.asset} · {w.network}</div>
                    <div className="pk-mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{new Date(w.created_at).toLocaleDateString('en-GB')}</div>
                  </div>
                  <Pill color={st.c}>{st.t}</Pill>
                </div>
                {w.status === 'completed' && w.txid && (
                  <button type="button" onClick={() => copy(w.txid!)} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#D4AF37', fontFamily: 'Montserrat', fontSize: 11, display: 'flex', gap: 6, alignItems: 'center', direction: 'ltr', wordBreak: 'break-all', textAlign: 'left' }}>
                    <Copy size={12} /><span>{copied === w.txid ? 'Copied' : w.txid}</span>
                  </button>
                )}
                {w.status === 'rejected' && w.admin_note && <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444', fontFamily: 'Cairo' }}>السبب: {w.admin_note}</div>}
                {w.status === 'pending' && <button type="button" onClick={() => cancel(w.id)} className="btn-outline-gold" style={{ marginTop: 10, fontSize: 12, width: '100%' }}>إلغاء الطلب</button>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
