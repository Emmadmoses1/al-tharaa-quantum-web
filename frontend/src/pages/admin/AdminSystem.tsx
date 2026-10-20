import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { Pill, Chips, btn, cardCss } from '../../components/ui/AdminKit'

/* eslint-disable @typescript-eslint/no-explicit-any */
type R = { name: string; ok: boolean; note: string }
type PageRes = { path: string; group: string; status: 'ok' | 'warn' | 'fail'; notes: string[] }
type Page = { path: string; group: string; redirect?: boolean }

const TABLES = ['profiles', 'deposits', 'ledger_entries', 'investment_opportunities', 'investment_allocations', 'withdrawals', 'trades',
  'binary_orders', 'trading_portfolios', 'ai_signals', 'ai_decisions', 'strategies', 'currencies', 'assets', 'deposit_addresses', 'notifications',
  'support_tickets', 'audit_logs', 'platform_statistics', 'ai_engine_state']
const APIS = ['/api/health', '/api/markets', '/api/markets/candles?asset=BTC&interval=1m', '/api/binary/config', '/api/binary/price?asset=BTC',
  '/api/admin/engine', '/api/admin/strategies', '/api/admin/binary/stats?days=7', '/api/withdrawals/turnover', '/api/trade/positions', '/api/admin/trades']

const PAGES: Page[] = [
  ...['/', '/about', '/ai-trading', '/opportunities', '/markets', '/security', '/faq', '/contact', '/risk', '/privacy', '/terms'].map(path => ({ path, group: 'Public' })),
  ...['/login', '/register', '/forgot-password'].map(path => ({ path, group: 'Public', redirect: true })),
  ...['', '/deposit', '/withdraw', '/investments', '/trade', '/signals', '/transactions', '/notifications', '/profile', '/settings', '/support', '/markets', '/ai']
    .map(p => ({ path: `/dashboard${p}`, group: 'User dashboard' })),
  ...['', '/users', '/deposits', '/withdrawals', '/transactions', '/ledger', '/reserves', '/balances', '/opportunities', '/allocations', '/ai', '/signal-engine',
    '/strategies', '/risk', '/wallets', '/currencies', '/notifications', '/statistics', '/settings', '/support', '/audit', '/trades', '/binary']
    .map(p => ({ path: `/admin${p}`, group: 'Admin' })),
]

const ERROR_TEXT = ['Failed to load data', 'حدث خطأ في تحميل البيانات', 'حدث خطأ غير متوقع', 'تعذّر', 'تعذر تحميل', 'Something went wrong']
const WAIT: Record<string, number> = { fast: 3000, normal: 5500, slow: 10000 }

function scanPage(p: Page, waitMs: number): Promise<PageRes> {
  return new Promise(resolve => {
    const f = document.createElement('iframe')
    f.style.cssText = 'position:fixed;left:-9999px;top:0;width:390px;height:800px;border:0;pointer-events:none'
    const errs: string[] = []
    let finished = false
    const end = (status: PageRes['status'], notes: string[]) => {
      if (finished) return
      finished = true
      try { f.remove() } catch { /* ignore */ }
      resolve({ path: p.path, group: p.group, status, notes })
    }
    const hard = setTimeout(() => end('fail', ['Page did not finish loading in 40 seconds']), 40000)
    f.onload = () => {
      const w = f.contentWindow as any
      try {
        w.addEventListener('error', (e: any) => errs.push(`Script error: ${e.message}`))
        w.addEventListener('unhandledrejection', (e: any) => errs.push(`Unhandled: ${e.reason?.message || e.reason}`))
      } catch { /* ignore */ }
      setTimeout(() => {
        clearTimeout(hard)
        try {
          const d = f.contentDocument!
          const text = (d.body?.innerText || '').trim()
          const notes: string[] = []
          let status: PageRes['status'] = 'ok'
          const loc = w.location.pathname
          if (loc !== p.path && !(p.path === '/dashboard' && loc === '/dashboard/')) {
            if (p.redirect) notes.push(`Redirects to ${loc} (normal when logged in)`)
            else { status = 'warn'; notes.push(`Redirected to ${loc} (access denied or page missing)`) }
          }
          const hit = ERROR_TEXT.find(t => text.includes(t))
          if (hit) { status = 'fail'; notes.push(`Page shows an error message ("${hit}")`) }
          for (const n of (w.__netlog || []) as { url: string; status: number; error?: string }[]) {
            status = 'fail'
            notes.push(`${n.status === 0 ? 'Network failure' : `HTTP ${n.status}`}: ${n.url}${n.error ? ` (${n.error})` : ''}`)
          }
          for (const e of errs.slice(0, 3)) { status = 'fail'; notes.push(e) }
          if (text.length < 20 && status === 'ok') { status = 'warn'; notes.push('Page looks empty') }
          if (notes.length === 0) notes.push('Loaded without errors')
          end(status, [...new Set(notes)].slice(0, 8))
        } catch (e: any) { end('fail', [`Could not inspect page: ${e?.message}`]) }
      }, waitMs)
    }
    f.src = p.path
    document.body.appendChild(f)
  })
}

export default function AdminSystem() {
  const [rows, setRows] = useState<R[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [pages, setPages] = useState<PageRes[]>([])
  const [scanning, setScanning] = useState(false)
  const [speed, setSpeed] = useState('normal')
  const [filter, setFilter] = useState('all')
  const stop = useRef(false)

  async function quick() {
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

  async function scanAll() {
    stop.current = false; setScanning(true); setPages([])
    try { await api.get('/api/health') } catch { /* wake the API; failures show per page */ }
    const queue = PAGES.filter(p => p.path !== '/admin/system')
    let i = 0
    const worker = async () => {
      while (!stop.current) {
        const p = queue[i++]
        if (!p) return
        const res = await scanPage(p, WAIT[speed])
        setPages(prev => [...prev, res])
      }
    }
    await Promise.all([worker(), worker()])
    setScanning(false)
  }

  const total = PAGES.length - 1
  const fails = pages.filter(r => r.status === 'fail').length
  const warns = pages.filter(r => r.status === 'warn').length
  const shown = pages.filter(r => filter === 'all' || (filter === 'problems' ? r.status !== 'ok' : r.status === filter))
  const bad = rows?.filter(r => !r.ok).length ?? 0
  const col = { ok: '#10b981', warn: '#f59e0b', fail: '#ef4444' }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>System Check</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', marginBottom: 6, lineHeight: 1.7 }}>
        <b>Scan all pages</b> opens every page as you, read-only, and reports pages that show errors or make failing requests. <b>Quick check</b> tests tables and API routes.
        Permission errors mean a policy is missing. "Network failure" means the API is asleep, down, or blocked by CORS.
      </p>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', marginBottom: 12, wordBreak: 'break-all' }}>API URL: {String(import.meta.env.VITE_API_URL || '(not set)')}</div>

      <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Montserrat', color: '#D4AF37', margin: '8px 0 10px' }}>Scan every page</h2>
      <Chips options={['fast', 'normal', 'slow']} value={speed} onChange={setSpeed} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={scanAll} disabled={scanning} style={{ ...btn('gold', scanning) }}>{scanning ? `Scanning ${pages.length}/${total}…` : 'Scan all pages'}</button>
        {scanning && <button onClick={() => { stop.current = true }} style={{ ...btn('ghost'), width: 100 }}>Stop</button>}
      </div>
      {scanning && <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', marginBottom: 14, overflow: 'hidden' }}><div style={{ width: `${(pages.length / total) * 100}%`, height: '100%', background: '#D4AF37', transition: 'width .3s' }} /></div>}
      {pages.length > 0 && (
        <>
          <div style={{ marginBottom: 10, fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: fails ? '#ef4444' : warns ? '#f59e0b' : '#10b981' }}>
            {pages.length} scanned · {pages.length - fails - warns} ok · {warns} warnings · {fails} failed
          </div>
          <Chips options={['all', 'problems', 'fail', 'warn', 'ok']} value={filter} onChange={setFilter} />
          {['Public', 'User dashboard', 'Admin'].map(g => {
            const list = shown.filter(r => r.group === g)
            if (list.length === 0) return null
            return (
              <div key={g} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat', letterSpacing: 1, margin: '6px 0' }}>{g.toUpperCase()}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {list.map(r => (
                    <div key={r.path} style={{ ...cardCss, cursor: 'default', padding: 12, borderColor: `${col[r.status]}44` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <a href={r.path} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: '#fff', fontFamily: 'Montserrat', wordBreak: 'break-all' }}>{r.path}</a>
                        <Pill text={r.status} color={col[r.status]} />
                      </div>
                      {r.notes.map((n, k) => <div key={k} style={{ fontSize: 11, marginTop: 4, fontFamily: 'Montserrat', color: r.status === 'ok' ? 'rgba(255,255,255,0.4)' : col[r.status], wordBreak: 'break-word' }}>{n}</div>)}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}

      <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Montserrat', color: '#D4AF37', margin: '24px 0 10px' }}>Quick check: tables and API routes</h2>
      <button onClick={quick} disabled={busy} style={{ ...btn('ghost', busy), marginBottom: 14 }}>{busy ? 'Testing…' : 'Run quick check'}</button>
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
