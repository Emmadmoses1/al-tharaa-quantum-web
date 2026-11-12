import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { getSetting } from '../lib/settings.js'

// Everything the public "Licences & documents" page and the footer badge show. Only documents the admin marked public.
const router = Router()
let cache = { at: 0, v: null }
export const fileUrl = p => `${process.env.SUPABASE_URL}/storage/v1/object/public/legal-docs/${p}`

router.get('/', async (_req, res, next) => {
  try {
    if (cache.v && Date.now() - cache.at < 60000) return res.json({ success: true, data: cache.v })
    const { data, error } = await supabase.from('legal_documents')
      .select('id, doc_type, title_ar, title, issuer, number, issued_at, expires_at, file_path, mime')
      .eq('is_public', true).order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    const [g, inv] = await Promise.all([getSetting('general'), getSetting('invoice')])
    const v = {
      license_text: String(g.license_text || ''),
      company: { name: inv.company_name || '', address: inv.address || '', tax_id: inv.tax_id || '' },
      documents: (data || []).map(({ file_path, ...d }) => ({ ...d, url: fileUrl(file_path) })),
    }
    cache = { at: Date.now(), v }
    res.json({ success: true, data: v })
  } catch (err) { next(err) }
})

export const clearLegalCache = () => { cache = { at: 0, v: null } }
export default router
