import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'
import { getSecret } from '../lib/secrets.js'

const router = Router()

// Admin: AI cover ILLUSTRATION (not a photo of the project). Stored in the public opportunity-images bucket.
router.post('/generate', requireAdmin, async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || '').trim()
    if (!prompt) return res.status(400).json({ success: false, error: { message: 'A prompt is required', code: 'BAD_REQUEST' } })
    const key = await getSecret('OPENAI_API_KEY')
    if (!key) return res.status(400).json({ success: false, error: { message: 'No OpenAI key saved. Add one in Admin → API Keys, or upload a photo.', code: 'NO_KEY' } })
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'dall-e-3', size: '1792x1024', quality: 'standard', response_format: 'b64_json', n: 1,
        prompt: `Clean, premium flat illustration, dark navy and gold palette, no text, no logos, no people's faces. Subject: ${prompt.slice(0, 400)}`,
      }),
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d?.error?.message || `OpenAI HTTP ${r.status}`)
    const buffer = Buffer.from(d.data[0].b64_json, 'base64')
    const fileName = `ai/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
    const { error: upErr } = await supabase.storage.from('opportunity-images').upload(fileName, buffer, { contentType: 'image/png', upsert: false })
    if (upErr) throw upErr
    const { data } = supabase.storage.from('opportunity-images').getPublicUrl(fileName)
    res.json({ success: true, data: { url: data.publicUrl } })
  } catch (err) { next(err) }
})

export default router
