import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Skeleton } from './ui/Skeleton'
import { ErrorState } from './ui/ErrorState'

export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number }
export type Level = { label: string; price: number; color: string; band?: [number, number] }
type Data = { asset: string; interval: string; candles: Candle[]; stale?: boolean }

const ASSETS = ['BTC', 'ETH']
const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d']
const UP = '#10b981'
const DOWN = '#ef4444'

function ema(v: number[], p: number) {
  const k = 2 / (p + 1)
  const out: number[] = []
  let e = v[0]
  for (let i = 0; i < v.length; i++) { e = i === 0 ? v[0] : v[i] * k + e * (1 - k); out.push(e) }
  return out
}

function rsiSeries(c: number[], p = 14) {
  const out: (number | null)[] = Array(c.length).fill(null)
  if (c.length <= p) return out
  let g = 0, l = 0
  for (let i = 1; i <= p; i++) { const d = c[i] - c[i - 1]; if (d >= 0) g += d; else l -= d }
  g /= p; l /= p
  out[p] = l === 0 ? 100 : 100 - 100 / (1 + g / l)
  for (let i = p + 1; i < c.length; i++) {
    const d = c[i] - c[i - 1]
    g = (g * (p - 1) + Math.max(d, 0)) / p
    l = (l * (p - 1) + Math.max(-d, 0)) / p
    out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l)
  }
  return out
}

const fp = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: n >= 10000 ? 0 : n >= 100 ? 1 : n >= 1 ? 2 : 4 })
const p2 = (n: number) => String(n).padStart(2, '0')
function fmtT(t: number, iv: string) {
  const d = new Date(t)
  const day = `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`
  return iv === '1d' ? day : `${day} ${p2(d.getHours())}:${p2(d.getMinutes())}`
}
const compact = (n: number) => Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n)

const chip = (on: boolean): CSSProperties => ({
  background: on ? 'rgba(212,175,55,0.16)' : 'rgba(255,255,255,0.05)',
  border: `1px solid ${on ? '#D4AF37' : 'rgba(255,255,255,0.08)'}`,
  color: on ? '#D4AF37' : 'rgba(255,255,255,0.6)',
  borderRadius: 8, padding: '7px 12px', minHeight: 34, fontSize: 12, fontWeight: 700,
  fontFamily: 'Montserrat', cursor: 'pointer',
})

export default function PriceChart({ asset, interval, onAsset, onInterval, levels = [], refreshMs }: {
  asset?: string; interval?: string
  onAsset?: (a: string) => void; onInterval?: (i: string) => void
  levels?: Level[]; refreshMs?: number
}) {
  const [a, setA] = useState(asset || 'BTC')
  const [iv, setIv] = useState(interval || '1h')
  const [kind, setKind] = useState<'candle' | 'line'>('candle')
  const [showEma, setShowEma] = useState(true)
  const [showRsi, setShowRsi] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(340)

  useEffect(() => { if (asset) setA(asset) }, [asset])
  useEffect(() => { if (interval) setIv(interval) }, [interval])
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const measure = () => setW(Math.max(280, Math.floor(el.clientWidth)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const q = useQuery({
    queryKey: ['candles', a, iv],
    queryFn: () => api.get<Data>(`/api/markets/candles?asset=${a}&interval=${iv}`),
    refetchInterval: refreshMs ?? 20000, staleTime: 2000,
  })

  function pickAsset(x: string) { setA(x); setHover(null); onAsset?.(x) }
  function pickInterval(x: string) { setIv(x); setHover(null); onInterval?.(x) }

  const controls = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
      {ASSETS.map(x => <button key={x} type="button" onClick={() => pickAsset(x)} style={chip(a === x)}>{x}/USDT</button>)}
      <span style={{ width: 6 }} />
      {INTERVALS.map(x => <button key={x} type="button" onClick={() => pickInterval(x)} style={chip(iv === x)}>{x}</button>)}
      <span style={{ width: 6 }} />
      <button type="button" onClick={() => setKind(kind === 'candle' ? 'line' : 'candle')} style={chip(false)}>{kind === 'candle' ? 'Candles' : 'Line'}</button>
      <button type="button" onClick={() => setShowEma(!showEma)} style={chip(showEma)}>EMA</button>
      <button type="button" onClick={() => setShowRsi(!showRsi)} style={chip(showRsi)}>RSI</button>
    </div>
  )

  const all = q.data?.candles ?? []

  let body
  if (q.isLoading) body = <Skeleton height={360} borderRadius={14} />
  else if (q.isError || all.length < 5) body = <ErrorState message="تعذّر تحميل الرسم البياني" onRetry={() => q.refetch()} />
  else {
    const closes = all.map(c => c.c)
    const e20 = ema(closes, 20), e50 = ema(closes, 50), rsi = rsiSeries(closes)
    const padL = 6, padR = 66, padT = 8
    const plotW = Math.max(100, w - padL - padR)
    const n = Math.min(all.length, Math.max(20, Math.floor(plotW / (kind === 'candle' ? 7 : 4))))
    const off = all.length - n
    const vis = all.slice(off)
    const step = plotW / n
    const xAt = (i: number) => padL + step * (i + 0.5)

    const HM = 300, HV = 46, HR = 70, GAP = 10
    const yVol0 = padT + HM + GAP
    const yRsi0 = yVol0 + HV + GAP
    const totalH = (showRsi ? yRsi0 + HR : yVol0 + HV) + 22

    let lo = Math.min(...vis.map(c => c.l))
    let hi = Math.max(...vis.map(c => c.h))
    const span = hi - lo || 1
    const drawn = levels.filter(L => L.price > lo - span * 1.2 && L.price < hi + span * 1.2)
    for (const L of drawn) {
      lo = Math.min(lo, L.price, L.band?.[0] ?? L.price)
      hi = Math.max(hi, L.price, L.band?.[1] ?? L.price)
    }
    const padD = (hi - lo || 1) * 0.04
    lo -= padD; hi += padD
    const yP = (p: number) => padT + HM - ((p - lo) / (hi - lo)) * HM

    const maxV = Math.max(...vis.map(c => c.v)) || 1
    const yR = (r: number) => yRsi0 + HR - (r / 100) * HR
    const pathOf = (vals: (number | null)[], y: (v: number) => number) => {
      let d = '', pen = false
      vals.forEach((v, i) => {
        if (v == null) { pen = false; return }
        d += `${pen ? 'L' : 'M'}${xAt(i).toFixed(1)},${y(v).toFixed(1)} `
        pen = true
      })
      return d
    }

    const last = vis[n - 1]
    const prev = n > 1 ? vis[n - 2].c : last.o
    const lastCol = last.c >= prev ? UP : DOWN
    const hv = hover ?? n - 1
    const cd = vis[hv]
    const chg = ((cd.c - cd.o) / cd.o) * 100
    const ticks = [0, 1, 2, 3, 4].map(k => lo + ((hi - lo) * k) / 4)
    const timeIdx = [0, 1, 2, 3].map(k => Math.round((k * (n - 1)) / 3))
    const xBottom = (showRsi ? yRsi0 + HR : yVol0 + HV) + 14

    const onPtr = (e: PointerEvent<SVGSVGElement>) => {
      const r = e.currentTarget.getBoundingClientRect()
      const px = ((e.clientX - r.left) / r.width) * w
      setHover(Math.max(0, Math.min(n - 1, Math.floor((px - padL) / step))))
    }

    const linePts = pathOf(vis.map(c => c.c), yP)

    body = (
      <>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontFamily: 'Montserrat', fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 8, minHeight: 32 }}>
          <b style={{ color: '#fff', fontSize: 13 }}>{a}/USDT · {iv}</b>
          <span>O <b style={{ color: '#fff' }}>{fp(cd.o)}</b></span>
          <span>H <b style={{ color: '#fff' }}>{fp(cd.h)}</b></span>
          <span>L <b style={{ color: '#fff' }}>{fp(cd.l)}</b></span>
          <span>C <b style={{ color: cd.c >= cd.o ? UP : DOWN }}>{fp(cd.c)} ({chg >= 0 ? '+' : ''}{chg.toFixed(2)}%)</b></span>
          <span>Vol <b style={{ color: '#fff' }}>{compact(cd.v)}</b></span>
          {showEma && <span><b style={{ color: '#D4AF37' }}>EMA20 {fp(e20[off + hv])}</b> · <b style={{ color: '#a78bfa' }}>EMA50 {fp(e50[off + hv])}</b></span>}
          {showRsi && rsi[off + hv] != null && <span>RSI <b style={{ color: '#fff' }}>{(rsi[off + hv] as number).toFixed(1)}</b></span>}
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>{fmtT(cd.t, iv)}</span>
        </div>

        <svg width={w} height={totalH} style={{ display: 'block', touchAction: 'pan-y', userSelect: 'none' }}
          onPointerMove={onPtr} onPointerDown={onPtr}
          onPointerLeave={e => { if (e.pointerType === 'mouse') setHover(null) }}>
          <defs>
            <linearGradient id="pcg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((p, k) => (
            <g key={k}>
              <line x1={padL} x2={w - padR} y1={yP(p)} y2={yP(p)} stroke="rgba(255,255,255,0.06)" />
              <text x={w - padR + 6} y={yP(p) + 3} fill="rgba(255,255,255,0.4)" fontSize="9.5" fontFamily="Montserrat">{fp(p)}</text>
            </g>
          ))}

          {drawn.filter(L => L.band).map((L, k) => (
            <rect key={`b${k}`} x={padL} width={plotW} y={yP(L.band![1])} height={Math.max(2, yP(L.band![0]) - yP(L.band![1]))} fill={L.color} opacity="0.12" />
          ))}

          {kind === 'line' ? (
            <>
              <path d={`${linePts} L${xAt(n - 1).toFixed(1)},${padT + HM} L${xAt(0).toFixed(1)},${padT + HM} Z`} fill="url(#pcg)" />
              <path d={linePts} fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinejoin="round" />
            </>
          ) : vis.map((c, i) => {
            const up = c.c >= c.o, col = up ? UP : DOWN
            const bw = Math.max(2, step * 0.62)
            return (
              <g key={c.t}>
                <line x1={xAt(i)} x2={xAt(i)} y1={yP(c.h)} y2={yP(c.l)} stroke={col} strokeWidth="1" />
                <rect x={xAt(i) - bw / 2} y={yP(Math.max(c.o, c.c))} width={bw} height={Math.max(1, Math.abs(yP(c.o) - yP(c.c)))} fill={col} />
              </g>
            )
          })}

          {showEma && (
            <>
              <path d={pathOf(e20.slice(off), yP)} fill="none" stroke="#D4AF37" strokeWidth="1.3" opacity="0.9" />
              <path d={pathOf(e50.slice(off), yP)} fill="none" stroke="#a78bfa" strokeWidth="1.3" opacity="0.9" />
            </>
          )}

          {drawn.map((L, k) => (
            <g key={`l${k}`}>
              <line x1={padL} x2={w - padR} y1={yP(L.price)} y2={yP(L.price)} stroke={L.color} strokeDasharray="5 4" strokeWidth="1.2" />
              <rect x={w - padR + 2} y={yP(L.price) - 8} width={padR - 4} height={16} rx="3" fill="#0B0B0B" stroke={L.color} />
              <text x={w - padR + 5} y={yP(L.price) + 3.5} fill={L.color} fontSize="9" fontWeight="700" fontFamily="Montserrat">{L.label} {fp(L.price)}</text>
            </g>
          ))}

          <line x1={padL} x2={w - padR} y1={yP(last.c)} y2={yP(last.c)} stroke={lastCol} strokeDasharray="2 3" opacity="0.8" />
          <rect x={w - padR + 2} y={yP(last.c) - 8} width={padR - 4} height={16} rx="3" fill={lastCol} />
          <text x={w - padR + 5} y={yP(last.c) + 3.5} fill="#0B0B0B" fontSize="9.5" fontWeight="800" fontFamily="Montserrat">{fp(last.c)}</text>

          {vis.map((c, i) => {
            const h = Math.max(1, (c.v / maxV) * HV)
            return <rect key={`v${c.t}`} x={xAt(i) - Math.max(1, step * 0.31)} y={yVol0 + HV - h} width={Math.max(2, step * 0.62)} height={h} fill={c.c >= c.o ? UP : DOWN} opacity="0.35" />
          })}

          {showRsi && (
            <g>
              <rect x={padL} y={yRsi0} width={plotW} height={HR} fill="rgba(255,255,255,0.02)" />
              {[30, 70].map(v => <line key={v} x1={padL} x2={w - padR} y1={yR(v)} y2={yR(v)} stroke="rgba(255,255,255,0.14)" strokeDasharray="3 3" />)}
              <text x={w - padR + 6} y={yR(70) + 3} fill="rgba(255,255,255,0.4)" fontSize="9.5" fontFamily="Montserrat">70</text>
              <text x={w - padR + 6} y={yR(30) + 3} fill="rgba(255,255,255,0.4)" fontSize="9.5" fontFamily="Montserrat">30</text>
              <path d={pathOf(rsi.slice(off), yR)} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
            </g>
          )}

          {timeIdx.map((i, k) => (
            <text key={k} x={Math.min(Math.max(xAt(i), padL + 24), w - padR - 24)} y={xBottom} fill="rgba(255,255,255,0.4)" fontSize="9.5" fontFamily="Montserrat" textAnchor="middle">{fmtT(vis[i].t, iv)}</text>
          ))}

          {hover != null && (
            <>
              <line x1={xAt(hv)} x2={xAt(hv)} y1={padT} y2={xBottom - 14} stroke="rgba(255,255,255,0.35)" strokeDasharray="3 3" />
              <line x1={padL} x2={w - padR} y1={yP(cd.c)} y2={yP(cd.c)} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
            </>
          )}
        </svg>

        {levels.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8, fontSize: 10.5, fontFamily: 'Montserrat' }}>
            {levels.map((L, k) => (
              <span key={k} style={{ color: L.color }}>
                ━ {L.label} {fp(L.price)}{!drawn.includes(L) ? ' (outside view)' : ''}
              </span>
            ))}
          </div>
        )}
        {q.data?.stale && <div style={{ fontSize: 10.5, color: '#f59e0b', fontFamily: 'Cairo', marginTop: 6 }}>البيانات قديمة مؤقتاً — تعذّر الاتصال بالمصدر.</div>}
      </>
    )
  }

  return (
    <div ref={wrap} style={{ direction: 'ltr', width: '100%' }}>
      {controls}
      {body}
      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cairo', marginTop: 8, direction: 'rtl' }}>
        المصدر: Binance. للاطلاع فقط وليست نصيحة مالية.
      </div>
    </div>
  )
}
