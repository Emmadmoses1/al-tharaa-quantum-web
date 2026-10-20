import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { Pill, btn, cardCss } from '../../components/ui/AdminKit'

type R = { name: string; ok: boolean; note: string }
const TABLES = ['profiles', 'deposits', 'ledger_entries', 'investment_opportunities', 'investment_allocations', 'withdrawals', 'trades',
  'trading_portfolios', 'ai_signals', 'ai_decisions', 'strategies', 'currencies', 'assets', 'deposit_addresses', 'notifications',
  'support_tickets', 'audit_logs', 'platform_statistics', 'ai_engine_state']
const APIS = ['/api/health', '/api/markets', '/api/markets/candles?asset=BTC&interval=1h', '/api/admin/engine', '/api/withdrawals/turnover', '/api/trade/positions', '/api/admin/trades']

export default function AdminSystem() {
  const [rows, setRows] = useState<R[] | null>(null)
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true); setRows(null)
    const out: R[] = []
    for (const t of TABLES) {
      const { error, count } = await supabase.from(t).select('*', { count: 'exact', head: true })
      out.push({ name: `table: ${t}`, ok: !error, note: error ? error.message : `${count ?? 0} rows readable` })
    }
    for (const p of APIS) {
      const t0 = Date.now()
      try { await api.get(p); out.push({ name: `api: ${p}`, ok: true, note: `${Date.now() - t0} ms` }) }
      catch (e) { out.push({ name: `api: ${p}`, ok: false, note: e instanceof Error ? e.message : 'failed' }) }
    }
    setRows(out); setBusy(false)
  }

  const bad = rows?.filter(r => !r.ok).length ?? 0
  return (
    <div translate="no" className="notranslate">
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>System Check</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 14, lineHeight: 1.7 }}>
        Tests every table you can read and every API route. A "permission denied" or "row-level security" error means a policy is missing: run the heal SQL. "Failed to fetch" means the API is asleep, down, or blocked by CORS.
      </p>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', marginBottom: 10, wordBreak: 'break-all' }}>API URL: {String(import.meta.env.VITE_API_URL || '(not set)')}</div>
      <button onClick={run} disabled={busy} style={{ ...btn('gold', busy), marginBottom: 16 }}>{busy ? 'Testing…' : 'Run system check'}</button>
      {rows && <div style={{ marginBottom: 12, fontFamily: 'Montserrat', fontSize: 13, color: bad ? '#ef4444' : '#10b981', fontWeight: 700 }}>{bad ? `${bad} problem(s) found` : 'Everything works'}</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        {rows?.map(r => (
          <div key={r.name} style={{ ...cardCss, cursor: 'default', padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#fff', fontFamily: 'Montserrat', wordBreak: 'break-all' }}>{r.name}</span>
              <Pill text={r.ok ? 'ok' : 'failed'} color={r.ok ? '#10b981' : '#ef4444'} />
            </div>
            <div style={{ fontSize: 11, marginTop: 4, fontFamily: 'Montserrat', color: r.ok ? 'rgba(255,255,255,0.4)' : '#ef4444', wordBreak: 'break-word' }}>{r.note}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
