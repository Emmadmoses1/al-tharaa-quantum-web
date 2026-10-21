import { Router } from 'express'
import { getSetting } from '../lib/settings.js'

const router = Router()
// No login needed: only values that are safe to show everyone
router.get('/', async (_req, res, next) => {
  try {
    const [g, b, r, i, v] = await Promise.all([getSetting('general'), getSetting('bonus'), getSetting('referral'), getSetting('investments'), getSetting('invoice')])
    res.json({ success: true, data: {
      platform_name: g.platform_name, support_email: g.support_email, maintenance: !!g.maintenance, maintenance_message: g.maintenance_message,
      bonus: { enabled: !!b.enabled, usd: Number(b.usd) },
      referral: { enabled: !!r.enabled && Number(r.reward_usdt) > 0, reward_usdt: Number(r.reward_usdt) },
      investments: { early_redeem_enabled: !!i.early_redeem_enabled, early_redeem_penalty_percent: Number(i.early_redeem_penalty_percent) },
      invoice: { company_name: v.company_name, address: v.address, tax_id: v.tax_id, footer: v.footer },
    } })
  } catch (err) { next(err) }
})
export default router
