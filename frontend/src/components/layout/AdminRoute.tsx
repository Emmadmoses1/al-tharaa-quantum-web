import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const ADMIN_ROLES = ['admin', 'super_admin', 'finance', 'trading_admin', 'support']

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0B0B0B',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '2px solid rgba(212,175,55,0.15)',
          borderTop: '2px solid #D4AF37',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (profile && !ADMIN_ROLES.includes(profile.role)) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
