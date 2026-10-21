import re, sys, os
R = 'frontend'
def rw(path, fn):
    p = os.path.join(R, path)
    s = open(p, encoding='utf-8').read()
    s2 = fn(s)
    assert s2 != s, f'no change {path}'
    open(p, 'w', encoding='utf-8').write(s2)
def sub1(s, old, new):
    assert s.count(old) == 1, f'anchor count {s.count(old)}: {old[:50]}'
    return s.replace(old, new)

# App.tsx
def app(s):
    if 'InvoicesPage' in s: return s
    s = sub1(s, "import SettingsPage from './pages/dashboard/SettingsPage'\n",
      "import SettingsPage from './pages/dashboard/SettingsPage'\nimport InvoicesPage, { InvoiceDetail } from './pages/dashboard/InvoicesPage'\nimport AdminIntegrations from './pages/admin/AdminIntegrations'\nimport SiteNotice from './components/SiteNotice'\nimport WelcomeBonus from './components/WelcomeBonus'\nimport InstallButton from './components/InstallButton'\n")
    s = sub1(s, '        <Route path="/dashboard/settings" element={<UserPage><SettingsPage /></UserPage>} />\n',
      '        <Route path="/dashboard/settings" element={<UserPage><SettingsPage /></UserPage>} />\n        <Route path="/dashboard/invoices" element={<UserPage><InvoicesPage /></UserPage>} />\n        <Route path="/dashboard/invoices/:id" element={<UserPage><InvoiceDetail /></UserPage>} />\n')
    s = sub1(s, '        <Route path="/admin/settings" element={<AdminPage><AdminSettings /></AdminPage>} />\n',
      '        <Route path="/admin/settings" element={<AdminPage><AdminSettings /></AdminPage>} />\n        <Route path="/admin/integrations" element={<AdminPage><AdminIntegrations /></AdminPage>} />\n')
    s = sub1(s, '    <AuthProvider>\n      <Routes>', '    <AuthProvider>\n      <SiteNotice />\n      <WelcomeBonus />\n      <InstallButton />\n      <Routes>')
    return s
rw('src/App.tsx', app)

rw('src/components/layout/AdminLayout.tsx', lambda s: sub1(s,
  "    { icon: Settings, label: 'Settings', href: '/admin/settings' },\n",
  "    { icon: Settings, label: 'Settings', href: '/admin/settings' },\n    { icon: Database, label: 'API Keys', href: '/admin/integrations' },\n"))

rw('src/components/layout/DashboardSidebar.tsx', lambda s: sub1(s,
  "  { icon: Receipt, label: 'المعاملات', href: '/dashboard/transactions' },\n",
  "  { icon: Receipt, label: 'الفواتير', href: '/dashboard/invoices' },\n  { icon: Receipt, label: 'المعاملات', href: '/dashboard/transactions' },\n"))

def opp(s):
    s = sub1(s, "  fees_percent: '1.5', status: 'draft',\n}", "  fees_percent: '1.5', status: 'draft', cover_image_url: '',\n}")
    s = sub1(s, "      status: String(opp.status || 'draft'),\n    })", "      status: String(opp.status || 'draft'),\n      cover_image_url: String(opp.cover_image_url || ''),\n    })")
    s = sub1(s, "      status: form.status,\n    }\n", "      status: form.status,\n      cover_image_url: form.cover_image_url || null,\n    }\n")
    s = sub1(s, "              <div>\n                <label style={labelStyle}>DESCRIPTION (EN)</label>", "              <OpportunityMedia form={form} setF={setF} />\n\n              <div>\n                <label style={labelStyle}>DESCRIPTION (EN)</label>")
    i = s.index('\nexport default function')
    j = s.rfind('\nimport ', 0, i)
    k = s.index('\n', j + 1)
    return s[:k+1] + "import OpportunityMedia from '../../components/OpportunityMedia'\n" + s[k+1:]
rw('src/pages/admin/AdminOpportunities.tsx', opp)

rw('src/pages/dashboard/InvestmentsPage.tsx', lambda s: sub1(s, "                {gain !== 0 && (",
  "                <RedeemButton id={alloc.id} status={alloc.status} amount={Number(alloc.amount_invested)} />\n                {gain !== 0 && (")
  .replace("\nexport default function", "\nimport RedeemButton from '../../components/RedeemButton'\n\nexport default function", 1) if 'RedeemButton' not in s else s)
print('frontend patched')
