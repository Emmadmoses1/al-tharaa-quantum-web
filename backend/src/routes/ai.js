import { Router } from 'express'
import Joi from 'joi'
import { requireAdmin } from '../middleware/authGuard.js'
import { getSecret } from '../lib/secrets.js'

// Admin-only writing assistant. It rewrites facts the admin supplies. It never invents numbers, returns or claims.
const router = Router()
router.use(requireAdmin)

const SYSTEM = `You write listings for a digital investment platform. Use ONLY the facts the admin provides.
Rules: never invent figures, percentages, returns, partners, licenses, regulatory approvals or guarantees. Never promise profit.
Tone: professional, clear, balanced, mention that returns are not guaranteed. Maximum 4 sentences per language.
Respond with ONLY JSON: {"name_ar":"...","description":"English text","description_ar":"Arabic text"}`

async function llm(user) {
  const a = await getSecret('ANTHROPIC_API_KEY')
  if (a) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': a, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5', max_tokens: 800, system: SYSTEM, messages: [{ role: 'user', content: user }] }),
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d?.error?.message || `Anthropic HTTP ${r.status}`)
    return d.content?.[0]?.text || ''
  }
  const o = await getSecret('OPENAI_API_KEY')
  if (o) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${o}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 800, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }] }),
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d?.error?.message || `OpenAI HTTP ${r.status}`)
    return d.choices?.[0]?.message?.content || ''
  }
  throw new Error('No AI key saved. Add one in Admin → Integrations.')
}

const schema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  category: Joi.string().trim().max(60).allow(''),
  location: Joi.string().trim().max(120).allow(''),
  facts: Joi.string().trim().min(10).max(2000).required(),
})

router.post('/polish', async (req, res, next) => {
  try {
    const { value, error } = schema.validate(req.body)
    if (error) return res.status(400).json({ success: false, error: { message: error.message, code: 'BAD_REQUEST' } })
    const raw = await llm(`Name: ${value.name}\nCategory: ${value.category || '-'}\nLocation: ${value.location || '-'}\nFacts from the admin:\n${value.facts}`)
    const m = raw.replace(/```json|```/g, '').match(/\{[\s\S]*\}/)
    if (!m) throw new Error('The AI did not return usable text. Try again.')
    const p = JSON.parse(m[0])
    res.json({ success: true, data: { name_ar: p.name_ar || '', description: p.description || '', description_ar: p.description_ar || '' } })
  } catch (err) {
    if (/No AI key/.test(err.message)) return res.status(400).json({ success: false, error: { message: err.message, code: 'NO_KEY' } })
    next(err)
  }
})

export default router
