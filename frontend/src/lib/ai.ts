export type AiIndicators = { price?: number; ema20?: number; ema50?: number; rsi?: number; atr_pct?: number }
export type AiStatus = {
  engine: { enabled: boolean; online: boolean; last_run_at: string | null; signals_created: number | null }
  strategies: { id: string; name: string; risk_level: string; timeframe: string; supported_assets: string[] }[]
  active_signals: number
  markets: { asset: string; signal: string; indicators: AiIndicators | null; at: string }[]
  decisions: { asset: string; signal: string; indicators: AiIndicators | null; model_version: string | null; strategy: string | null; at: string }[]
}

export const SIGNAL_COLOR: Record<string, string> = { BUY: '#10b981', SELL: '#ef4444', HOLD: '#D4AF37', WAIT: '#9ca3af' }
export const SIGNAL_AR: Record<string, string> = { BUY: 'شراء', SELL: 'تجنّب / خروج', HOLD: 'احتفاظ', WAIT: 'انتظار' }
export const RISK_AR: Record<string, string> = { conservative: 'محافظة', moderate: 'متوسطة', aggressive: 'جريئة' }

export function trendOf(i: AiIndicators | null | undefined) {
  if (!i || i.ema20 == null || i.ema50 == null || i.price == null) return { t: '—', c: '#9ca3af' }
  if (i.ema20 > i.ema50 && i.price > i.ema50) return { t: 'صاعد', c: '#10b981' }
  if (i.ema20 < i.ema50 && i.price < i.ema50) return { t: 'هابط', c: '#ef4444' }
  return { t: 'عرضي', c: '#D4AF37' }
}
export function rsiOf(i: AiIndicators | null | undefined) {
  if (!i || i.rsi == null) return '—'
  return i.rsi > 70 ? 'تشبّع شراء' : i.rsi < 30 ? 'تشبّع بيع' : 'محايد'
}
export function volOf(i: AiIndicators | null | undefined) {
  if (!i || i.atr_pct == null) return '—'
  return i.atr_pct < 1 ? 'منخفض' : i.atr_pct < 2.5 ? 'متوسط' : 'مرتفع'
}
export const fmtTime = (d: string | null) => (d ? new Date(d).toLocaleString('en-GB', { hour12: false }) : '—')
export function minutesAgo(d: string | null) {
  if (!d) return '—'
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'الآن'
  if (m < 60) return `قبل ${m} دقيقة`
  const h = Math.floor(m / 60)
  return h < 24 ? `قبل ${h} ساعة` : `قبل ${Math.floor(h / 24)} يوم`
}
