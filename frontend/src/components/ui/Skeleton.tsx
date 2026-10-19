export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 6,
  style = {},
}: {
  width?: string | number
  height?: number
  borderRadius?: number
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      width,
      height,
      borderRadius,
      background: 'linear-gradient(90deg, rgba(44,44,44,0.5) 25%, rgba(60,60,60,0.5) 50%, rgba(44,44,44,0.5) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      ...style,
    }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div style={{
      background: 'rgba(44,44,44,0.3)',
      border: '1px solid rgba(212,175,55,0.08)',
      borderRadius: 16, padding: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Skeleton width={40} height={40} borderRadius={10} />
        <Skeleton width={60} height={16} />
      </div>
      <Skeleton height={28} style={{ marginBottom: 8 }} />
      <Skeleton width="60%" height={14} />
    </div>
  )
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 12, padding: '14px 20px',
      borderBottom: '1px solid rgba(212,175,55,0.05)',
    }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} height={14} width={i === 0 ? '80%' : '60%'} />
      ))}
    </div>
  )
}
