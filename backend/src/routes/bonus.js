import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'
import { getSetting } from '../lib/settings.js'

const router = Router()
router.use(requireAuth)

async function usdRate(base, quote) {
  const { data } = await supabase.from('currency_rates').select('rate').eq('base_currency', base).eq('quote_currency', quote).maybeSingle()
  return data?.rate ? Number(data.rate) : null
}

router.post('/claim', async (req, res, next) => {
  try {
    const uid = req.user.id
    const s = await getSetting('bonus')
    if (!s.enabled || !(Number(s.usd) > 0)) return res.json({ success: true, data: { claimed: false, reason: 'disabled' } })
    const { data: had } = await supabase.from('bonuses').select('id').eq('user_id', uid).eq('type', 'welcome').maybeSingle()
    if (had) return res.json({ success: true, data: { claimed: false, reason: 'already' } })
    if (s.require_email_confirmed && !req.user.email_confirmed_at) return res.json({ success: true, data: { claimed: false, reason: 'confirm_email' } })
    if (Number(s.daily_cap) > 0) {
      const day = new Date(); day.setUTCHours(0, 0, 0, 0)
      const { count } = await supabase.from('bonuses').select('id', { count: 'exact', head: true }).eq('type', 'welcome').gte('created_at', day.toISOString())
      if ((count || 0) >= Number(s.daily_cap)) return res.json({ success: true, data: { claimed: false, reason: 'daily_cap' } })
    }
    // $5 is converted at the USDT/USD rate (1 if no rate row exists)
    const rate = (await usdRate('USDT', 'USD')) || 1
    const amount = Math.round((Number(s.usd) / rate) * 1e8) / 1e8
    const { data, error } = await supabase.rpc('grant_bonus', { p_user: uid, p_type: 'welcome', p_usd: s.usd, p_asset: 'USDT', p_amount: amount, p_rate: rate })
    if (error) throw error
    if (!data) return res.json({ success: true, data: { claimed: false, reason: 'already' } })

    const { data: prof } = await supabase.from('profiles').select('preferred_currency').eq('id', uid).single()
    let local = null
    if (prof?.preferred_currency && prof.preferred_currency !== 'USD') {
      const lr = await usdRate('USD', prof.preferred_currency)
      if (lr) local = { currency: prof.preferred_currency, amount: Math.round(Number(s.usd) * lr * 100) / 100 }
    }
    await supabase.from('notifications').insert({
      user_id: uid, type: 'bonus', title: 'Welcome bonus added', title_ar: 'تمت إضافة مكافأة الترحيب',
      message: `${amount} USDT (about $${s.usd}) was added to your trading wallet. It unlocks for withdrawal after you trade 4x its value.`,
      message_ar: `أُضيف ${amount} USDT (حوالي ${s.usd}$) إلى محفظة التداول. يُفتح السحب بعد تداول 4 أضعاف قيمتها.`,
    })
    res.json({ success: true, data: { claimed: true, usd: Number(s.usd), amount, asset: 'USDT', local } })
  } catch (err) { next(err) }
})

export default router
