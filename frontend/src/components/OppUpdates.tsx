import { useOppUpdates } from '../lib/useUpdates'
import OppVideo from './OppVideo'

const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// Timeline of project updates posted by the admin for one opportunity.
export default function OppUpdates({ oppId }: { oppId: string }) {
  const q = useOppUpdates(oppId)
  const list = q.data || []
  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 12 }}>آخر مستجدات المشروع</h3>
      {q.isLoading ? <div style={{ height: 60, borderRadius: 10, background: 'rgba(255,255,255,0.05)' }} /> : list.length === 0 ? (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>لم تُنشر مستجدات بعد. ستصلك إشعارات عند إضافة أي جديد.</div>
      ) : (
        <div style={{ borderRight: '2px solid rgba(212,175,55,0.25)', paddingRight: 16, display: 'grid', gap: 16 }}>
          {list.map(u => (
            <div key={u.id} style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', right: -23, top: 5, width: 10, height: 10, borderRadius: '50%', background: '#D4AF37' }} />
              <div style={{ fontSize: 11, color: '#D4AF37', fontFamily: 'Montserrat' }}>{fmt(u.created_at)}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Cairo', margin: '2px 0 4px' }}>{u.title}</div>
              {u.body && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo', lineHeight: 1.9, whiteSpace: 'pre-wrap', margin: 0 }}>{u.body}</p>}
              {u.media_url && u.media_type === 'image' && <img src={u.media_url} alt="" loading="lazy" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 12, marginTop: 10 }} />}
              {u.media_url && u.media_type === 'video' && <OppVideo url={u.media_url} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
