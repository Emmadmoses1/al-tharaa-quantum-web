import { Router } from 'express'
import OpenAI from 'openai'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'
import 'dotenv/config'

const router = Router()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Admin: generate an opportunity cover image with DALL-E and store it
router.post('/generate', requireAdmin, async (req, res, next) => {
  try {
    const { prompt } = req.body

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'A prompt is required', code: 'BAD_REQUEST' },
      })
    }

    const result = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt.trim(),
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json',
    })

    const b64 = result.data[0].b64_json
    const buffer = Buffer.from(b64, 'base64')
    const fileName = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`

    const { error: uploadError } = await supabase.storage
      .from('opportunity-images')
      .upload(fileName, buffer, { contentType: 'image/png', upsert: false })

    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage
      .from('opportunity-images')
      .getPublicUrl(fileName)

    res.json({ success: true, data: { url: publicUrlData.publicUrl } })
  } catch (err) {
    next(err)
  }
})

export default router
