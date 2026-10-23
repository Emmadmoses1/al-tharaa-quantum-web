import { Router } from 'express'
import { getSetting } from '../lib/settings.js'
import { supabase } from '../lib/supabase.js'

const router = Router()
let usersCache = { at: 0, n: null }
async function userCount() {
  if (Date.now() - usersCache.at < 300000) return usersCache.n
  const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
  usersCache = { at: Date.now(), n: count ?? null }
  return usersCache.n
}
// No login needed: only values that are safe to show everyone
router.get('/', async (_req, res, next) => {
  try {
    const pub = await getSetting('public')
    const users = pub.show_users ? await userCount() : null
    const [g, b, r, i, v, p] = await Promise.all([getSetting('general'), getSetting('bonus'), getSetting('referral'), getSetting('investments'), getSetting('invoice'), getSetting('payments')])
    res.json({ success: true, data: {
      platform_name: g.platform_name, support_email: g.support_email, maintenance: !!g.maintenance, maintenance_message: g.maintenance_message,
      bonus: { enabled: !!b.enabled, usd: Number(b.usd) },
      referral: { enabled: !!r.enabled && Number(r.reward_usdt) > 0, reward_usdt: Number(r.reward_usdt) },
      investments: { early_redeem_enabled: !!i.early_redeem_enabled, early_redeem_penalty_percent: Number(i.early_redeem_penalty_percent) },
      payments: { nowpayments: !!p.nowpayments_enabled, card: !!p.card_enabled && !!p.nowpayments_enabled, min_usd: Number(p.min_usd), max_usd: Number(p.max_usd) },
      license_text: String(g.license_text || ''),
      public: { users },
      invoice: { company_name: v.company_name, address: v.address, tax_id: v.tax_id, footer: v.footer },
    } })
  } catch (err) { next(err) }
})
export default router
