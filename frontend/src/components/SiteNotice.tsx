import { useSite } from '../lib/useSite'

export default function SiteNotice() {
  const { data } = useSite()
  if (!data?.maintenance) return null
  return (
    <div role="status" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9998, background: '#f59e0b', color: '#0B0B0B', textAlign: 'center', padding: '8px 12px', fontSize: 13, fontWeight: 700, fontFamily: 'Cairo', direction: 'rtl' }}>
      {data.maintenance_message || 'المنصة تحت الصيانة. التداول والسحب متوقفان مؤقتاً.'}
    </div>
  )
}
