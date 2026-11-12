import { Router } from 'express'
import Joi from 'joi'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/authGuard.js'
import { clientIp, clientCountry, logEvent } from '../lib/client.js'
import { newLoginAlert } from '../lib/securityAlerts.js'

const router = Router()
router.use(requireAuth)

const sessionSchema = Joi.object({
  device: Joi.object({ id: Joi.string().trim().min(8).max(80).required(), fp: Joi.string().trim().max(80).allow('', null) }),
})

// Called once per browser session after login: records country/device and reports account state.
router.post('/session', async (req, res, next) => {
  try {
    const { value, error } = sessionSchema.validate(req.body || {})
    if (error) return res.status(400).json({ success: false, error: { message: 'Bad request', code: 'BAD_REQUEST' } })
    const uid = req.user.id
    const ip = clientIp(req)
    const country = await clientCountry(req)
    const { data: me } = await supabase.from('profiles').select('role, country, account_status, flagged').eq('id', uid).single()
    const patch = {}
    if (country && me?.country !== country) patch.country = country
    if (value.device && me?.role === 'user') {
      const { id, fp } = value.device
      const { data: mine } = await supabase.from('device_accounts').select('id').eq('device_id', id).eq('user_id', uid).maybeSingle()
      if (!mine) {
        const { data: onDevice } = await supabase.from('device_accounts').select('user_id').eq('device_id', id).neq('user_id', uid)
        if (onDevice?.length) {
          const { data: ps } = await supabase.from('profiles').select('id, role').in('id', [...new Set(onDevice.map(d => d.user_id))])
          if ((ps || []).some(p => p.role === 'user')) { patch.flagged = true; patch.flag_reason = 'Logged in from a device used by another account' }
        }
      }
      await supabase.from('device_accounts').upsert({ device_id: id, fp: fp || null, user_id: uid, ip, last_seen: new Date().toISOString() }, { onConflict: 'device_id,user_id' })
    }
    if (Object.keys(patch).length) await supabase.from('profiles').update(patch).eq('id', uid)
    await newLoginAlert(supabase, uid, req, country).catch(e => console.error('[security] alert failed:', e.message))
    await logEvent(supabase, uid, 'login', req, { country })
    res.json({ success: true, data: { account_status: me?.account_status || 'active' } })
  } catch (err) { next(err) }
})

// After the browser uploads a photo to the avatars bucket, the server records its public URL.
router.post('/avatar', async (req, res, next) => {
  try {
    const path = String(req.body?.path || '')
    if (!new RegExp(`^${req.user.id}/[A-Za-z0-9._-]{1,80}$`).test(path)) return res.status(400).json({ success: false, error: { message: 'Bad path', code: 'BAD_REQUEST' } })
    const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/avatars/${path}`
    const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', req.user.id)
    if (error) throw error
    await logEvent(supabase, req.user.id, 'avatar_changed', req, {})
    res.json({ success: true, data: { avatar_url: url } })
  } catch (err) { next(err) }
})

// The browser uploads a live selfie to the private bucket, then tells the server which file. It waits for admin review.
router.post('/face', async (req, res, next) => {
  try {
    const path = String(req.body?.path || '')
    const challenge = String(req.body?.challenge || '').slice(0, 120)
    if (!new RegExp(`^${req.user.id}/[A-Za-z0-9._-]{1,80}$`).test(path)) return res.status(400).json({ success: false, error: { message: 'Bad path', code: 'BAD_REQUEST' } })
    const name = path.split('/')[1]
    const { data: files } = await supabase.storage.from('face-verifications').list(req.user.id, { search: name, limit: 5 })
    if (!files || !files.some(f => f.name === name)) return res.status(400).json({ success: false, error: { message: 'Photo not found. Please try again.', code: 'BAD_REQUEST' } })
    const { data: me } = await supabase.from('profiles').select('face_status').eq('id', req.user.id).single()
    if (me?.face_status === 'approved') return res.json({ success: true, data: { face_status: 'approved' } })
    const { error } = await supabase.from('profiles').update({
      face_status: 'pending', face_path: path, face_challenge: challenge, face_submitted_at: new Date().toISOString(), face_reject_reason: null,
    }).eq('id', req.user.id)
    if (error) throw error
    await logEvent(supabase, req.user.id, 'face_submitted', req, {})
    res.json({ success: true, data: { face_status: 'pending' } })
  } catch (err) { next(err) }
})

export default router
