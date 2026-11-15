import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'

// Documents for an opportunity (licence, contract, feasibility study...). Published by the admin, readable by anyone viewing a non-draft opportunity.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const bad = (res, message, code = 'BAD_REQUEST') => res.status(400).json({ success: false, error: { message, code } })

export const publicDocsRouter = Router()
publicDocsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id)
    if (!UUID.test(id)) return res.json({ success: true, data: [] })
    const { data: opp } = await supabase.from('investment_opportunities').select('id, status').eq('id', id).maybeSingle()
    if (!opp || opp.status === 'draft') return res.json({ success: true, data: [] })
    const { data, error } = await supabase.from('opportunity_documents').select('id, title, url, created_at').eq('opportunity_id', id).order('created_at', { ascending: false }).limit(20)
    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (err) { next(err) }
})

export const adminDocsRouter = Router()
adminDocsRouter.use(requireAdmin)
const canWrite = req => ['admin', 'super_admin'].includes(req.userRole)
const deny = res => res.status(403).json({ success: false, error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } })

adminDocsRouter.get('/list/:oppId', async (req, res, next) => {
  try {
    if (!UUID.test(String(req.params.oppId))) return res.json({ success: true, data: [] })
    const { data, error } = await supabase.from('opportunity_documents').select('id, title, url, created_at').eq('opportunity_id', req.params.oppId).order('created_at', { ascending: false }).limit(20)
    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (err) { next(err) }
})

adminDocsRouter.post('/', async (req, res, next) => {
  try {
    if (!canWrite(req)) return deny(res)
    const opportunity_id = String(req.body?.opportunity_id || '')
    const title = String(req.body?.title || '').trim()
    const url = String(req.body?.url || '').trim()
    if (!UUID.test(opportunity_id)) return bad(res, 'Choose an opportunity.')
    if (title.length < 3 || title.length > 100) return bad(res, 'Title must be 3 to 100 characters.')
    if (!/^https:\/\//i.test(url) || url.length > 600) return bad(res, 'Link must start with https://')
    const { count } = await supabase.from('opportunity_documents').select('id', { count: 'exact', head: true }).eq('opportunity_id', opportunity_id)
    if ((count || 0) >= 20) return bad(res, 'Up to 20 documents per opportunity.', 'LIMIT')
    const { data, error } = await supabase.from('opportunity_documents').insert({ opportunity_id, title, url, created_by: req.user.id }).select('id, title, url, created_at').single()
    if (error) throw error
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'OPPORTUNITY_DOC_ADDED', entity: 'opportunity_documents', metadata: { opportunity_id, title } })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
})

adminDocsRouter.post('/:id/delete', async (req, res, next) => {
  try {
    if (!canWrite(req)) return deny(res)
    if (!UUID.test(String(req.params.id))) return bad(res, 'Invalid id.')
    const { error } = await supabase.from('opportunity_documents').delete().eq('id', req.params.id)
    if (error) throw error
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'OPPORTUNITY_DOC_DELETED', entity: 'opportunity_documents', metadata: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) { next(err) }
})
