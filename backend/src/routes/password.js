import { Router } from 'express'
import Joi from 'joi'
import crypto from 'crypto'
import { supabase } from '../lib/supabase.js'
import { sendMail, esc } from '../lib/mailer.js'
import { clientIp, logEvent } from '../lib/client.js'

// Forgot-password by emailed 6-digit code (same Resend path as signup). Never reveals whether an email is registered.
const router = Router()
const PEPPER = process.env.OTP_PEPPER || process.env.SUPABASE_SERVICE_ROLE_KEY || 'aq'
const fail = (res, status, message, code) => res.status(status).json({ success: false, error: { message, code } })
const hash = (email, code) => crypto.createHash('sha256').update(`reset:${email}:${code}:${PEPPER}`).digest('hex')
const like = s => s.replace(/[\\%_]/g, m => '\\' + m)

const hits = new Map()
function limited(key, max, ms) {
  const now = Date.now()
  const h = hits.get(key) || { n: 0, at: now }
  if (now - h.at > ms) { h.n = 0; h.at = now }
  h.n++; hits.set(key, h)
  if (hits.size > 5000) hits.clear()
  return h.n > max
}

const startSchema = Joi.object({ email: Joi.string().trim().lowercase().email().max(160).required() })

router.post('/start', async (req, res, next) => {
  try {
    const { value, error } = startSchema.validate(req.body)
    if (error) return fail(res, 400, 'Invalid email', 'BAD_REQUEST')
    if (limited('s' + (clientIp(req) || 'x'), 10, 3600000)) return fail(res, 429, 'Too many attempts. Try again later.', 'RATE_LIMITED')
    const { email } = value
    const same = { success: true, data: { sent: true, cooldown: 60 } }

    const { data: p } = await supabase.from('profiles').select('id, full_name').ilike('email', like(email)).limit(1).maybeSingle()
    if (!p) return res.json(same)

    const { data: prev } = await supabase.from('signup_otps').select('last_sent_at, send_count').eq('email', email).maybeSingle()
    const age = prev ? Date.now() - new Date(prev.last_sent_at).getTime() : Infinity
    if (age < 60000 || (prev && prev.send_count >= 6 && age < 3600000)) return res.json(same)

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0')
    const { error: ue } = await supabase.from('signup_otps').upsert({
      email, code_hash: hash(email, code), expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
      attempts: 0, send_count: (prev?.send_count || 0) + 1, last_sent_at: new Date().toISOString(),
    })
    if (ue) throw ue

    const mail = await sendMail({
      to: email, subject: `${code} — استعادة كلمة المرور | Password reset code`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#0B0B0B;color:#fff;padding:26px;border-radius:14px;border:1px solid #2a2a2a">
        <h2 style="color:#D4AF37;margin:0 0 10px" dir="rtl">مرحباً ${esc(p.full_name || '')}</h2>
        <p dir="rtl" style="line-height:1.8;margin:0 0 16px">رمز استعادة كلمة المرور لحسابك في الثراء كوانتوم:</p>
        <div style="font-size:34px;letter-spacing:10px;font-weight:bold;color:#D4AF37;background:#141414;border:1px solid #D4AF3744;border-radius:10px;padding:14px;text-align:center" dir="ltr">${code}</div>
        <p dir="rtl" style="color:#999;font-size:12px;margin-top:16px;line-height:1.8">ينتهي الرمز خلال 10 دقائق. إن لم تطلبه فتجاهل هذه الرسالة، حسابك بأمان.<br><span dir="ltr">Your code expires in 10 minutes. If you did not request it, ignore this email.</span></p></div>`,
    })
    if (!mail.ok) {
      console.error('[password] email failed:', mail.skipped || mail.error)
      await supabase.from('signup_otps').delete().eq('email', email)
      if (mail.skipped) return fail(res, 503, 'Email service is not set up yet. Please try again later.', 'EMAIL_NOT_CONFIGURED')
      return fail(res, 502, 'Could not send the code. Please try again.', 'EMAIL_FAILED')
    }
    res.json(same)
  } catch (err) { next(err) }
})

const resetSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().max(160).required(),
  code: Joi.string().pattern(/^\d{6}$/).required(),
  password: Joi.string().min(8).max(72).required(),
})

router.post('/reset', async (req, res, next) => {
  try {
    const { value, error } = resetSchema.validate(req.body)
    if (error) return fail(res, 400, error.message, 'BAD_REQUEST')
    if (limited('r' + (clientIp(req) || 'x'), 30, 3600000)) return fail(res, 429, 'Too many attempts. Try again later.', 'RATE_LIMITED')
    const { email, code, password } = value

    const { data: otp } = await supabase.from('signup_otps').select('*').eq('email', email).maybeSingle()
    if (!otp || new Date(otp.expires_at).getTime() < Date.now()) return fail(res, 400, 'The code has expired. Request a new one.', 'CODE_EXPIRED')
    if (otp.attempts >= 5) { await supabase.from('signup_otps').delete().eq('email', email); return fail(res, 429, 'Too many wrong attempts. Request a new code.', 'CODE_EXPIRED') }
    const a = Buffer.from(hash(email, code)), b = Buffer.from(otp.code_hash)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      await supabase.from('signup_otps').update({ attempts: otp.attempts + 1 }).eq('email', email)
      return fail(res, 400, `Wrong code. ${Math.max(0, 4 - otp.attempts)} attempts left.`, 'CODE_INVALID')
    }

    const { data: p } = await supabase.from('profiles').select('id').ilike('email', like(email)).limit(1).maybeSingle()
    if (!p) return fail(res, 400, 'The code has expired. Request a new one.', 'CODE_EXPIRED')
    const { error: ue } = await supabase.auth.admin.updateUserById(p.id, { password })
    if (ue) throw ue
    await supabase.from('signup_otps').delete().eq('email', email)
    await logEvent(supabase, p.id, 'password_reset', req, {})

    sendMail({
      to: email, subject: 'تم تغيير كلمة المرور | Your password was changed',
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#0B0B0B;color:#fff;padding:26px;border-radius:14px;border:1px solid #2a2a2a">
        <p dir="rtl" style="line-height:1.9;margin:0 0 12px">تم تغيير كلمة مرور حسابك في الثراء كوانتوم للتو. إن لم تكن أنت، فتواصل مع الدعم فوراً.</p>
        <p dir="ltr" style="color:#999;font-size:12px;margin:0">Your Al Tharaa Quantum password was just changed. If this was not you, contact support immediately.</p></div>`,
    }).catch(() => {})

    res.json({ success: true, data: { ok: true } })
  } catch (err) { next(err) }
})

export default router
