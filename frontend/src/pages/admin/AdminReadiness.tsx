import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, AlertCircle, Circle } from 'lucide-react'
import { api } from '../../lib/api'
import { Pill, cardCss, btn } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

type Item = { key: string; level: 'required' | 'recommended'; ok: boolean; label: string; hint: string; href: string }
type Data = { items: Item[]; required_done: number; required_total: number; ready: boolean }

export default function AdminReadiness() {
  const q = useQuery({ queryKey: ['admin-readiness'], staleTime: 0, queryFn: () => api.get<Data>('/api/admin/readiness') })
  if (q.isLoading) return <Skeleton />
  if (q.isError || !q.data) return <ErrorState english onRetry={() => q.refetch()} />
  const d = q.data
  return (
    <div style={{ maxWidth: 820 }}>
      <h2 style={{ color: '#fff', fontFamily: 'Montserrat', fontSize: 20, margin: '0 0 6px' }}>Launch checklist</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.8, margin: '0 0 16px' }}>
        Live checks of your real settings, keys and data. Fix the red items before inviting the public; yellow items build trust and reliability.
      </p>
      <div style={{ ...cardCss, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, borderColor: d.ready ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.4)' }}>
        {d.ready ? <CheckCircle2 color="#10b981" /> : <AlertCircle color="#ef4444" />}
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
          {d.ready ? 'All required items are done' : `${d.required_done} of ${d.required_total} required items done`}
        </div>
        <button type="button" onClick={() => q.refetch()} style={{ ...btn('ghost'), width: 'auto', padding: '0 14px', marginInlineStart: 'auto' }}>Re-check</button>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {d.items.map(i => (
          <div key={i.key} style={{ ...cardCss, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {i.ok ? <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} /> : i.level === 'required' ? <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} /> : <Circle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{i.label}</span>
                <Pill text={i.level} color={i.level === 'required' ? '#ef4444' : '#f59e0b'} />
              </div>
              {!i.ok ? <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4, lineHeight: 1.7 }}>{i.hint}</div> : null}
            </div>
            {!i.ok && i.href ? <Link to={i.href} style={{ color: '#D4AF37', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>Fix →</Link> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
