import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUp, ArrowDown, Wallet } from 'lucide-react'
import { api } from '../../lib/api'
import { useWalletBalances } from '../../hooks/useWallet'
import PriceChart, { type Level } from '../../components/PriceChart'
import TurnoverCard from '../../components/TurnoverCard'

type Order = {
  id: string; asset: string; direction: 'up' | 'down'; amount: number; payout_percent: number; entry_price: number
  expires_at: string; status: string; close_price: number | null; payout: number | null; expiry_seconds: number
}
type Orders = { open: Order[]; history: Order[] }
type Cfg = { payout_percent: number; durations: number[]; min: number; max: number; max_open: number; assets: string[] }

const UP = '#10b981', DOWN = '#ef4444'
const num = (n: unknown, d = 2) => (n == null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d }))
const mono: React.CSSProperties = { fontFamily: 'Montserrat', direction: 'ltr', display: 'inline-block' }
const card: React.CSSProperties = { background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 14, padding: 14 }
const dur = (s: number) => (s < 60 ? `${s}s` : `${s / 60}m`)
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const chip = (on: boolean): React.CSSProperties => ({
  background: on ? 'rgba(212,175,55,0.16)' : 'rgba(255,255,255,0.05)', border: `1px solid ${on ? '#D4AF37' : 'rgba(255,255,255,0.08)'}`,
  color: on ? '#D4AF37' : 'rgba(255,255,255,0.65)', borderRadius: 8, padding: '9px 14px', minHeight: 38, fontSize: 13, fontWeight: 700,
  fontFamily: 'Montserrat', cursor: 'pointer',
})

export default function TradeRoom() {
  const qc = useQueryClient()
  const wallet = useWalletBalances()
  const balance = wallet.data?.find(w => w.ledger_type === 'trading' && w.asset === 'USDT')?.balance ?? 0
  const [asset, setAsset] = useState('BTC')
  const [seconds, setSeconds] = useState(60)
  const [amount, setAmount] = useState('10')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const [now, setNow] = useState(Date.now())
  const seen = useRef<Set<string> | null>(null)

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const cfg = useQuery({ queryKey: ['bin-cfg'], staleTime: 600000, queryFn: () => api.get<Cfg>('/api/binary/config') })
  const price = useQuery({ queryKey: ['bin-price', asset], refetchInterval: 3000, staleTime: 0, queryFn: () => api.get<{ price: number }>(`/api/binary/price?asset=${asset}`) })
  const orders = useQuery({ queryKey: ['bin-orders'], refetchInterval: 4000, staleTime: 0, queryFn: () => api.get<Orders>('/api/binary/orders') })

  const C = cfg.data
  const payout = C?.payout_percent ?? 85
  const amt = Number(amount) || 0
  const amountOk = !!C && amt >= C.min && amt <= C.max && amt <= balance
  const px = price.data?.price
  const prevPx = useRef<number | undefined>(undefined)
  const pxDir = px != null && prevPx.current != null ? (px > prevPx.current ? 1 : px < prevPx.current ? -1 : 0) : 0
  useEffect(() => { prevPx.current = px }, [px])

  // announce results when orders settle
  useEffect(() => {
    const h = orders.data?.history
    if (!h) return
    if (seen.current === null) { seen.current = new Set(h.map(o => o.id)); return }
    for (const o of h) {
      if (seen.current.has(o.id)) continue
      seen.current.add(o.id)
      const net = o.status === 'won' ? Number(o.payout) - Number(o.amount) : o.status === 'lost' ? -Number(o.amount) : 0
      setToast({ ok: net >= 0 && o.status !== 'lost', text: o.status === 'won' ? `ربحت +${num(net)} USDT` : o.status === 'lost' ? `خسرت ${num(net)} USDT` : o.status === 'tie' ? 'تعادل: أُعيد المبلغ' : 'أُلغيت الصفقة وأُعيد المبلغ' })
      qc.invalidateQueries({ queryKey: ['wallet-balances'] })
      qc.invalidateQueries({ queryKey: ['turnover'] })
      setTimeout(() => setToast(null), 6000)
    }
  }, [orders.data, qc])

  async function place(direction: 'up' | 'down') {
    setBusy(true); setErr(null)
    try {
      await api.post('/api/binary/place', { asset, direction, amount: amt, seconds })
      qc.invalidateQueries({ queryKey: ['bin-orders'] }); qc.invalidateQueries({ queryKey: ['wallet-balances'] })
    } catch (e) { setErr(e instanceof Error ? e.message : 'فشل تنفيذ الصفقة') }
    setBusy(false)
  }

  const open = orders.data?.open ?? []
  const levels: Level[] = open.filter(o => o.asset === asset).map(o => ({ label: o.direction === 'up' ? 'UP' : 'DOWN', price: Number(o.entry_price), color: o.direction === 'up' ? UP : DOWN }))

  return (
    <div style={{ direction: 'rtl', maxWidth: 940, margin: '0 auto' }} translate="no" className="notranslate">
      <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Wallet size={20} color="#D4AF37" />
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>رصيد محفظة التداول</div>
            <b style={{ fontSize: 20, color: '#D4AF37', ...mono }}>{num(balance)} USDT</b>
          </div>
        </div>
        <Link to="/dashboard/deposit" className="btn-gold" style={{ textDecoration: 'none', fontSize: 12, padding: '10px 18px' }}>إيداع</Link>
      </div>

      <TurnoverCard />

      {toast && <div role="status" style={{ ...card, marginBottom: 12, textAlign: 'center', fontWeight: 800, fontFamily: 'Cairo', fontSize: 16, color: toast.ok ? UP : DOWN, borderColor: toast.ok ? `${UP}66` : `${DOWN}66` }}>{toast.text}</div>}

      <div className="tr-grid">
        <div className="tr-chart">
          <div style={{ ...card, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {(C?.assets ?? ['BTC', 'ETH']).map(a => <button key={a} type="button" onClick={() => setAsset(a)} style={chip(asset === a)}>{a}/USDT</button>)}
              </div>
              <div style={{ textAlign: 'left' }}>
                <b style={{ fontSize: 22, fontFamily: 'Montserrat', direction: 'ltr', display: 'inline-block', color: pxDir > 0 ? UP : pxDir < 0 ? DOWN : '#fff' }}>{px != null ? num(px, px >= 100 ? 2 : 4) : '—'}</b>
                <span style={{ marginRight: 8, fontSize: 12, fontWeight: 800, color: UP, background: `${UP}1a`, padding: '3px 8px', borderRadius: 6, fontFamily: 'Montserrat' }}>{payout}%</span>
              </div>
            </div>
            <PriceChart asset={asset} interval="1m" onAsset={setAsset} refreshMs={4000} levels={levels} />
          </div>
        </div>

        <div className="tr-panel">
          <div style={card}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', marginBottom: 8 }}>مدة الصفقة</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {(C?.durations ?? [60, 180, 300, 900]).map(d => <button key={d} type="button" onClick={() => setSeconds(d)} style={chip(seconds === d)}>{dur(d)}</button>)}
            </div>

            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', marginBottom: 8 }}>المبلغ (USDT)</div>
            <input value={amount} inputMode="decimal" dir="ltr" autoComplete="off"
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(11,11,11,0.7)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 10, padding: '13px 14px', color: '#fff', fontSize: 18, fontFamily: 'Montserrat', outline: 'none', marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {[1, 5, 10, 25, 50, 100].map(v => <button key={v} type="button" onClick={() => setAmount(String(v))} style={{ ...chip(false), padding: '6px 10px', minHeight: 32, fontSize: 12 }}>{v}</button>)}
              <button type="button" onClick={() => setAmount(String(Math.max(0, Math.min(balance, C?.max ?? 500))))} style={{ ...chip(false), padding: '6px 10px', minHeight: 32, fontSize: 12 }}>MAX</button>
            </div>

            <div style={{ textAlign: 'center', fontFamily: 'Cairo', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
              الربح المتوقع عند الإصابة: <b style={{ color: UP, ...mono }}>+{num(amt * payout / 100)} USDT</b>
            </div>

            {err && <div role="alert" style={{ marginBottom: 10, fontSize: 12.5, color: DOWN, fontFamily: 'Cairo', lineHeight: 1.8 }}>{err}</div>}
            {amt > balance && <div style={{ marginBottom: 10, fontSize: 12, color: '#f59e0b', fontFamily: 'Cairo' }}>الرصيد غير كافٍ. <Link to="/dashboard/deposit" style={{ color: '#D4AF37' }}>أودِع الآن</Link></div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button type="button" disabled={busy || !amountOk} onClick={() => place('up')}
                style={{ background: UP, color: '#fff', border: 'none', borderRadius: 12, minHeight: 58, fontSize: 17, fontWeight: 800, fontFamily: 'Montserrat', cursor: 'pointer', opacity: busy || !amountOk ? 0.45 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ArrowUp size={20} /> UP
              </button>
              <button type="button" disabled={busy || !amountOk} onClick={() => place('down')}
                style={{ background: DOWN, color: '#fff', border: 'none', borderRadius: 12, minHeight: 58, fontSize: 17, fontWeight: 800, fontFamily: 'Montserrat', cursor: 'pointer', opacity: busy || !amountOk ? 0.45 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ArrowDown size={20} /> DOWN
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo', lineHeight: 1.8, marginTop: 12 }}>
              تحذير: التداول بالخيارات الثنائية عالي المخاطر وقد تخسر المبلغ المستثمر بالكامل. السعر من Binance، وتُحسم الصفقة بسعر السوق عند انتهاء المدة. الحد: {C?.min ?? 1}–{C?.max ?? 500} USDT للصفقة.
            </p>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', margin: '22px 0 10px' }}>صفقاتي المفتوحة ({open.length})</h2>
      {open.length === 0 ? <div style={{ ...card, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo', fontSize: 13 }}>لا توجد صفقات مفتوحة</div> : (
        <div className="tr-orders">
          {open.map(o => {
            const left = Math.max(0, Math.ceil((new Date(o.expires_at).getTime() - now) / 1000))
            const cur = o.asset === asset ? px : undefined
            const winning = cur == null ? null : o.direction === 'up' ? cur > o.entry_price : cur < o.entry_price
            const col = o.direction === 'up' ? UP : DOWN
            return (
              <div key={o.id} style={{ ...card, borderColor: winning == null ? undefined : winning ? `${UP}66` : `${DOWN}66` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                  <b style={{ color: '#fff', fontFamily: 'Montserrat' }}>{o.asset}/USDT</b>
                  <span style={{ color: col, fontWeight: 800, fontFamily: 'Montserrat', fontSize: 13 }}>{o.direction === 'up' ? '▲ UP' : '▼ DOWN'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', marginBottom: 4 }}>
                  <span>المبلغ</span><b style={{ color: '#fff', ...mono }}>{num(o.amount)} USDT</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', marginBottom: 4 }}>
                  <span>سعر الدخول</span><b style={{ color: '#fff', ...mono }}>{num(o.entry_price, 4)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 12, fontFamily: 'Cairo', color: winning == null ? 'rgba(255,255,255,0.4)' : winning ? UP : DOWN }}>{winning == null ? '' : winning ? 'رابحة الآن' : 'خاسرة الآن'}</span>
                  <b style={{ fontSize: 20, color: '#D4AF37', ...mono }}>{left > 0 ? clock(left) : 'جارٍ الحسم…'}</b>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Cairo', color: '#fff', margin: '22px 0 10px' }}>آخر النتائج</h2>
      {!orders.data?.history.length ? <div style={{ ...card, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo', fontSize: 13 }}>لا توجد نتائج بعد</div> : (
        <div style={{ display: 'grid', gap: 8 }}>
          {orders.data.history.map(o => {
            const net = o.status === 'won' ? Number(o.payout) - Number(o.amount) : o.status === 'lost' ? -Number(o.amount) : 0
            const c = o.status === 'won' ? UP : o.status === 'lost' ? DOWN : '#9ca3af'
            return (
              <div key={o.id} style={{ ...card, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontFamily: 'Montserrat', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                  <b style={{ color: '#fff' }}>{o.asset}</b> <span style={{ color: o.direction === 'up' ? UP : DOWN }}>{o.direction === 'up' ? '▲' : '▼'}</span> · {dur(o.expiry_seconds)}
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', direction: 'ltr' }}>{num(o.entry_price, 4)} → {num(o.close_price, 4)}</div>
                </div>
                <b style={{ color: c, fontFamily: 'Montserrat', direction: 'ltr', fontSize: 14 }}>{o.status === 'won' || o.status === 'lost' ? `${net >= 0 ? '+' : ''}${num(net)}` : o.status === 'tie' ? 'TIE' : 'VOID'}</b>
              </div>
            )
          })}
        </div>
      )}
      <style>{`.tr-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:14px;align-items:start}
.tr-orders{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:820px){.tr-grid{grid-template-columns:1fr}.tr-panel{order:2}.tr-chart{order:1}.tr-orders{grid-template-columns:1fr}}`}</style>
    </div>
  )
}
