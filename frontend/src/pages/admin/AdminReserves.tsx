import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { api } from '../../lib/api'
import { Pill, KV, btn, cardCss } from '../../components/ui/AdminKit'

type Row = { asset: string; holdings: number; owed: number; delta: number; status: 'ok' | 'shortfall' | 'incomplete'; errors: string[] }
type Res = { generated_at: string; rows: Row[] }

const n = (v: number) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 8 })
const COLOR = { ok: '#10b981', shortfall: '#ef4444', incomplete: '#f59e0b' }

export default function AdminReserves() {
  const [data, setData] = useState<Res | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function check() {
    setBusy(true); setErr(null)
    try { setData(await api.get<Res>('/api/admin/reserves')) }
    catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    setBusy(false)
  }

  return (
    <div translate="no" className="notranslate">
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>Reserves Check</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 14, lineHeight: 1.7 }}>
        Compares what your deposit wallets hold on-chain with what users are owed (ledger balances plus money inside open trades).
        A shortfall means users are owed more than the wallets hold. Investigate before approving withdrawals.
      </p>
      <button onClick={check} disabled={busy} style={{ ...btn('gold', busy), marginBottom: 16 }}>{busy ? 'Checking wallets…' : 'Check reserves now'}</button>
      {err && <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 12, color: '#ef4444', fontFamily: 'Montserrat' }}>{err}</div>}

      {data && (
        <>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', marginBottom: 10 }}>Checked {new Date(data.generated_at).toLocaleString('en-GB')}</div>
          <div style={{ display: 'grid', gap: 12 }}>
            {data.rows.length === 0 && <div style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', fontSize: 13 }}>No wallets or balances yet.</div>}
            {data.rows.map(r => (
              <div key={r.asset} style={{ ...cardCss, cursor: 'default', borderColor: COLOR[r.status] + '55' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#fff', fontFamily: 'Montserrat', fontSize: 15 }}>
                    <ShieldCheck size={16} color={COLOR[r.status]} />{r.asset}
                  </span>
                  <Pill text={r.status} color={COLOR[r.status]} />
                </div>
                <KV k="Wallets hold" v={n(r.holdings)} />
                <KV k="Owed to users" v={n(r.owed)} />
                <KV k="Difference" v={`${r.delta >= 0 ? '+' : ''}${n(r.delta)}`} />
                {r.errors.length > 0 && <div style={{ marginTop: 8, fontSize: 11, color: '#f59e0b', fontFamily: 'Montserrat', wordBreak: 'break-word', lineHeight: 1.6 }}>Could not read: {r.errors.join(' | ')}. The wallet total may be too low.</div>}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat', marginTop: 14, lineHeight: 1.7 }}>
            A surplus is normal: it includes fees you earned and any user money you moved into investments. Only a shortfall needs action.
          </p>
        </>
      )}
    </div>
  )
}
