import { CSSProperties, useState } from 'react'
import { Copy, Check } from 'lucide-react'

export const COLORS: Record<string, string> = {
  awaiting_payment: '#9ca3af', detected: '#f59e0b', confirming: '#6366f1', confirmed: '#10b981',
  failed: '#ef4444', expired: '#6b7280', rejected: '#ef4444',
  pending: '#f59e0b', approved: '#6366f1', processing: '#D4AF37', completed: '#10b981',
  cancelled: '#6b7280', submitted: '#f59e0b',
}

export function Pill({ text, color }: { text: string; color?: string }) {
  const c = color || COLORS[text] || '#9ca3af'
  return (
    <span style={{
      background: `${c}1a`, color: c, fontSize: 10, fontWeight: 700, fontFamily: 'Montserrat',
      padding: '3px 8px', borderRadius: 5, whiteSpace: 'nowrap',
    }}>{text.replace(/_/g, ' ').toUpperCase()}</span>
  )
}

export function Chips({ options, value, onChange }: {
  options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 14, WebkitOverflowScrolling: 'touch' }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{
          flexShrink: 0, background: value === o ? 'rgba(212,175,55,0.14)' : 'rgba(20,20,20,0.9)',
          border: `1px solid ${value === o ? '#D4AF37' : 'rgba(212,175,55,0.12)'}`,
          color: value === o ? '#D4AF37' : 'rgba(255,255,255,0.5)', borderRadius: 100,
          padding: '8px 14px', fontSize: 11, fontFamily: 'Montserrat', fontWeight: value === o ? 700 : 400, cursor: 'pointer',
        }}>{o === 'all' ? 'All' : o.replace(/_/g, ' ')}</button>
      ))}
    </div>
  )
}

export function KV({ k, v, copy }: { k: string; v: string; copy?: string }) {
  const [done, setDone] = useState(false)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px solid rgba(212,175,55,0.06)' }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', flexShrink: 0 }}>{k}</span>
      <span style={{ fontSize: 12, color: '#fff', fontFamily: 'Montserrat', textAlign: 'right', wordBreak: 'break-all', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {v}
        {copy && (
          <button aria-label="Copy" onClick={() => { navigator.clipboard.writeText(copy).catch(() => {}); setDone(true); setTimeout(() => setDone(false), 1500) }}
            style={{ background: 'none', border: 'none', color: '#D4AF37', cursor: 'pointer', padding: 0, display: 'flex' }}>
            {done ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
      </span>
    </div>
  )
}

export const inputCss: CSSProperties = {
  width: '100%', background: 'rgba(11,11,11,0.8)', border: '1px solid rgba(212,175,55,0.2)',
  borderRadius: 9, padding: '12px 14px', color: '#fff', fontSize: 16, fontFamily: 'Montserrat',
  outline: 'none', boxSizing: 'border-box',
}

export function btn(kind: 'gold' | 'red' | 'green' | 'ghost', disabled = false): CSSProperties {
  const map = {
    gold: { background: 'linear-gradient(135deg,#D4AF37,#E8CC6A)', color: '#0B0B0B', border: 'none' },
    red: { background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' },
    green: { background: 'rgba(16,185,129,0.14)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' },
    ghost: { background: 'transparent', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)' },
  }[kind]
  return {
    ...map, width: '100%', minHeight: 46, borderRadius: 10, fontSize: 13, fontWeight: 700,
    fontFamily: 'Montserrat', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
  }
}

export function ago(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

export const labelCss: CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
  fontFamily: 'Montserrat', letterSpacing: 1, marginBottom: 7, marginTop: 14,
}

export const cardGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }
export const cardCss: CSSProperties = {
  background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 14,
  padding: 14, textAlign: 'left', cursor: 'pointer', width: '100%', display: 'block',
}
