import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Chips, cardCss } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

type Data = {
  days: number; views: number; sessions: number; live: number
  daily: { d: string; views: number; sessions: number }[]
  pages: { path: string; views: number }[]
  sources: { source: string; sessions: number }[]
  referrers: { referrer_host: string; sessions: number }[]
  countries: { country: string; sessions: number }[]
  devices: { device: string; sessions: number }[]
  campaigns: { campaign: string; sessions: number }[]
}
const RANGES: Record<string, number> = { 'Today': 1, '7 days': 7, '30 days': 30, '90 days': 90 }
const NAMES = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null
const country = (c: string) => { try { return c.length === 2 && NAMES ? `${NAMES.of(c)} (${c})` : c } catch { return c } }
const n = (v: number) => Number(v).toLocaleString('en-US')

function Stat({ label, value, sub, color = '#D4AF37' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ ...cardCss, cursor: 'default', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: `linear-gradient(180deg,${color},transparent)` }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontFamily: 'Montserrat', marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Bars({ title, rows, empty }: { title: string; rows: { label: string; value: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map(r => r.value))
  return (
    <div style={{ ...cardCss, cursor: 'default' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', fontFamily: 'Montserrat', marginBottom: 10 }}>{title}</div>
      {rows.length === 0 ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat' }}>{empty}</div> : rows.map(r => (
        <div key={r.label} style={{ marginBottom: 9 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'Montserrat', color: 'rgba(255,255,255,0.8)', gap: 8 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span><b style={{ color: '#D4AF37' }}>{n(r.value)}</b>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginTop: 4 }}>
            <div style={{ width: `${(r.value / max) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#9A7B12,#D4AF37)', borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminTraffic() {
  const [range, setRange] = useState('7 days')
  const days = RANGES[range]
  const q = useQuery({ queryKey: ['admin-analytics', days], staleTime: 0, refetchInterval: 30000, queryFn: () => api.get<Data>(`/api/admin/analytics?days=${days}`) })
  const d = q.data
  const maxV = Math.max(1, ...(d?.daily.map(x => x.views) || [1]))

  return (
    <div translate="no" className="notranslate">
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>Website Traffic</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 14, lineHeight: 1.7 }}>
        Real visits to your public pages. No cookies and no IP addresses are stored. Admin pages and bots are not counted. Add <b>?utm_source=name</b> to a link to see exactly which post or ad sent people.
      </p>
      <Chips options={Object.keys(RANGES)} value={range} onChange={setRange} />
      {q.isLoading ? <Skeleton height={240} borderRadius={14} /> : q.isError || !d ? <ErrorState english onRetry={q.refetch} /> : (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
            <Stat label="PAGE VIEWS" value={n(d.views)} />
            <Stat label="VISITS" value={n(d.sessions)} sub={d.sessions ? `${(d.views / d.sessions).toFixed(1)} pages per visit` : undefined} color="#6366f1" />
            <Stat label="ONLINE NOW" value={n(d.live)} sub="last 5 minutes" color="#10b981" />
          </div>
          <div style={{ ...cardCss, cursor: 'default' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', fontFamily: 'Montserrat', marginBottom: 12 }}>Views per day</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: d.daily.length > 40 ? 1 : 3, height: 120 }} role="img" aria-label="Views per day">
              {d.daily.map(x => (
                <div key={x.d} title={`${x.d}: ${x.views} views, ${x.sessions} visits`} style={{ flex: 1, minWidth: 1, height: `${Math.max(2, (x.views / maxV) * 100)}%`, background: 'linear-gradient(180deg,#D4AF37,#9A7B12)', borderRadius: '3px 3px 0 0', opacity: x.views ? 1 : 0.25 }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', marginTop: 6 }}>
              <span>{d.daily[0]?.d}</span><span>{d.daily[d.daily.length - 1]?.d}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
            <Bars title="Where visitors come from" rows={d.sources.map(s => ({ label: s.source, value: s.sessions }))} empty="No visits yet" />
            <Bars title="Referring websites" rows={d.referrers.map(s => ({ label: s.referrer_host, value: s.sessions }))} empty="No referring sites yet" />
            <Bars title="Top pages" rows={d.pages.map(p => ({ label: p.path, value: p.views }))} empty="No views yet" />
            <Bars title="Countries" rows={d.countries.map(c => ({ label: country(c.country), value: c.sessions }))} empty="No data yet" />
            <Bars title="Devices" rows={d.devices.map(c => ({ label: c.device, value: c.sessions }))} empty="No data yet" />
            <Bars title="Campaigns (utm_campaign)" rows={d.campaigns.map(c => ({ label: c.campaign, value: c.sessions }))} empty="Add ?utm_campaign=name to your links" />
          </div>
        </div>
      )}
    </div>
  )
}
