import { Router } from 'express'
import crypto from 'crypto'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'
import { sendMail, esc, emailLogo } from '../lib/mailer.js'

// Sits in front of /api/withdrawals. A withdrawal to an address the user has never used must first be
// confirmed from the account's email. Addresses with a completed/approved withdrawal are trusted automatically.
const router = Router()
router.use(requireAuth)

const sha = t => crypto.createHash('sha256').update(t).digest('hex')
const fail = (res, status, message, code) => res.status(status).json({ success: false, error: { message, code } })

async function isTrusted(userId, address) {
  const lc = address.toLowerCase()
  const { data: t } = await supabase.from('trusted_withdrawal_addresses').select('id').eq('user_id', userId).eq('address_lc', lc).limit(1)
  if (t && t.length) return true
  const { data: w } = await supabase.from('withdrawals').select('id, destination_address')
    .eq('user_id', userId).in('status', ['approved', 'processing', 'completed']).ilike('destination_address', address).limit(1)
  return !!(w && w.length)
}

router.post('/confirm', async (req, res, next) => {
  try {
    const token = String(req.body?.token || '')
    if (!/^[0-9a-f]{64}$/.test(token)) return fail(res, 400, 'Invalid link. رابط غير صالح.', 'INVALID_TOKEN')
    const h = sha(token)
    const { data: row } = await supabase.from('withdrawal_address_tokens').select('*').eq('token_hash', h).maybeSingle()
    if (!row || row.user_id !== req.user.id) return fail(res, 400, 'This link is not valid for your account. الرابط غير صالح لحسابك.', 'INVALID_TOKEN')
    if (row.used_at) return res.json({ success: true, data: { address: row.address, already: true } })
    if (new Date(row.expires_at).getTime() < Date.now()) return fail(res, 400, 'This link has expired. Submit the withdrawal again to get a new one. انتهت صلاحية الرابط.', 'EXPIRED')
    const { error } = await supabase.from('trusted_withdrawal_addresses')
      .upsert({ user_id: req.user.id, address_lc: row.address.toLowerCase(), network: row.network }, { onConflict: 'user_id,address_lc' })
    if (error) throw error
    await supabase.from('withdrawal_address_tokens').update({ used_at: new Date().toISOString() }).eq('token_hash', h)
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'WITHDRAWAL_ADDRESS_CONFIRMED', entity: 'trusted_withdrawal_addresses', metadata: { network: row.network } })
    res.json({ success: true, data: { address: row.address } })
  } catch (err) { next(err) }
})

router.post('/', async (req, res, next) => {
  try {
    const address = String(req.body?.destination_address || '').trim()
    const network = String(req.body?.network || '')
    // Anything malformed goes straight to the real handler, which returns the proper validation error.
    if (address.length < 20 || address.length > 100 || !network) return next()
    const userId = req.user.id
    if (await isTrusted(userId, address)) return next()

    const since = new Date(Date.now() - 3600_000).toISOString()
    const { count } = await supabase.from('withdrawal_address_tokens').select('token_hash', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', since)
    if ((count || 0) >= 5) return fail(res, 429, 'Too many confirmation emails. Try again in an hour. محاولات كثيرة، حاول بعد ساعة.', 'RATE_LIMITED')

    const { data: p } = await supabase.from('profiles').select('email, full_name').eq('id', userId).maybeSingle()
    const to = p?.email || req.user.email
    if (!to) return next()

    const token = crypto.randomBytes(32).toString('hex')
    const base = (process.env.FRONTEND_URL || '').replace(/\/$/, '')
    const link = `${base}/dashboard/confirm-address?t=${token}`
    const short = `${address.slice(0, 6)}…${address.slice(-6)}`
    const sent = await sendMail({
      to, subject: 'Confirm your new withdrawal address · تأكيد عنوان السحب الجديد',
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">${emailLogo()}
<h2 style="margin:0 0 10px">Confirm new withdrawal address</h2>
<p style="color:#444;line-height:1.7">You asked to withdraw to a new ${esc(network)} address: <b>${esc(short)}</b>.<br>If this was you, confirm it below. The link works for 30 minutes.</p>
<p><a href="${esc(link)}" style="display:inline-block;background:#D4AF37;color:#111;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Confirm address</a></p>
<p dir="rtl" style="color:#444;line-height:1.9">طلبت السحب إلى عنوان ${esc(network)} جديد: <b>${esc(short)}</b>. إذا كنت أنت، أكّد العنوان من الزر أعلاه. الرابط صالح لمدة 30 دقيقة.</p>
<p style="color:#b00;font-size:13px">If this was not you, do NOT click. Change your password immediately. · إن لم تكن أنت فلا تضغط وغيّر كلمة المرور فوراً.</p></div>`,
    })
    // If email is not working (no key / unverified domain), do not lock users out of withdrawing.
    if (!sent.ok) {
      await supabase.from('audit_logs').insert({ user_id: userId, action: 'WITHDRAWAL_ADDRESS_GATE_SKIPPED', entity: 'withdrawals', metadata: { reason: sent.skipped || sent.error || 'mail_failed' } })
      return next()
    }
    await supabase.from('withdrawal_address_tokens').insert({ token_hash: sha(token), user_id: userId, address, network, expires_at: new Date(Date.now() + 30 * 60_000).toISOString() })
    return fail(res, 403, 'New address. We sent a confirmation link to your email. Open it, then submit the withdrawal again. عنوان جديد: أرسلنا رابط تأكيد إلى بريدك. افتحه ثم أعد تقديم طلب السحب.', 'ADDRESS_CONFIRMATION_REQUIRED')
  } catch (err) { next(err) }
})

export default router
