import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Copy, Check } from 'lucide-react'
import { api } from '../../lib/api'
import { Pill, btn, ago, cardCss } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

type Row = { id: string; email: string; np_payment_id: string; network: string; price_usd: number; pay_amount: number | null; actually_paid: number | null; np_status: string; credited: boolean; needs_review: boolean; note: string | null; created_at: string }
type Data = { rows: Row[]; webhook_url: string; api_key_set: boolean; ipn_secret_set: boolean; enabled: boolean; sandbox: boolean }
const C: Record<string, string> = { waiting: '#9ca3af', confirming: '#6366f1', confirmed: '#6366f1', sending: '#6366f1', partially_paid: '#f59e0b', finished: '#10b981', failed: '#ef4444', expired: '#6b7280', refunded: '#6b7280' }

export default function AdminPayments() {
  const q = useQuery({ queryKey: ['admin-payments'], staleTime: 0, refetchInterval: 15000, queryFn: () => api.get<Data>('/api/admin/nowpayments') })
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [test, setTest] = useState<{ ok: boolean; detail: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const d = q.data

  async function runTest() {
    setTesting(true); setTest(null)
    try { setTest(await api.post<{ ok: boolean; detail: string }>('/api/admin/nowpayments/test', {})) }
    catch (e) { setTest({ ok: false, detail: e instanceof Error ? e.message : 'Test failed' }) }
    setTesting(false)
  }

  async function sync(id: string) {
    setBusy(id); setMsg('')
    try { const r = await api.post<Record<string, unknown>>(`/api/admin/nowpayments/${id}/sync`, {}); setMsg(`Synced: ${JSON.stringify(r)}`); await q.refetch() }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Failed') }
    setBusy('')
  }
  const ok = (b: boolean) => <Pill text={b ? 'ready' : 'missing'} color={b ? '#10b981' : '#ef4444'} />

  return (
    <div translate="no" className="notranslate">
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>NOWPayments</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 14, lineHeight: 1.7 }}>
        Automatic deposits. Users pay USDT, and the wallet is credited only when NOWPayments confirms it through the signed webhook.
      </p>
      {q.isLoading ? <Skeleton height={200} borderRadius={14} /> : q.isError || !d ? <ErrorState english onRetry={q.refetch} /> : (
        <>
          <div style={{ ...cardCss, cursor: 'default', marginBottom: 14, display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 13, color: '#fff', fontFamily: 'Montserrat', fontWeight: 700 }}>Connect in 4 steps</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'Montserrat', lineHeight: 1.9 }}>
              1. Create an account at nowpayments.io and a payout wallet.<br />
              2. Paste the <b>API key</b> and the <b>IPN secret</b> in <Link to="/admin/integrations" style={{ color: '#D4AF37' }}>API Keys</Link>.<br />
              3. In NOWPayments → Store settings, set the IPN callback URL to the address below.<br />
              4. In <Link to="/admin/settings" style={{ color: '#D4AF37' }}>Settings → Payments</Link> turn NOWPayments ON.
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input readOnly value={d.webhook_url || 'Set API_PUBLIC_URL on Render'} style={{ flex: 1, background: 'rgba(11,11,11,0.8)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 9, padding: '10px 12px', color: '#fff', fontSize: 12, fontFamily: 'Montserrat' }} />
              <button style={{ ...btn('ghost'), width: 46 }} onClick={async () => { try { await navigator.clipboard.writeText(d.webhook_url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ } }}>{copied ? <Check size={16} /> : <Copy size={16} />}</button>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: 'Montserrat', alignItems: 'center' }}>
              <span>API key {ok(d.api_key_set)}</span><span>IPN secret {ok(d.ipn_secret_set)}</span>
              <span>Switch <Pill text={d.enabled ? 'on' : 'off'} color={d.enabled ? '#10b981' : '#9ca3af'} /></span>
              {d.sandbox && <Pill text="sandbox" color="#f59e0b" />}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button disabled={testing} style={{ ...btn('gold', testing), padding: '9px 16px' }} onClick={runTest}>{testing ? 'Testing…' : 'Test connection'}</button>
              {test && <span style={{ fontSize: 12, fontFamily: 'Montserrat', lineHeight: 1.6, color: test.ok ? '#10b981' : '#ef4444' }}>{test.detail}</span>}
            </div>
          </div>
          {msg && <div style={{ fontSize: 12, color: '#D4AF37', fontFamily: 'Montserrat', marginBottom: 10, wordBreak: 'break-all' }}>{msg}</div>}
          <div style={{ display: 'grid', gap: 10 }}>
            {d.rows.length === 0 && <div style={{ ...cardCss, cursor: 'default', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', fontSize: 13 }}>No payments yet</div>}
            {d.rows.map(r => (
              <div key={r.id} style={{ ...cardCss, cursor: 'default', borderColor: r.needs_review ? 'rgba(245,158,11,0.5)' : undefined }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <b style={{ color: '#fff', fontFamily: 'Montserrat', fontSize: 14 }}>${Number(r.price_usd).toLocaleString('en-US')} · {r.network}</b>
                  <Pill text={r.np_status} color={C[r.np_status] || '#9ca3af'} />
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat', margin: '6px 0', lineHeight: 1.7, wordBreak: 'break-all' }}>
                  {r.email} · #{r.np_payment_id} · {ago(r.created_at)}<br />
                  Expected {r.pay_amount ?? '-'} · Paid {r.actually_paid ?? '-'} · {r.credited ? 'credited' : 'not credited'}
                </div>
                {r.note && <div style={{ fontSize: 11.5, color: '#f59e0b', fontFamily: 'Montserrat', marginBottom: 6 }}>{r.note}</div>}
                {!r.credited && <button disabled={busy === r.np_payment_id} style={{ ...btn('ghost', busy === r.np_payment_id), minHeight: 38 }} onClick={() => sync(r.np_payment_id)}>{busy === r.np_payment_id ? 'Checking…' : 'Re-check with NOWPayments'}</button>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
