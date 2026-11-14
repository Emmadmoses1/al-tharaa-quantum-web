import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'

// Project updates: what is happening with an opportunity, posted by the admin, with optional photo or video.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const bad = (res, message, code = 'BAD_REQUEST') => res.status(400).json({ success: false, error: { message, code } })

export const publicUpdatesRouter = Router()
publicUpdatesRouter.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id)
    if (!UUID.test(id)) return res.json({ success: true, data: [] })
    const { data: opp } = await supabase.from('investment_opportunities').select('id, status').eq('id', id).maybeSingle()
    if (!opp || opp.status === 'draft') return res.json({ success: true, data: [] })
    const { data, error } = await supabase.from('opportunity_updates').select('id, title, body, media_url, media_type, created_at')
      .eq('opportunity_id', id).order('created_at', { ascending: false }).limit(50)
    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (err) { next(err) }
})

export const adminUpdatesRouter = Router()
adminUpdatesRouter.use(requireAdmin)
const canWrite = req => ['admin', 'super_admin'].includes(req.userRole)
const deny = res => res.status(403).json({ success: false, error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } })

adminUpdatesRouter.get('/list/:oppId', async (req, res, next) => {
  try {
    if (!UUID.test(String(req.params.oppId))) return res.json({ success: true, data: [] })
    const { data, error } = await supabase.from('opportunity_updates').select('id, title, body, media_url, media_type, created_at')
      .eq('opportunity_id', req.params.oppId).order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (err) { next(err) }
})

adminUpdatesRouter.post('/', async (req, res, next) => {
  try {
    if (!canWrite(req)) return deny(res)
    const opportunity_id = String(req.body?.opportunity_id || '')
    const title = String(req.body?.title || '').trim()
    const body = String(req.body?.body || '').trim()
    let media_url = String(req.body?.media_url || '').trim() || null
    let media_type = media_url ? String(req.body?.media_type || '') : null
    if (!UUID.test(opportunity_id)) return bad(res, 'Choose an opportunity.')
    if (title.length < 3 || title.length > 120) return bad(res, 'Title must be 3 to 120 characters.')
    if (body.length > 2000) return bad(res, 'Text is too long (2000 characters max).')
    if (media_url && (!/^https?:\/\//i.test(media_url) || media_url.length > 600 || !['image', 'video'].includes(media_type))) { media_url = null; media_type = null }

    const { data: opp } = await supabase.from('investment_opportunities').select('id, name, name_ar').eq('id', opportunity_id).maybeSingle()
    if (!opp) return bad(res, 'Opportunity not found.', 'NOT_FOUND')

    const { data, error } = await supabase.from('opportunity_updates')
      .insert({ opportunity_id, title, body: body || null, media_url, media_type, created_by: req.user.id }).select().single()
    if (error) throw error
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'OPPORTUNITY_UPDATE_POSTED', entity: 'opportunity_updates', metadata: { opportunity_id, title } })

    // Tell everyone who invested in this opportunity.
    const { data: inv } = await supabase.from('investment_allocations').select('user_id').eq('opportunity_id', opportunity_id).in('status', ['pending', 'active', 'matured'])
    const users = [...new Set((inv || []).map(r => r.user_id))]
    if (users.length) {
      const rows = users.map(user_id => ({
        user_id, type: 'investment',
        title: `Project update: ${opp.name}`, title_ar: `مستجد جديد: ${opp.name_ar || opp.name}`,
        message: title, message_ar: title,
      }))
      for (let i = 0; i < rows.length; i += 500) await supabase.from('notifications').insert(rows.slice(i, i + 500))
    }
    res.status(201).json({ success: true, data, notified: users.length })
  } catch (err) { next(err) }
})

adminUpdatesRouter.post('/:id/delete', async (req, res, next) => {
  try {
    if (!canWrite(req)) return deny(res)
    if (!UUID.test(String(req.params.id))) return bad(res, 'Invalid id.')
    const { error } = await supabase.from('opportunity_updates').delete().eq('id', req.params.id)
    if (error) throw error
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'OPPORTUNITY_UPDATE_DELETED', entity: 'opportunity_updates', metadata: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) { next(err) }
})
