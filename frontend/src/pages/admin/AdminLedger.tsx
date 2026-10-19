import { Database, AlertTriangle } from 'lucide-react'

export default function AdminLedger() {
  const entries: unknown[] = []

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 800,
          fontFamily: 'Montserrat', color: '#fff', marginBottom: 4,
        }}>Financial Ledger</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>
          Immutable double-entry ledger — read only
        </p>
      </div>

      <div style={{
        background: 'rgba(99,102,241,0.06)',
        border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: 10, padding: '14px 18px', marginBottom: 24,
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <AlertTriangle size={16} color="#6366f1" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: 'rgba(99,102,241,0.8)', fontFamily: 'Montserrat', lineHeight: 1.7 }}>
          <strong>IMMUTABLE LEDGER:</strong> Ledger entries cannot be edited or deleted.
          This is enforced at the database level with PostgreSQL rules.
          Every financial event creates a permanent, auditable record.
          Corrections are made via adjustment entries only.
        </div>
      </div>

      <div style={{
        background: 'rgba(20,20,20,0.8)',
        border: '1px solid rgba(212,175,55,0.08)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 80px 80px 80px 100px 100px 120px',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(212,175,55,0.07)', gap: 10,
        }}>
          {['User', 'Type', 'Ledger', 'Asset', 'Amount', 'Balance After', 'Date'].map((h, i) => (
            <div key={i} style={{
              fontSize: 10, fontWeight: 700,
              color: 'rgba(255,255,255,0.3)',
              fontFamily: 'Montserrat', letterSpacing: 1,
            }}>{h}</div>
          ))}
        </div>

        {entries.length === 0 && (
          <div style={{
            padding: '60px 24px', textAlign: 'center',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 12,
          }}>
            <Database size={32} color="rgba(212,175,55,0.2)" />
            <div style={{
              fontSize: 14, color: 'rgba(255,255,255,0.35)',
              fontFamily: 'Montserrat',
            }}>No ledger entries yet</div>
            <div style={{
              fontSize: 12, color: 'rgba(255,255,255,0.2)',
              fontFamily: 'Montserrat', maxWidth: 360,
            }}>
              Ledger entries are created automatically when deposits are confirmed,
              investments are funded, or trades are executed.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
