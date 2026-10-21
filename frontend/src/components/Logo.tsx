import { useId } from 'react'

// Al Tharaa Quantum mark: the letter ث as an open orbit, three nodes and a rising line.
export function LogoMark({ size = 36, flat }: { size?: number; flat?: string }) {
  const id = 'lg' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const paint = flat || `url(#${id})`
  return (
    <svg width={size} height={size} viewBox="12 8 96 100" role="img" aria-label="الثراء كوانتوم" style={{ flexShrink: 0, display: 'block' }}>
      {!flat && (
        <defs>
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="20" y1="12" x2="100" y2="104">
            <stop offset="0" stopColor="#F6DE8D" />
            <stop offset="0.5" stopColor="#D4AF37" />
            <stop offset="1" stopColor="#9A7B12" />
          </linearGradient>
        </defs>
      )}
      <path d="M 28 54 A 34 34 0 1 0 92 54" fill="none" stroke={paint} strokeWidth="8" strokeLinecap="round" />
      <circle cx="50" cy="36" r="6" fill={paint} />
      <circle cx="70" cy="36" r="6" fill={paint} />
      <circle cx="60" cy="20" r="6" fill={paint} />
      <polyline points="42,82 54,72 62,77 80,58" fill="none" stroke={paint} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="71,58 80,58 80,67" fill="none" stroke={paint} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default LogoMark
