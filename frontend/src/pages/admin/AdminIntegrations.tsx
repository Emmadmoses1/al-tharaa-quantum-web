import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Pill, btn, inputCss, cardCss } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

type Item = { name: string; label: string; help: string; configured: boolean; source: string; preview: string; updated_at: string | null }
type TestRes = { ok: boolean; detail: string }

export default function AdminIntegrations() {
  const q = useQuery({ queryKey: ['admin-integrations'], staleTime: 0, retry: 0, queryFn: () => api.get<Item[]>('/api/admin/integrations') })
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [res, setRes] = useState<Record<string, TestRes | string>>({})

  async function run(name: string, fn: () => Promise<unknown>, done: string) {
    setBusy(name)
    try { await fn(); setRes(r => ({ ...r, [name]: done })); await q.refetch() }
    catch (e) { setRes(r => ({ ...r, [name]: e instanceof Error ? e.message : 'Failed' })) }
    setBusy(null)
  }

  async function test(name: string) {
    setBusy(name)
    try { const r = await api.post<TestRes>(`/api/admin/integrations/${name}/test`, {}); setRes(x => ({ ...x, [name]: r })) }
    catch (e) { setRes(x => ({ ...x, [name]: e instanceof Error ? e.message : 'Failed' })) }
    setBusy(null)
  }

  return (
    <div translate="no" className="notranslate">
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>Integrations & API Keys</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 14, lineHeight: 1.7 }}>
        Keys are encrypted before they are stored in the database and are never sent back to the browser. Only a super admin can view this page. A key saved here replaces the same key set on Render.
      </p>
      {q.isLoading ? <Skeleton height={200} borderRadius={14} /> : q.isError || !q.data ? <ErrorState english onRetry={q.refetch} /> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {q.data.map(it => {
            const r = res[it.name]
            const t = typeof r === 'object' ? r : null
            return (
              <div key={it.name} style={{ ...cardCss, cursor: 'default' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <b style={{ color: '#fff', fontFamily: 'Montserrat', fontSize: 14 }}>{it.label}</b>
                  <Pill text={it.configured ? `set · ${it.source}` : 'not set'} color={it.configured ? '#10b981' : '#9ca3af'} />
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 10, lineHeight: 1.6 }}>{it.help}</div>
                {it.configured && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'Montserrat', marginBottom: 8 }}>Current: {it.preview}</div>}
                <input type="password" autoComplete="off" placeholder={it.configured ? 'Paste a new key to replace' : 'Paste key'} value={draft[it.name] || ''}
                  onChange={e => setDraft(d => ({ ...d, [it.name]: e.target.value }))} style={{ ...inputCss, marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button disabled={busy === it.name || !(draft[it.name] || '').trim()} style={btn('gold', busy === it.name || !(draft[it.name] || '').trim())}
                    onClick={() => run(it.name, async () => { await api.patch(`/api/admin/integrations/${it.name}`, { value: draft[it.name].trim() }); setDraft(d => ({ ...d, [it.name]: '' })) }, 'Saved')}>Save</button>
                  <button disabled={busy === it.name || !it.configured} style={btn('ghost', busy === it.name || !it.configured)} onClick={() => test(it.name)}>Test</button>
                  <button disabled={busy === it.name || it.source !== 'database'} style={btn('red', busy === it.name || it.source !== 'database')}
                    onClick={() => { if (window.confirm('Remove this key from the database?')) run(it.name, () => api.post(`/api/admin/integrations/${it.name}/remove`, {}), 'Removed') }}>Remove</button>
                </div>
                {r && <div style={{ marginTop: 8, fontSize: 12, fontFamily: 'Montserrat', color: t ? (t.ok ? '#10b981' : '#ef4444') : '#D4AF37' }}>{t ? t.detail : String(r)}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
