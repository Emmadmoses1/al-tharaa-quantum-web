export default function Avatar({ url, name, size = 40, radius = 12 }: { url?: string | null; name?: string | null; size?: number; radius?: number }) {
  const box: React.CSSProperties = { width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: 'hidden' }
  if (url) return <img src={url} alt="" style={{ ...box, objectFit: 'cover', display: 'block', border: '1px solid rgba(212,175,55,0.35)' }} />
  return (
    <div style={{ ...box, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#F6DE8D,#D4AF37 55%,#9A7B12)', color: '#0B0B0B', fontWeight: 900, fontSize: Math.round(size * 0.4), fontFamily: 'Cairo' }}>
      {(name || '').trim().charAt(0) || 'م'}
    </div>
  )
}
