import { Router } from 'express'
import Joi from 'joi'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'
import { fileUrl, clearLegalCache } from './publicLegal.js'

// Admin: manage the legal documents shown to the public. Files are uploaded by the browser straight to the legal-docs bucket
// (storage rules allow admins only); these routes record, hide, show and delete them.
const router = Router()
router.use(requireAdmin)
const fail = (res, status, message, code = 'BAD_REQUEST') => res.status(status).json({ success: false, error: { message, code } })
const allowed = (req, res) => {
  if (['admin', 'super_admin'].includes(req.userRole)) return true
  fail(res, 403, 'Insufficient permissions', 'FORBIDDEN'); return false
}

router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('legal_documents').select('*').order('created_at', { ascending: false }).limit(200)
    if (error) throw error
    res.json({ success: true, data: (data || []).map(d => ({ ...d, url: fileUrl(d.file_path) })) })
  } catch (err) { next(err) }
})

const day = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('', null)
const schema = Joi.object({
  doc_type: Joi.string().valid('license', 'registration', 'certificate', 'policy', 'other').required(),
  title_ar: Joi.string().trim().min(2).max(160).required(),
  title: Joi.string().trim().max(160).allow('', null),
  issuer: Joi.string().trim().max(160).allow('', null),
  number: Joi.string().trim().max(80).allow('', null),
  issued_at: day, expires_at: day,
  path: Joi.string().pattern(/^docs\/\d{10,}-[A-Za-z0-9._-]{1,80}$/).required(),
  mime: Joi.string().valid('application/pdf', 'image/jpeg', 'image/png', 'image/webp').required(),
  is_public: Joi.boolean().default(true),
})

router.post('/', async (req, res, next) => {
  try {
    if (!allowed(req, res)) return
    const { value: v, error: ve } = schema.validate(req.body)
    if (ve) return fail(res, 400, ve.message)
    const name = v.path.split('/')[1]
    const { data: files } = await supabase.storage.from('legal-docs').list('docs', { search: name, limit: 5 })
    if (!files || !files.some(f => f.name === name)) return fail(res, 400, 'The file was not found. Upload it again.')
    const { data, error } = await supabase.from('legal_documents').insert({
      doc_type: v.doc_type, title_ar: v.title_ar, title: v.title || null, issuer: v.issuer || null, number: v.number || null,
      issued_at: v.issued_at || null, expires_at: v.expires_at || null, file_path: v.path, mime: v.mime, is_public: v.is_public, created_by: req.user.id,
    }).select('id').single()
    if (error) throw error
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'LEGAL_DOC_ADDED', entity: 'legal_documents', metadata: { title: v.title_ar, public: v.is_public } })
    clearLegalCache()
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
})

router.post('/:id/visibility', async (req, res, next) => {
  try {
    if (!allowed(req, res)) return
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || typeof req.body?.is_public !== 'boolean') return fail(res, 400, 'Bad request')
    const { error } = await supabase.from('legal_documents').update({ is_public: req.body.is_public }).eq('id', id)
    if (error) throw error
    clearLegalCache()
    res.json({ success: true, data: { ok: true } })
  } catch (err) { next(err) }
})

router.post('/:id/delete', async (req, res, next) => {
  try {
    if (!allowed(req, res)) return
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return fail(res, 400, 'Bad id')
    const { data: d } = await supabase.from('legal_documents').select('file_path, title_ar').eq('id', id).single()
    if (!d) return fail(res, 404, 'Not found', 'NOT_FOUND')
    await supabase.from('legal_documents').delete().eq('id', id)
    await supabase.storage.from('legal-docs').remove([d.file_path])
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'LEGAL_DOC_DELETED', entity: 'legal_documents', metadata: { title: d.title_ar } })
    clearLegalCache()
    res.json({ success: true, data: { ok: true } })
  } catch (err) { next(err) }
})

export default router
