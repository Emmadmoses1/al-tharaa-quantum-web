import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// When a trade or order really closes in profit (a "trade" notification whose result is +N USDT), show a short celebration.
// Only real results trigger it; the amount shown is taken from the notification itself.
type N = { id: string; title_ar: string | null; title: string; message_ar: string | null; message: string; created_at: string }
const WIN = /\+\s?(\d+(?:\.\d+)?)\s*USDT/i

function burst(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  const w = (canvas.width = window.innerWidth), h = (canvas.height = window.innerHeight)
  const colors = ['#D4AF37', '#E8CC6A', '#10b981', '#ffffff']
  const ps = Array.from({ length: 90 }, () => ({
    x: w / 2, y: h * 0.4, vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 11 - 3,
    r: 3 + Math.random() * 4, c: colors[Math.floor(Math.random() * colors.length)], a: 1,
  }))
  let raf = 0
  const t0 = performance.now()
  const tick = (t: number) => {
    ctx.clearRect(0, 0, w, h)
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.28; p.a = Math.max(0, 1 - (t - t0) / 2200)
      ctx.globalAlpha = p.a; ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.r, p.r * 0.6)
    }
    if (t - t0 < 2200) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

export default function WinCelebration() {
  const { user } = useAuth()
  const since = useRef(new Date().toISOString())
  const seen = useRef(new Set<string>())
  const [win, setWin] = useState<{ amount: string; title: string } | null>(null)
  const canvas = useRef<HTMLCanvasElement | null>(null)

  const q = useQuery({
    queryKey: ['win-watch', user?.id], enabled: !!user?.id, refetchInterval: 8000, staleTime: 0, retry: 0,
    queryFn: async () => {
      const { data } = await supabase.from('notifications').select('id, title, title_ar, message, message_ar, created_at')
        .eq('user_id', user!.id).eq('type', 'trade').gt('created_at', since.current).order('created_at', { ascending: false }).limit(5)
      return (data || []) as N[]
    },
  })

  useEffect(() => {
    for (const n of q.data || []) {
      if (seen.current.has(n.id)) continue
      seen.current.add(n.id)
      const m = WIN.exec(n.message || '')
      if (m && Number(m[1]) > 0) { setWin({ amount: m[1], title: n.title_ar || n.title }); break }
    }
  }, [q.data])

  useEffect(() => {
    if (!win) return
    try { navigator.vibrate?.(40) } catch { /* ignore */ }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const stop = !reduce && canvas.current ? burst(canvas.current) : () => {}
    const t = setTimeout(() => setWin(null), 4200)
    return () => { stop(); clearTimeout(t) }
  }, [win])

  if (!win) return null
  return (
    <div onClick={() => setWin(null)} role="status" aria-live="polite" style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
      <canvas ref={canvas} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', textAlign: 'center', background: 'rgba(20,20,20,0.95)', border: '1px solid #D4AF37', borderRadius: 20, padding: '26px 34px', boxShadow: '0 0 60px rgba(212,175,55,0.35)', direction: 'rtl' }}>
        <div style={{ fontSize: 34 }}>🎉</div>
        <div style={{ color: '#D4AF37', fontFamily: 'Cairo', fontWeight: 800, fontSize: 18, marginTop: 4 }}>مبروك!</div>
        <div dir="ltr" style={{ color: '#10b981', fontFamily: 'Montserrat', fontWeight: 900, fontSize: 34, margin: '6px 0' }}>+{win.amount} USDT</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo', fontSize: 13 }}>{win.title}</div>
      </div>
    </div>
  )
}
