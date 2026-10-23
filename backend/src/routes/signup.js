import { Router } from 'express'
import Joi from 'joi'
import crypto from 'crypto'
import { supabase } from '../lib/supabase.js'
import { sendMail, esc } from '../lib/mailer.js'
import { clientIp, clientCountry, logEvent } from '../lib/client.js'

const router = Router()
const PEPPER = process.env.OTP_PEPPER || process.env.SUPABASE_SERVICE_ROLE_KEY || 'aq'
const fail = (res, status, message, code) => res.status(status).json({ success: false, error: { message, code } })
const hash = (email, code) => crypto.createHash('sha256').update(`${email}:${code}:${PEPPER}`).digest('hex')

// light per-IP limiter
const hits = new Map()
function limited(ip, max, ms) {
  const now = Date.now()
  const h = hits.get(ip) || { n: 0, at: now }
  if (now - h.at > ms) { h.n = 0; h.at = now }
  h.n++; hits.set(ip, h)
  if (hits.size > 5000) hits.clear()
  return h.n > max
}

const startSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().max(160).required(),
  full_name: Joi.string().trim().min(2).max(120).required(),
})

router.post('/start', async (req, res, next) => {
  try {
    const { value, error } = startSchema.validate(req.body)
    if (error) return fail(res, 400, 'Invalid name or email', 'BAD_REQUEST')
    if (limited(clientIp(req) || 'x', 10, 3600000)) return fail(res, 429, 'Too many attempts. Try again later.', 'RATE_LIMITED')
    const { email, full_name } = value

    const { data: exists } = await supabase.from('profiles').select('id').ilike('email', email).limit(1)
    if (exists && exists.length) return fail(res, 409, 'This email is already registered', 'EMAIL_EXISTS')

    const { data: prev } = await supabase.from('signup_otps').select('last_sent_at, send_count').eq('email', email).maybeSingle()
    if (prev && Date.now() - new Date(prev.last_sent_at).getTime() < 60000) return fail(res, 429, 'Wait a minute before requesting another code', 'COOLDOWN')
    if (prev && prev.send_count >= 6 && Date.now() - new Date(prev.last_sent_at).getTime() < 3600000) return fail(res, 429, 'Too many codes requested. Try again in an hour.', 'RATE_LIMITED')

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0')
    const { error: ue } = await supabase.from('signup_otps').upsert({
      email, code_hash: hash(email, code), expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
      attempts: 0, send_count: (prev?.send_count || 0) + 1, last_sent_at: new Date().toISOString(),
    })
    if (ue) throw ue

    const mail = await sendMail({
      to: email, subject: `${code} — رمز التحقق | Verification code`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#0B0B0B;color:#fff;padding:26px;border-radius:14px;border:1px solid #2a2a2a">
        <h2 style="color:#D4AF37;margin:0 0 10px" dir="rtl">مرحباً ${esc(full_name)}</h2>
        <p dir="rtl" style="line-height:1.8;margin:0 0 16px">رمز التحقق لإنشاء حسابك في الثراء كوانتوم:</p>
        <div style="font-size:34px;letter-spacing:10px;font-weight:bold;color:#D4AF37;background:#141414;border:1px solid #D4AF3744;border-radius:10px;padding:14px;text-align:center" dir="ltr">${code}</div>
        <p dir="rtl" style="color:#999;font-size:12px;margin-top:16px;line-height:1.8">ينتهي الرمز خلال 10 دقائق. إن لم تطلبه فتجاهل هذه الرسالة.<br><span dir="ltr">Your code expires in 10 minutes. If you did not request it, ignore this email.</span></p></div>`,
    })
    if (!mail.ok) {
      console.error('[signup] email failed:', mail.skipped || mail.error)
      await supabase.from('signup_otps').delete().eq('email', email)
      if (mail.skipped) return fail(res, 503, 'Email service is not set up yet. Please try again later.', 'EMAIL_NOT_CONFIGURED')
      return fail(res, 502, 'Could not send the code. Check the email address and try again.', 'EMAIL_FAILED')
    }
    res.json({ success: true, data: { sent: true, cooldown: 60 } })
  } catch (err) { next(err) }
})

const verifySchema = Joi.object({
  email: Joi.string().trim().lowercase().email().max(160).required(),
  code: Joi.string().pattern(/^\d{6}$/).required(),
  password: Joi.string().min(8).max(72).required(),
  full_name: Joi.string().trim().min(2).max(120).required(),
  device: Joi.object({ id: Joi.string().trim().min(8).max(80).required(), fp: Joi.string().trim().max(80).allow('', null) }).required(),
})

router.post('/verify', async (req, res, next) => {
  try {
    const { value, error } = verifySchema.validate(req.body)
    if (error) return fail(res, 400, error.message, 'BAD_REQUEST')
    const ip = clientIp(req)
    if (limited('v' + (ip || 'x'), 30, 3600000)) return fail(res, 429, 'Too many attempts. Try again later.', 'RATE_LIMITED')
    const { email, code, password, full_name, device } = value

    const { data: otp } = await supabase.from('signup_otps').select('*').eq('email', email).maybeSingle()
    if (!otp || new Date(otp.expires_at).getTime() < Date.now()) return fail(res, 400, 'The code has expired. Request a new one.', 'CODE_EXPIRED')
    if (otp.attempts >= 5) { await supabase.from('signup_otps').delete().eq('email', email); return fail(res, 429, 'Too many wrong attempts. Request a new code.', 'CODE_EXPIRED') }
    const a = Buffer.from(hash(email, code)), b = Buffer.from(otp.code_hash)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      await supabase.from('signup_otps').update({ attempts: otp.attempts + 1 }).eq('email', email)
      return fail(res, 400, `Wrong code. ${Math.max(0, 4 - otp.attempts)} attempts left.`, 'CODE_INVALID')
    }

    const { data: created, error: ce } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })
    if (ce || !created?.user) {
      if (/already|registered|exists/i.test(ce?.message || '')) return fail(res, 409, 'This email is already registered', 'EMAIL_EXISTS')
      throw ce || new Error('createUser failed')
    }
    const uid = created.user.id
    await supabase.from('signup_otps').delete().eq('email', email)

    const country = await clientCountry(req)
    const fp = device.fp || null

    // Same device already used by another (non-admin) account -> suspend the new one, flag the old one(s).
    const { data: onDevice } = await supabase.from('device_accounts').select('user_id').eq('device_id', device.id).neq('user_id', uid)
    let others = []
    if (onDevice?.length) {
      const { data: ps } = await supabase.from('profiles').select('id, email, role').in('id', [...new Set(onDevice.map(d => d.user_id))])
      others = (ps || []).filter(p => p.role === 'user')
    }
    let update = { full_name, country, signup_ip: ip }
    let suspended = false
    if (others.length) {
      suspended = true
      update = { ...update, account_status: 'suspended', suspended_at: new Date().toISOString(), flagged: true,
        suspended_reason: 'Multiple accounts on one device', flag_reason: `Same device as: ${others.map(o => o.email).join(', ')}` }
      await supabase.auth.admin.updateUserById(uid, { ban_duration: '876000h' })
      await supabase.from('profiles').update({ flagged: true, flag_reason: `Another account (${email}) was created on this device` }).in('id', others.map(o => o.id))
      for (const o of others) await logEvent(supabase, o.id, 'device_shared', req, { new_account: email })
    } else if (fp && ip) {
      const { data: soft } = await supabase.from('device_accounts').select('user_id').eq('fp', fp).eq('ip', ip).neq('user_id', uid).limit(1)
      if (soft?.length) update = { ...update, flagged: true, flag_reason: 'Same browser fingerprint and IP as another account' }
    }
    await supabase.from('profiles').update(update).eq('id', uid)
    await supabase.from('device_accounts').upsert({ device_id: device.id, fp, user_id: uid, ip, last_seen: new Date().toISOString() }, { onConflict: 'device_id,user_id' })
    await logEvent(supabase, uid, suspended ? 'signup_suspended' : 'signup', req, { country, device: device.id.slice(0, 8) })

    res.json({ success: true, data: { ok: true, suspended } })
  } catch (err) { next(err) }
})

export default router
