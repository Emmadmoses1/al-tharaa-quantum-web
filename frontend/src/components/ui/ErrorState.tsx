import { AlertTriangle, RefreshCw } from 'lucide-react'

export function ErrorState({
  message = 'حدث خطأ في تحميل البيانات',
  onRetry,
  english = false,
}: {
  message?: string
  onRetry?: () => void
  english?: boolean
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', gap: 14, textAlign: 'center',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AlertTriangle size={22} color="#ef4444" />
      </div>
      <div style={{
        fontSize: 15, fontWeight: 700,
        color: 'rgba(255,255,255,0.6)',
        fontFamily: english ? 'Montserrat' : 'Cairo',
      }}>
        {english ? 'Failed to load data' : message}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'rgba(212,175,55,0.08)',
            border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: 8, padding: '9px 18px',
            color: '#D4AF37', cursor: 'pointer',
            fontSize: 13, fontFamily: english ? 'Montserrat' : 'Cairo',
          }}
        >
          <RefreshCw size={14} />
          {english ? 'Retry' : 'إعادة المحاولة'}
        </button>
      )}
    </div>
  )
}
