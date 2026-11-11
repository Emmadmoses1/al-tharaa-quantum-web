import { useEffect, useState, useCallback } from 'react'
import { Bell, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { api } from '../lib/api'
import Sheet from './ui/Sheet'

type Quote = { price: number; change: number | null; spark: number[] }
type Alert = { id: number; asset: 'BTC' | 'ETH'; direction: 'above' | 'below'; target: number; active: boolean; triggered_at: string | null }

const money = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: n < 100 ? 4 : 2 })

function Spark({ data, up }: { data: number[]; up: boolean }) {
  if (data.length < 2) return null
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 64},${22 - ((v - min) / span) * 20 - 1}`).join(' ')
  return <svg width="64" height="22" viewBox="0 0 64 22" aria-hidden="true"><polyline points={pts} fill="none" stroke={up ? '#10b981' : '#ef4444'} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" /></svg>
}

function AlertsSheet({ open, onClose, quotes }: { open: boolean; onClose: () => void; quotes: Record<string, Quote> }) {
  const [list, setList] = useState<Alert[]>([])
  const [asset, setAsset] = useState<'BTC' | 'ETH'>('BTC')
  const [dir, setDir] = useState<'above' | 'below'>('above')
  const [target, setTarget] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => { api.get<Alert[]>('/api/alerts').then(setList).catch(() => {}) }, [])
  useEffect(() => { if (open) load() }, [open, load])

  async function add() {
    const t = Number(target)
    if (!(t > 0)) return setErr('أدخل سعراً صحيحاً')
    setBusy(true); setErr('')
    try { await api.post('/api/alerts', { asset, direction: dir, target: t }); setTarget(''); load() }
    catch (e) { setErr(e instanceof Error ? e.message : 'تعذر الحفظ') }
    setBusy(false)
  }
  async function del(id: number) { try { await api.post(`/api/alerts/${id}/delete`, {}); load() } catch { /* ignore */ } }

  const field: React.CSSProperties = { background: 'rgba(11,11,11,0.6)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: '11px 12px', color: '#fff', fontSize: 14, fontFamily: 'Montserrat', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const active = list.filter(a => a.active)
  const done = list.filter(a => !a.active && a.triggered_at).slice(0, 5)
  return (
    <Sheet open={open} title="تنبيهات الأسعار" onClose={onClose}>
      <div style={{ display: 'grid', gap: 12, direction: 'rtl' }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', margin: 0, lineHeight: 1.8 }}>نُرسل لك إشعاراً وبريداً عند وصول السعر إلى هدفك.{quotes[asset] ? ` السعر الحالي لـ ${asset}: ${money(quotes[asset].price)}` : ''}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <select value={asset} onChange={e => setAsset(e.target.value as 'BTC' | 'ETH')} style={field}><option value="BTC">BTC</option><option value="ETH">ETH</option></select>
          <select value={dir} onChange={e => setDir(e.target.value as 'above' | 'below')} style={{ ...field, fontFamily: 'Cairo' }}><option value="above">عندما يصبح أعلى من</option><option value="below">عندما يصبح أدنى من</option></select>
        </div>
        <input inputMode="decimal" value={target} onChange={e => setTarget(e.target.value.replace(/[^\d.]/g, ''))} placeholder="السعر المستهدف (USDT)" dir="ltr" style={field} />
        {err && <div style={{ fontSize: 12, color: '#ef4444', fontFamily: 'Cairo' }}>{err}</div>}
        <button type="button" className="btn-gold" disabled={busy} onClick={add} style={{ padding: 12, opacity: busy ? 0.6 : 1 }}>إضافة تنبيه</button>
        {active.length > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37', fontFamily: 'Cairo' }}>التنبيهات النشطة</div>}
        {active.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 10 }}>
            <span style={{ flex: 1, fontSize: 13, color: '#fff', fontFamily: 'Montserrat' }} dir="ltr">{a.asset} {a.direction === 'above' ? '≥' : '≤'} {money(Number(a.target))}</span>
            <button type="button" onClick={() => del(a.id)} aria-label="حذف" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', padding: 4 }}><Trash2 size={15} /></button>
          </div>
        ))}
        {done.length > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo' }}>تم تنفيذها مؤخراً</div>}
        {done.map(a => <div key={a.id} dir="ltr" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', padding: '3px 2px' }}>{a.asset} {a.direction === 'above' ? '≥' : '≤'} {money(Number(a.target))} ✓</div>)}
      </div>
    </Sheet>
  )
}

// Live BTC / ETH prices with a 24h mini-chart and a button for price alerts. Shows nothing if the market data is unavailable.
export default function MarketTicker() {
  const [q, setQ] = useState<Record<string, Quote>>({})
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    const pull = () => api.get<Record<string, Quote>>('/api/public/market').then(d => { if (alive) setQ(d) }).catch(() => {})
    pull()
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') pull() }, 20000)
    return () => { alive = false; window.clearInterval(t) }
  }, [])

  const items = Object.entries(q)
  if (items.length === 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, overflowX: 'auto', direction: 'ltr' }}>
      {items.map(([sym, v]) => {
        const up = (v.change ?? 0) >= 0
        return (
          <div key={sym} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 12, flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat' }}>{sym}/USDT</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Montserrat' }}>${money(v.price)}</div>
            </div>
            <Spark data={v.spark} up={up} />
            {v.change !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: up ? '#10b981' : '#ef4444', fontFamily: 'Montserrat' }}>
                {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{up ? '+' : ''}{v.change}%
              </div>
            )}
          </div>
        )
      })}
      <button type="button" onClick={() => setOpen(true)} aria-label="تنبيهات الأسعار" style={{ marginInlineStart: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 12, color: '#D4AF37', fontFamily: 'Cairo', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
        <Bell size={14} />تنبيه
      </button>
      <AlertsSheet open={open} onClose={() => setOpen(false)} quotes={q} />
    </div>
  )
}
