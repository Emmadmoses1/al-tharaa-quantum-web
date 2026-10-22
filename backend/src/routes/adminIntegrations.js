import { Router } from 'express'
import Joi from 'joi'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'
import { SECRET_NAMES, encrypt, getSecret, clearSecretCache, secretStatus } from '../lib/secrets.js'

const router = Router()
router.use(requireAdmin)
const fail = (res, code, message, c = 'BAD_REQUEST') => res.status(code).json({ success: false, error: { message, code: c } })
const superOnly = (req, res) => { if (req.userRole !== 'super_admin') { fail(res, 403, 'Only a super admin can manage API keys', 'FORBIDDEN'); return false } return true }

router.get('/', async (req, res, next) => {
  try {
    if (!superOnly(req, res)) return
    res.json({ success: true, data: await secretStatus() })
  } catch (err) { next(err) }
})

router.patch('/:name', async (req, res, next) => {
  try {
    if (!superOnly(req, res)) return
    const name = req.params.name
    if (!SECRET_NAMES[name]) return fail(res, 404, 'Unknown integration')
    const { value, error } = Joi.object({ value: Joi.string().trim().min(8).max(400).required() }).validate(req.body)
    if (error) return fail(res, 400, error.message)
    const { error: e } = await supabase.from('integration_secrets').upsert({ name, ciphertext: encrypt(value.value), updated_at: new Date().toISOString(), updated_by: req.user.id })
    if (e) throw e
    clearSecretCache()
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'INTEGRATION_KEY_SET', entity: 'integration_secrets', metadata: { name } })
    res.json({ success: true, data: { name } })
  } catch (err) { next(err) }
})

router.post('/:name/remove', async (req, res, next) => {
  try {
    if (!superOnly(req, res)) return
    if (!SECRET_NAMES[req.params.name]) return fail(res, 404, 'Unknown integration')
    await supabase.from('integration_secrets').delete().eq('name', req.params.name)
    clearSecretCache()
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'INTEGRATION_KEY_REMOVED', entity: 'integration_secrets', metadata: { name: req.params.name } })
    res.json({ success: true, data: { name: req.params.name } })
  } catch (err) { next(err) }
})

async function http(url, opts = {}) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 9000)
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal })
    let body = null
    try { body = await r.json() } catch { /* not json */ }
    return { status: r.status, body }
  } finally { clearTimeout(t) }
}

router.post('/:name/test', async (req, res, next) => {
  try {
    if (!superOnly(req, res)) return
    const name = req.params.name
    if (!SECRET_NAMES[name]) return fail(res, 404, 'Unknown integration')
    const key = await getSecret(name)
    if (!key) return res.json({ success: true, data: { ok: false, detail: 'No key saved yet' } })
    let r
    if (name === 'RESEND_API_KEY') {
      r = await http('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } })
      const restricted = r.status === 401 && /restricted/i.test(JSON.stringify(r.body || {}))
      return res.json({ success: true, data: { ok: r.status === 200 || restricted, detail: r.status === 200 ? 'Key works' : restricted ? 'Key works (send-only key)' : `Rejected (HTTP ${r.status})` } })
    }
    if (name === 'NOWPAYMENTS_IPN_SECRET') return res.json({ success: true, data: { ok: true, detail: 'Saved. It is checked on every payment notification.' } })
    if (name === 'NOWPAYMENTS_API_KEY') {
      for (const [host, label] of [['https://api.nowpayments.io', 'live'], ['https://api-sandbox.nowpayments.io', 'sandbox']]) {
        const t = await http(`${host}/v1/currencies`, { headers: { 'x-api-key': key } })
        if (t.status === 200) return res.json({ success: true, data: { ok: true, detail: `Key works (${label})` } })
      }
      return res.json({ success: true, data: { ok: false, detail: 'Rejected by live and sandbox' } })
    }
    if (name === 'OPENAI_API_KEY') r = await http('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` } })
    else if (name === 'ANTHROPIC_API_KEY') r = await http('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } })
    else if (name === 'TRONGRID_API_KEY') r = await http('https://api.trongrid.io/wallet/getnowblock', { method: 'POST', headers: { 'TRON-PRO-API-KEY': key } })
    else if (name === 'ETHERSCAN_API_KEY') {
      r = await http(`https://api.etherscan.io/v2/api?chainid=1&module=stats&action=ethprice&apikey=${encodeURIComponent(key)}`)
      return res.json({ success: true, data: { ok: r.body?.status === '1', detail: r.body?.status === '1' ? 'Key works' : String(r.body?.result || `HTTP ${r.status}`).slice(0, 120) } })
    }
    res.json({ success: true, data: { ok: r.status === 200, detail: r.status === 200 ? 'Key works' : `Rejected (HTTP ${r.status})` } })
  } catch (err) { res.json({ success: true, data: { ok: false, detail: err.name === 'AbortError' ? 'Timed out' : err.message } }) }
})

export default router
