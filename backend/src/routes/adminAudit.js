import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'

// Read-only view of the audit trail (who did what, when). Nothing can be edited or deleted from here.
const router = Router()
router.use(requireAdmin)

router.get('/', async (req, res, next) => {
  try {
    const action = String(req.query.action || '').trim().slice(0, 60)
    const before = String(req.query.before || '')
    let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(51)
    if (action) q = q.ilike('action', `%${action.replace(/[\\%_]/g, m => '\\' + m)}%`)
    if (/^\d{4}-\d{2}-\d{2}T/.test(before)) q = q.lt('created_at', before)
    const { data, error } = await q
    if (error) throw error
    const rows = (data || []).slice(0, 50)
    const ids = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
    const who = {}
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id, email').in('id', ids)
      for (const p of ps || []) who[p.id] = p.email
    }
    res.json({ success: true, data: {
      rows: rows.map(r => ({ id: r.id, at: r.created_at, actor: who[r.user_id] || r.user_id || 'system', action: r.action, entity: r.entity || '', entity_id: r.entity_id ?? '', meta: r.metadata || null })),
      next: (data || []).length > 50 ? rows[rows.length - 1].created_at : null,
    } })
  } catch (err) { next(err) }
})

export default router
