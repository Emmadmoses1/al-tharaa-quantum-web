import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { api } from '../lib/api'

type Doc = { id: string; title: string; url: string; created_at: string }

// Public documents for an opportunity. Hidden entirely when there are none.
export default function OppDocs({ oppId }: { oppId: string }) {
  const q = useQuery({ queryKey: ['opp-docs', oppId], staleTime: 60000, retry: 0, queryFn: () => api.get<Doc[]>(`/api/public/opportunity-docs/${oppId}`) })
  const list = q.data || []
  if (list.length === 0) return null
  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 10 }}>المستندات والوثائق</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {list.map(d => (
          <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.15)', color: '#fff', textDecoration: 'none', fontFamily: 'Cairo', fontSize: 13 }}>
            <FileText size={16} color="#D4AF37" /> <span style={{ flex: 1 }}>{d.title}</span> <span style={{ color: '#D4AF37', fontSize: 11 }}>فتح</span>
          </a>
        ))}
      </div>
    </div>
  )
}
