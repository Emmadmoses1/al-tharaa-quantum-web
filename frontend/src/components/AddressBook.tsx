import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, X } from 'lucide-react'
import { api } from '../lib/api'

type Saved = { id: string; label: string; network: string; address: string }

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-6)}`

// Saved wallets for the selected network: tap one to fill the address, or save the address you just typed.
export default function AddressBook({ network, address, addrOk, onPick }: { network: string; address: string; addrOk?: boolean; onPick: (a: string) => void }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['address-book'], staleTime: 60000, retry: 0, queryFn: () => api.get<Saved[]>('/api/address-book') })
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const list = (q.data || []).filter(a => a.network === network)
  const known = list.some(a => a.address === address)

  async function save() {
    setBusy(true); setErr(null)
    try {
      await api.post('/api/address-book', { network, address, label })
      setLabel('')
      await qc.invalidateQueries({ queryKey: ['address-book'] })
    } catch (e) { setErr(e instanceof Error ? e.message : 'تعذّر الحفظ') }
    setBusy(false)
  }
  async function remove(id: string) {
    try { await api.post(`/api/address-book/${id}/delete`, {}); await qc.invalidateQueries({ queryKey: ['address-book'] }) } catch { /* the list refreshes on the next visit */ }
  }

  if (list.length === 0 && !(addrOk && address)) return null
  return (
    <div style={{ marginBottom: 16 }}>
      {list.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Bookmark size={13} color="#D4AF37" />عناوينك المحفوظة</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {list.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', border: `1px solid ${a.address === address ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`, borderRadius: 10, background: a.address === address ? 'rgba(212,175,55,0.1)' : 'transparent' }}>
                <button type="button" onClick={() => onPick(a.address)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 10px', textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#fff', fontFamily: 'Cairo', fontWeight: 700 }}>{a.label}</div>
                  <div dir="ltr" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>{short(a.address)}</div>
                </button>
                <button type="button" aria-label="حذف" onClick={() => remove(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 8px 8px 10px', color: 'rgba(255,255,255,0.4)' }}><X size={14} /></button>
              </div>
            ))}
          </div>
        </>
      )}
      {addrOk && address && !known && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input value={label} onChange={e => setLabel(e.target.value)} maxLength={40} placeholder="اسم لهذا العنوان (اختياري)" className="pk-input" style={{ fontSize: 13, flex: 1 }} />
          <button type="button" onClick={save} disabled={busy} className="btn-outline-gold" style={{ fontSize: 12, padding: '0 16px', opacity: busy ? 0.5 : 1 }}>حفظ العنوان</button>
        </div>
      )}
      {err && <div style={{ fontSize: 11, color: '#ef4444', fontFamily: 'Cairo', marginTop: 6 }}>{err}</div>}
    </div>
  )
}
