import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { api } from '../../lib/api'
import { cardCss } from '../../components/ui/AdminKit'
import { useSite } from '../../lib/useSite'

type Settings = { general: { license_text: string }; public: { show_users: boolean } }

export default function AdminStatistics() {
  const { data: site } = useSite()
  const s = useQuery({ queryKey: ['admin-settings-public'], staleTime: 0, retry: false, queryFn: () => api.get<Settings>('/api/admin/settings') })
  const users = site?.public?.users
  return (
    <div translate="no" className="notranslate">
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>Public Statistics</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Montserrat', lineHeight: 1.8, marginBottom: 14 }}>
        Only real numbers from your database can appear on the public site. Nothing can be typed in by hand, so the home page can never show an invented figure.
      </p>
      <div style={{ ...cardCss, cursor: 'default', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontSize: 12, fontFamily: 'Montserrat', fontWeight: 700, marginBottom: 8 }}><CheckCircle2 size={15} />Registered users (real count)</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', fontFamily: 'Montserrat' }}>{users == null ? '–' : users.toLocaleString('en-US')}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat', marginTop: 6 }}>
          Shown on the home page: <b style={{ color: s.data?.public?.show_users ? '#10b981' : '#9ca3af' }}>{s.data?.public?.show_users ? 'yes' : 'no'}</b>. Change it in <Link to="/admin/settings" style={{ color: '#D4AF37' }}>Settings → Public site</Link>.
        </div>
      </div>
      <div style={{ ...cardCss, cursor: 'default' }}>
        <div style={{ fontSize: 13, color: '#fff', fontFamily: 'Montserrat', fontWeight: 700, marginBottom: 6 }}>Licence statement</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'Montserrat', lineHeight: 1.8 }}>
          {s.data?.general?.license_text
            ? <>Currently shown in the footer and security section: <b style={{ color: '#D4AF37' }}>{s.data.general.license_text}</b></>
            : 'Empty, so no licence or regulator claim is shown anywhere. Add one in Settings only if it is true and you can prove it.'}
        </div>
      </div>
    </div>
  )
}
