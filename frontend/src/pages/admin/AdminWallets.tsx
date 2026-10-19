import { useState } from 'react'
import { Plus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { useAdminWallets, useAdminCreateWallet, useAdminToggleWallet } from '../../hooks/useData'
import { TableRowSkeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

const ASSETS = ['USDT', 'BTC', 'ETH', 'USDC']
const NETWORKS: Record<string, string[]> = {
  USDT: ['TRC20', 'ERC20', 'BEP20'],
  BTC: ['Bitcoin'],
  ETH: ['ERC20'],
  USDC: ['ERC20', 'BEP20'],
}

export default function AdminWallets() {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    asset: 'USDT', network: 'TRC20',
    address: '', label: '',
    minimum: '10', confirmations: '1',
  })
  const [formError, setFormError] = useState<string | null>(null)

  const { data: wallets, isLoading, isError, refetch } = useAdminWallets()
  const createWallet = useAdminCreateWallet()
  const toggleWallet = useAdminToggleWallet()

  async function handleAdd() {
    setFormError(null)
    if (!form.address.trim()) return setFormError('Wallet address is required')
    if (!form.minimum || Number(form.minimum) <= 0) return setFormError('Minimum deposit must be > 0')

    try {
      await createWallet.mutateAsync({
        asset: form.asset,
        network: form.network,
        address: form.address.trim(),
        label: form.label || undefined,
        minimum_deposit: Number(form.minimum),
        required_confirmations: Number(form.confirmations),
      })
      setShowAdd(false)
      setForm({ asset: 'USDT', network: 'TRC20', address: '', label: '', minimum: '10', confirmations: '1' })
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save wallet')
    }
  }

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 24,
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>
            Deposit Wallets
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>
            Configure deposit addresses shown to users
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg,#D4AF37,#E8CC6A)',
          border: 'none', borderRadius: 8, padding: '10px 18px',
          color: '#0B0B0B', fontSize: 12, fontWeight: 700,
          fontFamily: 'Montserrat', cursor: 'pointer',
        }}>
          <Plus size={15} /> Add Wallet
        </button>
      </div>

      <div style={{
        background: 'rgba(239,68,68,0.06)',
        border: '1px solid rgba(239,68,68,0.15)',
        borderRadius: 10, padding: '14px 18px', marginBottom: 24,
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: 'rgba(239,68,68,0.8)', fontFamily: 'Montserrat', lineHeight: 1.7 }}>
          <strong>CRITICAL:</strong> Verify every address before saving.
          These are the addresses users send real funds to.
          Never paste unverified clipboard content.
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          zIndex: 500, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 24, backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: '#141414', border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: 16, padding: 32, maxWidth: 480, width: '100%',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 24 }}>
              Add Deposit Wallet
            </h2>

            {formError && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 7, padding: '10px 14px', marginBottom: 16,
                fontSize: 12, color: '#ef4444', fontFamily: 'Montserrat',
              }}>{formError}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Asset */}
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat', marginBottom: 8 }}>ASSET</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {ASSETS.map(a => (
                    <button key={a}
                      onClick={() => setForm(f => ({ ...f, asset: a, network: NETWORKS[a][0] }))}
                      style={{
                        flex: 1, padding: '8px',
                        background: form.asset === a ? 'rgba(212,175,55,0.12)' : 'rgba(44,44,44,0.5)',
                        border: `1px solid ${form.asset === a ? '#D4AF37' : 'rgba(212,175,55,0.1)'}`,
                        borderRadius: 6, cursor: 'pointer',
                        color: form.asset === a ? '#D4AF37' : 'rgba(255,255,255,0.5)',
                        fontSize: 12, fontFamily: 'Montserrat', fontWeight: 700,
                        transition: 'all 0.2s',
                      }}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Network */}
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat', marginBottom: 8 }}>NETWORK</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {NETWORKS[form.asset].map(n => (
                    <button key={n}
                      onClick={() => setForm(f => ({ ...f, network: n }))}
                      style={{
                        padding: '7px 14px',
                        background: form.network === n ? 'rgba(212,175,55,0.12)' : 'rgba(44,44,44,0.5)',
                        border: `1px solid ${form.network === n ? '#D4AF37' : 'rgba(212,175,55,0.1)'}`,
                        borderRadius: 6, cursor: 'pointer',
                        color: form.network === n ? '#D4AF37' : 'rgba(255,255,255,0.5)',
                        fontSize: 12, fontFamily: 'Montserrat', fontWeight: 600,
                        transition: 'all 0.2s',
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat', marginBottom: 8 }}>WALLET ADDRESS *</label>
                <input
                  type="text" value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Verified wallet address..."
                  dir="ltr"
                  style={{
                    width: '100%', background: 'rgba(11,11,11,0.7)',
                    border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8,
                    padding: '11px 14px', color: '#fff', fontSize: 12,
                    fontFamily: 'Montserrat', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Label */}
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat', marginBottom: 8 }}>LABEL (optional)</label>
                <input
                  type="text" value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Main USDT TRC20"
                  style={{
                    width: '100%', background: 'rgba(11,11,11,0.7)',
                    border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8,
                    padding: '11px 14px', color: '#fff', fontSize: 12,
                    fontFamily: 'Montserrat', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat', marginBottom: 8 }}>MIN DEPOSIT *</label>
                  <input
                    type="number" value={form.minimum} min="0"
                    onChange={e => setForm(f => ({ ...f, minimum: e.target.value }))}
                    style={{
                      width: '100%', background: 'rgba(11,11,11,0.7)',
                      border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8,
                      padding: '11px 14px', color: '#fff', fontSize: 12,
                      fontFamily: 'Montserrat', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat', marginBottom: 8 }}>CONFIRMATIONS *</label>
                  <input
                    type="number" value={form.confirmations} min="1"
                    onChange={e => setForm(f => ({ ...f, confirmations: e.target.value }))}
                    style={{
                      width: '100%', background: 'rgba(11,11,11,0.7)',
                      border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8,
                      padding: '11px 14px', color: '#fff', fontSize: 12,
                      fontFamily: 'Montserrat', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => { setShowAdd(false); setFormError(null) }} style={{
                flex: 1, background: 'transparent',
                border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8,
                padding: '12px', color: '#D4AF37',
                fontSize: 13, fontFamily: 'Montserrat', cursor: 'pointer',
              }}>Cancel</button>
              <button
                onClick={handleAdd}
                disabled={createWallet.isPending}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg,#D4AF37,#E8CC6A)',
                  border: 'none', borderRadius: 8, padding: '12px',
                  color: '#0B0B0B', fontSize: 13, fontWeight: 700,
                  fontFamily: 'Montserrat', cursor: createWallet.isPending ? 'not-allowed' : 'pointer',
                  opacity: createWallet.isPending ? 0.7 : 1,
                }}>
                {createWallet.isPending ? 'Saving...' : 'Save Wallet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{
        background: 'rgba(20,20,20,0.8)',
        border: '1px solid rgba(212,175,55,0.08)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '70px 80px 1fr 100px 130px 80px 70px',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(212,175,55,0.07)', gap: 10,
        }}>
          {['Asset', 'Network', 'Address', 'Min Deposit', 'Confirmations', 'Status', 'Action'].map((h, i) => (
            <div key={i} style={{
              fontSize: 10, fontWeight: 700,
              color: 'rgba(255,255,255,0.3)',
              fontFamily: 'Montserrat', letterSpacing: 1,
            }}>{h}</div>
          ))}
        </div>

        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
        ) : isError ? (
          <ErrorState english onRetry={refetch} />
        ) : !wallets || wallets.length === 0 ? (
          <div style={{
            padding: '60px 24px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <AlertTriangle size={32} color="rgba(212,175,55,0.2)" />
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat' }}>
              No wallets configured
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: 'Montserrat', maxWidth: 340 }}>
              Add wallet addresses above. Only active wallets are shown to users.
            </div>
          </div>
        ) : (
          (wallets as Record<string, unknown>[]).map((w, i) => (
            <div key={w.id as string} style={{
              display: 'grid',
              gridTemplateColumns: '70px 80px 1fr 100px 130px 80px 70px',
              padding: '13px 20px',
              borderBottom: i < wallets.length - 1
                ? '1px solid rgba(212,175,55,0.05)' : 'none',
              gap: 10, alignItems: 'center',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', fontFamily: 'Montserrat' }}>
                {w.asset as string}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'Montserrat' }}>
                {w.network as string}
              </div>
              <div style={{
                fontSize: 10, color: 'rgba(255,255,255,0.5)',
                fontFamily: 'Montserrat', direction: 'ltr',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {w.address as string}
              </div>
              <div style={{ fontSize: 12, color: '#fff', fontFamily: 'Montserrat' }}>
                {Number(w.minimum_deposit)} {w.asset as string}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat' }}>
                {w.required_confirmations as number} confirmations
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: w.status === 'active'
                  ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                color: w.status === 'active' ? '#10b981' : '#6b7280',
                fontSize: 10, fontWeight: 600, fontFamily: 'Montserrat',
                padding: '3px 8px', borderRadius: 4,
              }}>
                {w.status === 'active'
                  ? <><CheckCircle size={10} /> Active</>
                  : <><XCircle size={10} /> Inactive</>
                }
              </span>
              <button
                onClick={() => toggleWallet.mutate({
                  id: w.id as string,
                  status: w.status === 'active' ? 'inactive' : 'active',
                })}
                style={{
                  background: 'rgba(44,44,44,0.5)',
                  border: '1px solid rgba(212,175,55,0.1)',
                  borderRadius: 6, padding: '5px 10px',
                  cursor: 'pointer', fontSize: 10,
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: 'Montserrat', transition: 'all 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#D4AF37'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'}
              >
                Toggle
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
