import { Router } from 'express'
import { requireAuth } from '../middleware/authGuard.js'
import OpenAI from 'openai'

const router = Router()
router.use(requireAuth)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

router.post('/enhance-text', async (req, res, next) => {
  try {
    const { text, name, category } = req.body
    if (!text) return res.status(400).json({ success: false, error: { message: 'text required' } })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `You are a professional investment copywriter for a premium Gulf-region investment platform. Rewrite the following investment opportunity description to be captivating, professional, and compelling for high-net-worth investors. Keep it 3-4 sentences max.\n\nOpportunity name: ${name || 'Investment Opportunity'}\nCategory: ${category || 'Investment'}\nOriginal description: ${text}\n\nRespond ONLY with valid JSON, no markdown:\n{"enhanced": "English description here", "arabic": "الوصف بالعربية هنا"}`
      }],
      max_tokens: 600,
    })

    const raw = completion.choices[0].message.content || ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    res.json({ success: true, enhanced: parsed.enhanced, arabic: parsed.arabic })
  } catch (err) {
    next(err)
  }
})

router.post('/generate-image', async (req, res, next) => {
  try {
    const { name, category } = req.body
    if (!name) return res.status(400).json({ success: false, error: { message: 'name required' } })

    const keywords = {
      technology: 'technology,innovation,digital',
      real_estate: 'real-estate,architecture,building',
      startups: 'startup,business,office',
      agriculture: 'agriculture,farm,green',
      renewable_energy: 'solar,renewable,energy',
      infrastructure: 'infrastructure,construction,city',
      funds: 'finance,investment,wealth',
      sukuk: 'finance,gold,luxury',
    }

    const query = keywords[category?.toLowerCase()] || 'investment,finance,business'
    const seed = Math.floor(Math.random() * 1000)
    const url = `https://source.unsplash.com/1200x600/?${query}&sig=${seed}`

    res.json({ success: true, url })
  } catch (err) {
    next(err)
  }
})

export default router
