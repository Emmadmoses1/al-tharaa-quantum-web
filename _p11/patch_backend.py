def sub(p, pairs, prepend=None):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:80], s.count(a))
        s = s.replace(a, b, 1)
    if prepend: s = prepend + s
    open(p, 'w', encoding='utf-8').write(s)

B = 'backend/src/'
sub(B + 'services/chain.js', [
 ("  const h = process.env.TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY } : {}\n",
  "  const tk = await getSecret('TRONGRID_API_KEY')\n  const h = tk ? { 'TRON-PRO-API-KEY': tk } : {}\n"),
 ("  const key = process.env.ETHERSCAN_API_KEY\n  if (!key) throw new Error('ETHERSCAN_API_KEY is not set')\n",
  "  const key = await getSecret('ETHERSCAN_API_KEY')\n  if (!key) throw new Error('ETHERSCAN_API_KEY is not set. Add it in Admin > Integrations.')\n"),
], "import { getSecret } from '../lib/secrets.js'\n")
sub(B + 'services/reserves.js', [
 ("    const h = process.env.TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY } : {}\n",
  "    const tk = await getSecret('TRONGRID_API_KEY')\n    const h = tk ? { 'TRON-PRO-API-KEY': tk } : {}\n"),
 ("  const k = process.env.ETHERSCAN_API_KEY\n  if (!k) throw new Error('ETHERSCAN_API_KEY is not set')\n",
  "  const k = await getSecret('ETHERSCAN_API_KEY')\n  if (!k) throw new Error('ETHERSCAN_API_KEY is not set. Add it in Admin > Integrations.')\n"),
], "import { getSecret } from '../lib/secrets.js'\n")
sub(B + 'routes/withdrawals.js', [
 ("    const { withdrawal_type, asset, network, amount, destination_address } = req.body\n",
  "    const { withdrawal_type, asset, network, amount, destination_address } = req.body\n    const gen = await getSetting('general')\n    if (gen.maintenance) return bad(res, gen.maintenance_message || 'The platform is under maintenance. Withdrawals are paused.', 'MAINTENANCE')\n"),
], "import { getSetting } from '../lib/settings.js'\n")

import os
if os.path.exists(B + 'routes/binary.js'):
    sub(B + 'routes/binary.js', [
     ("    if (!cfg.enabled) return res.status(400).json({ success: false, error: { message: 'Trading is temporarily paused', code: 'PAUSED' } })\n",
      "    const gen = await getSetting('general')\n    if (gen.maintenance) return res.status(503).json({ success: false, error: { message: gen.maintenance_message || 'The platform is under maintenance.', code: 'MAINTENANCE' } })\n    if (!cfg.enabled) return res.status(400).json({ success: false, error: { message: 'Trading is temporarily paused', code: 'PAUSED' } })\n"),
    ], "import { getSetting } from '../lib/settings.js'\n")

IDX = B + 'index.js'
sub(IDX, [
 ("import binaryRouter from './routes/binary.js'\n",
  "import binaryRouter from './routes/binary.js'\nimport { processInvoices } from './services/invoiceMailer.js'\nimport publicSettingsRouter from './routes/publicSettings.js'\nimport adminIntegrationsRouter from './routes/adminIntegrations.js'\nimport adminSettingsRouter from './routes/adminSettings.js'\nimport aiRouter from './routes/ai.js'\nimport opportunityImagesRouter from './routes/opportunityImages.js'\nimport bonusRouter from './routes/bonus.js'\nimport referralRouter from './routes/referral.js'\nimport userSettingsRouter from './routes/userSettings.js'\nimport redeemRouter from './routes/redeem.js'\n"),
 ("app.use('/api/binary', binaryRouter)\n",
  "app.use('/api/binary', binaryRouter)\napp.use('/api/public/settings', publicSettingsRouter)\napp.use('/api/admin/integrations', adminIntegrationsRouter)\napp.use('/api/admin/settings', adminSettingsRouter)\napp.use('/api/admin/ai', aiRouter)\napp.use('/api/admin/opportunity-images', opportunityImagesRouter)\napp.use('/api/bonus', bonusRouter)\napp.use('/api/referral', referralRouter)\napp.use('/api/settings', userSettingsRouter)\napp.use('/api/redeem', redeemRouter)\n"),
 ("  startLoop('binary', settleBinary, 2000)\n",
  "  startLoop('binary', settleBinary, 2000)\n  startLoop('invoices', processInvoices, 20000)\n"),
])
print('backend patched')
