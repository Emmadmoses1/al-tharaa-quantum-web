import os, re, sys
def rd(p): return open(p, encoding='utf-8').read()
def wr(p, s): open(p, 'w', encoding='utf-8').write(s)
def sub(p, a, b, marker=None, count=1):
    if not os.path.exists(p):
        print('SKIPPED (missing)', p); return
    s = rd(p)
    if marker and marker in s:
        print('SKIPPED (already)', p, marker[:30]); return
    if s.count(a) != count:
        print('FAILED anchor', p, repr(a[:60]), s.count(a)); sys.exit(1)
    wr(p, s.replace(a, b, 1)); print('OK', p)

B, F = 'backend/src/', 'frontend/src/'

sub(B+'lib/secrets.js',
 "  ETHERSCAN_API_KEY:",
 "  NOWPAYMENTS_API_KEY: { label: 'NOWPayments (API key)', help: 'Automatic USDT deposits. From account.nowpayments.io > Store Settings > API keys.' },\n  NOWPAYMENTS_IPN_SECRET: { label: 'NOWPayments (IPN secret)', help: 'From NOWPayments > Store Settings > IPN. Verifies payment notifications.' },\n  ETHERSCAN_API_KEY:",
 'NOWPAYMENTS_API_KEY')

sub(B+'lib/settings.js',
 "  email: { enabled: true,",
 "  payments: { nowpayments_enabled: false, sandbox: false, min_usd: 10, max_usd: 5000 },\n  email: { enabled: true,",
 'nowpayments_enabled')

sub(B+'routes/adminSettings.js',
 "  email: Joi.object(",
 "  payments: Joi.object({ nowpayments_enabled: Joi.boolean(), sandbox: Joi.boolean(), min_usd: Joi.number().min(1).max(100000), max_usd: Joi.number().min(1).max(1000000) }),\n  email: Joi.object(",
 'nowpayments_enabled')

sub(B+'routes/publicSettings.js',
 "const [g, b, r, i, v] = await Promise.all([getSetting('general'), getSetting('bonus'), getSetting('referral'), getSetting('investments'), getSetting('invoice')])",
 "const [g, b, r, i, v, p] = await Promise.all([getSetting('general'), getSetting('bonus'), getSetting('referral'), getSetting('investments'), getSetting('invoice'), getSetting('payments')])",
 "getSetting('payments')")
sub(B+'routes/publicSettings.js',
 "      invoice: { company_name",
 "      payments: { nowpayments: !!p.nowpayments_enabled, min_usd: Number(p.min_usd), max_usd: Number(p.max_usd) },\n      invoice: { company_name",
 'nowpayments: !!p')

sub(B+'routes/adminIntegrations.js',
 "    if (name === 'OPENAI_API_KEY') r =",
 """    if (name === 'NOWPAYMENTS_IPN_SECRET') return res.json({ success: true, data: { ok: true, detail: 'Saved. It is checked on every payment notification.' } })
    if (name === 'NOWPAYMENTS_API_KEY') {
      for (const [host, label] of [['https://api.nowpayments.io', 'live'], ['https://api-sandbox.nowpayments.io', 'sandbox']]) {
        const t = await http(`${host}/v1/currencies`, { headers: { 'x-api-key': key } })
        if (t.status === 200) return res.json({ success: true, data: { ok: true, detail: `Key works (${label})` } })
      }
      return res.json({ success: true, data: { ok: false, detail: 'Rejected by live and sandbox' } })
    }
    if (name === 'OPENAI_API_KEY') r =""",
 'NOWPAYMENTS_IPN_SECRET')

sub(B+'routes/investments.js',
 "status, cover_image_url, projected_return_min",
 "status, cover_image_url, gallery_urls, projected_return_min",
 'gallery_urls')

# index.js
IDX = B+'index.js'
sub(IDX, "import redeemRouter from './routes/redeem.js'\n",
 "import redeemRouter from './routes/redeem.js'\nimport nowpaymentsRouter from './routes/nowpayments.js'\nimport adminPaymentsRouter from './routes/adminPayments.js'\nimport trackRouter from './routes/track.js'\nimport adminAnalyticsRouter from './routes/adminAnalytics.js'\nimport { supabase as sbPrune } from './lib/supabase.js'\n",
 'nowpaymentsRouter')
sub(IDX, "app.use('/api/redeem', redeemRouter)\n",
 "app.use('/api/redeem', redeemRouter)\napp.use('/api/nowpayments', nowpaymentsRouter)\napp.use('/api/admin/nowpayments', adminPaymentsRouter)\napp.use('/api/track', trackRouter)\napp.use('/api/admin/analytics', adminAnalyticsRouter)\n",
 "'/api/nowpayments'")
sub(IDX, "  startLoop('invoices', processInvoices, 20000)\n",
 "  startLoop('invoices', processInvoices, 20000)\n  startLoop('prune-views', async () => { await sbPrune.rpc('prune_page_views') }, 6 * 3600 * 1000)\n",
 'prune-views')

# frontend
sub(F+'lib/useSite.ts',
 "  invoice: { company_name: string;",
 "  payments?: { nowpayments: boolean; min_usd: number; max_usd: number }\n  invoice: { company_name: string;",
 'payments?')

sub(F+'pages/admin/AdminSettings.tsx',
 "  { key: 'email', title: 'Email',",
 """  { key: 'payments', title: 'Payments (NOWPayments)', desc: 'Automatic USDT deposits. Add the keys under API Keys, then switch on here. Webhook address is on the Payments page.', fields: [
    { k: 'nowpayments_enabled', label: 'Accept deposits through NOWPayments', kind: 'bool' },
    { k: 'sandbox', label: 'Sandbox mode (test payments only, no real money)', kind: 'bool' },
    { k: 'min_usd', label: 'Minimum deposit (USD)', kind: 'number' },
    { k: 'max_usd', label: 'Maximum deposit (USD)', kind: 'number' },
  ] },
  { key: 'email', title: 'Email',""",
 "key: 'payments'")

APP = F+'App.tsx'
sub(APP, "import DepositPage from './pages/dashboard/DepositPage'\n",
 "import DepositSwitch from './components/DepositSwitch'\nimport Tracker from './components/Tracker'\nimport AdminPayments from './pages/admin/AdminPayments'\nimport AdminTraffic from './pages/admin/AdminTraffic'\n",
 'DepositSwitch')
sub(APP, "<UserPage><DepositPage /></UserPage>", "<UserPage><DepositSwitch /></UserPage>", 'DepositSwitch />')
sub(APP, "      <SiteNotice />\n", "      <SiteNotice />\n      <Tracker />\n", '<Tracker />')
sub(APP, '        <Route path="/admin/integrations" element={<AdminPage><AdminIntegrations /></AdminPage>} />\n',
 '        <Route path="/admin/integrations" element={<AdminPage><AdminIntegrations /></AdminPage>} />\n        <Route path="/admin/payments" element={<AdminPage><AdminPayments /></AdminPage>} />\n        <Route path="/admin/traffic" element={<AdminPage><AdminTraffic /></AdminPage>} />\n',
 '/admin/payments')

sub(F+'components/layout/AdminLayout.tsx',
 "    { icon: Database, label: 'API Keys', href: '/admin/integrations' },\n",
 "    { icon: Database, label: 'API Keys', href: '/admin/integrations' },\n    { icon: Wallet, label: 'Payments', href: '/admin/payments' },\n    { icon: BarChart2, label: 'Traffic', href: '/admin/traffic' },\n",
 "'/admin/payments'")

OP = F+'pages/admin/AdminOpportunities.tsx'
sub(OP, "status: 'draft', cover_image_url: '',\n}", "status: 'draft', cover_image_url: '', gallery_urls: '',\n}", 'gallery_urls')
sub(OP, "      cover_image_url: String(opp.cover_image_url || ''),\n    })",
 "      cover_image_url: String(opp.cover_image_url || ''),\n      gallery_urls: Array.isArray(opp.gallery_urls) ? (opp.gallery_urls as string[]).join('\\n') : '',\n    })", 'gallery_urls: Array')
sub(OP, "      cover_image_url: form.cover_image_url || null,\n    }",
 "      cover_image_url: form.cover_image_url || null,\n      gallery_urls: form.gallery_urls.split('\\n').map(s => s.trim()).filter(Boolean).slice(0, 12),\n    }", 'gallery_urls: form.gallery_urls')

INV = F+'pages/dashboard/InvestmentsPage.tsx'
sub(INV, """        {opp.cover_image_url ? (
          <img src={opp.cover_image_url} alt={opp.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (""",
 """        {opp.cover_image_url ? (
          <GalleryCover name={opp.name} cover={opp.cover_image_url} gallery={(opp as unknown as { gallery_urls?: string[] }).gallery_urls || []} />
        ) : (""", 'GalleryCover name')
sub(INV, "import RedeemButton from '../../components/RedeemButton'\n",
 "import RedeemButton from '../../components/RedeemButton'\nimport GalleryCover from '../../components/GalleryCover'\n", "import GalleryCover")

CSS_BLOCK = '''
/* ── Phase 12 polish ── */
::selection { background: rgba(212,175,55,0.35); color: #fff; }
.glass-card { transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease; }
@media (hover: hover) {
  .glass-card:hover { transform: translateY(-2px); border-color: rgba(212,175,55,0.35); box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
}
a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, summary:focus-visible {
  outline: 2px solid #D4AF37; outline-offset: 2px;
}
button:not(:disabled):active { transform: scale(0.97); }
.dl-content { padding-bottom: max(16px, env(safe-area-inset-bottom)); }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
  .glass-card:hover { transform: none; }
}
'''
CSS = F+'styles/globals.css'
s = rd(CSS)
if 'Phase 12 polish' in s: print('SKIPPED css')
else: wr(CSS, s + CSS_BLOCK); print('OK css')
print('PATCH12 DONE')
