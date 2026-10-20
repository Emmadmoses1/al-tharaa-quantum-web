import type { Level } from '../components/PriceChart'

/* eslint-disable @typescript-eslint/no-explicit-any */
export function buildLevels(asset: string, signals: any[] | undefined, positions: any[] | undefined): Level[] {
  const out: Level[] = []
  const list = (signals || []).filter(s => s.asset === asset)
  const sig = list.find(s => s.signal === 'BUY') || list[0]
  if (sig) {
    const lo = Number(sig.entry_zone_low), hi = Number(sig.entry_zone_high)
    if (lo && hi) out.push({ label: 'ENTRY', price: (lo + hi) / 2, color: '#D4AF37', band: [lo, hi] })
    if (Number(sig.stop_loss)) out.push({ label: 'SL', price: Number(sig.stop_loss), color: '#ef4444' })
    if (Number(sig.take_profit_1)) out.push({ label: 'TP1', price: Number(sig.take_profit_1), color: '#10b981' })
    if (Number(sig.take_profit_2)) out.push({ label: 'TP2', price: Number(sig.take_profit_2), color: '#34d399' })
  }
  for (const p of (positions || []).filter(x => x.asset === asset)) {
    const entry = Number(p.executed_price) || Number(p.requested_price) || (Number(p.amount_usdt) / Number(p.quantity))
    if (Number.isFinite(entry) && entry > 0) out.push({ label: 'MY', price: entry, color: '#38bdf8' })
  }
  return out
}
