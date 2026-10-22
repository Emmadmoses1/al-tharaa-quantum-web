import { useId } from 'react'

// Hero coin: the brand mark (ث orbit, three nodes, rising line) stamped on a gold coin that gently sways in 3D.
export default function GoldCoin() {
  const id = 'gc' + useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', perspective: 1000 }}>
      <div style={{ position: 'absolute', width: 380, height: 380, maxWidth: '90%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 68%)', animation: 'aqGlow 4s ease-in-out infinite' }} />

      {/* three nodes orbiting, echoing the three dots of the mark */}
      <div className="aq-orbit" style={{ position: 'absolute', width: 340, height: 340, maxWidth: '88%', aspectRatio: '1', borderRadius: '50%', border: '1px dashed rgba(212,175,55,0.22)', animation: 'aqOrbit 18s linear infinite' }}>
        {[0, 120, 240].map(a => (
          <span key={a} style={{ position: 'absolute', top: '50%', left: '50%', width: 11, height: 11, marginLeft: -5.5, marginTop: -5.5, borderRadius: '50%', background: 'linear-gradient(135deg,#F6DE8D,#D4AF37)', boxShadow: '0 0 14px rgba(212,175,55,0.8)', transform: `rotate(${a}deg) translateY(-170px)` }} />
        ))}
      </div>

      <div style={{ width: 270, height: 270, maxWidth: '70%', aspectRatio: '1', transformStyle: 'preserve-3d', animation: 'aqSway 7s ease-in-out infinite', filter: 'drop-shadow(0 24px 40px rgba(0,0,0,0.6)) drop-shadow(0 0 30px rgba(212,175,55,0.25))' }}>
        <svg viewBox="0 0 300 300" width="100%" height="100%" role="img" aria-label="الثراء كوانتوم">
          <defs>
            <linearGradient id={id + 'r'} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FBE9A6" /><stop offset=".45" stopColor="#D4AF37" /><stop offset="1" stopColor="#7A5F0C" />
            </linearGradient>
            <radialGradient id={id + 'f'} cx=".35" cy=".3" r=".9">
              <stop offset="0" stopColor="#F3D77A" /><stop offset=".55" stopColor="#CFA52C" /><stop offset="1" stopColor="#8E6D10" />
            </radialGradient>
            <linearGradient id={id + 's'} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <clipPath id={id + 'c'}><circle cx="150" cy="150" r="126" /></clipPath>
          </defs>
          <circle cx="150" cy="150" r="148" fill={`url(#${id}r)`} />
          <circle cx="150" cy="150" r="138" fill="none" stroke="#6b520a" strokeOpacity=".55" strokeWidth="2" />
          <circle cx="150" cy="150" r="132" fill="none" stroke="#FBE9A6" strokeOpacity=".5" strokeWidth="1.5" strokeDasharray="2 5" />
          <circle cx="150" cy="150" r="126" fill={`url(#${id}f)`} />
          <g transform="translate(36 38) scale(1.9)">
            <g transform="translate(1.4 1.6)" stroke="#fff" strokeOpacity=".35" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 28 54 A 34 34 0 1 0 92 54" strokeWidth="8" />
              <polyline points="42,82 54,72 62,77 80,58" strokeWidth="5" /><polyline points="71,58 80,58 80,67" strokeWidth="5" />
            </g>
            <g stroke="#4a3806" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 28 54 A 34 34 0 1 0 92 54" strokeWidth="8" />
              <polyline points="42,82 54,72 62,77 80,58" strokeWidth="5" /><polyline points="71,58 80,58 80,67" strokeWidth="5" />
              <circle cx="50" cy="36" r="6" fill="#4a3806" stroke="none" /><circle cx="70" cy="36" r="6" fill="#4a3806" stroke="none" /><circle cx="60" cy="20" r="6" fill="#4a3806" stroke="none" />
            </g>
          </g>
          <g clipPath={`url(#${id}c)`}>
            <rect x="-120" y="0" width="90" height="300" fill={`url(#${id}s)`} transform="skewX(-18)" style={{ animation: 'aqShine 5s ease-in-out infinite' }} />
          </g>
        </svg>
      </div>

      <style>{`
        @keyframes aqSway { 0%,100% { transform: rotateY(-26deg) rotateX(7deg) } 50% { transform: rotateY(26deg) rotateX(-5deg) } }
        @keyframes aqOrbit { to { transform: rotate(360deg) } }
        @keyframes aqGlow { 0%,100% { opacity: .6; transform: scale(.96) } 50% { opacity: 1; transform: scale(1.04) } }
        @keyframes aqShine { 0%,55% { transform: translateX(0) skewX(-18deg) } 100% { transform: translateX(520px) skewX(-18deg) } }
        @media (max-width: 768px) { .aq-orbit { display: none } }
      `}</style>
    </div>
  )
}
