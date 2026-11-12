import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { getPriceFresh } from '../services/prices.js'

// Live health, measured on request (cached 20s). Nothing here is hardcoded: each line comes from a real check.
const router = Router()
let cache = { at: 0, v: null }

const timed = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])

async function check() {
  const now = Date.now()
  const parts = []
  const add = (key, status) => parts.push({ key, status })   // status: operational | degraded | down | paused

  try { const { error } = await timed(supabase.from('profiles').select('id', { head: true, count: 'exact' }).limit(1), 5000); add('database', error ? 'down' : 'operational') }
  catch { add('database', 'down') }

  const feeds = await Promise.allSettled(['BTC', 'ETH'].map(a => timed(getPriceFresh(a, 20000), 9000)))
  const okFeeds = feeds.filter(f => f.status === 'fulfilled').length
  add('prices', okFeeds === feeds.length ? 'operational' : okFeeds > 0 ? 'degraded' : 'down')

  try {
    const { data: st } = await supabase.from('ai_engine_state').select('enabled, last_run_at').eq('id', 1).maybeSingle()
    if (!st) add('signals', 'operational')
    else if (st.enabled === false) add('signals', 'paused')
    else {
      const every = Number(process.env.SIGNAL_INTERVAL_MIN || 15) * 60000
      const age = st.last_run_at ? now - new Date(st.last_run_at).getTime() : Infinity
      add('signals', age <= 2 * every ? 'operational' : age <= 4 * every ? 'degraded' : 'down')
    }
  } catch { add('signals', 'down') }

  try {
    const { count } = await supabase.from('binary_orders').select('id', { count: 'exact', head: true })
      .eq('status', 'open').lt('expires_at', new Date(now - 2 * 60000).toISOString())
    add('settlement', !count ? 'operational' : count < 5 ? 'degraded' : 'down')
  } catch { add('settlement', 'down') }

  const overall = parts.some(p => p.status === 'down') ? 'down' : parts.some(p => p.status === 'degraded') ? 'degraded' : 'operational'
  return { overall, parts, checked_at: new Date(now).toISOString() }
}

router.get('/', async (_req, res, next) => {
  try {
    if (cache.v && Date.now() - cache.at < 20000) return res.json({ success: true, data: cache.v })
    const v = await check()
    cache = { at: Date.now(), v }
    res.json({ success: true, data: v })
  } catch (err) { next(err) }
})

export default router
