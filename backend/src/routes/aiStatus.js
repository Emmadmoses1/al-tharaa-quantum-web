import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const nowIso = new Date().toISOString()
    const [st, strat, sigs, dec] = await Promise.all([
      supabase.from('ai_engine_state').select('enabled,last_run_at,last_result').eq('id', 1).maybeSingle(),
      supabase.from('strategies').select('id,name,risk_level,timeframe,supported_assets,is_enabled'),
      supabase.from('ai_signals').select('id', { count: 'exact', head: true }).eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
      supabase.from('ai_decisions').select('asset,signal,indicators,model_version,strategy_id,created_at')
        .order('created_at', { ascending: false }).limit(60),
    ])
    const strategies = strat.data || []
    const names = Object.fromEntries(strategies.map(s => [s.id, s.name]))
    const decisions = dec.data || []

    const markets = []
    for (const d of decisions) {
      if (!markets.find(m => m.asset === d.asset)) {
        markets.push({ asset: d.asset, signal: d.signal, indicators: d.indicators, at: d.created_at })
      }
    }

    const enabled = st.data?.enabled !== false
    const last = st.data?.last_run_at || null
    const online = enabled && !!last && Date.now() - new Date(last).getTime() < 45 * 60000

    res.json({
      success: true,
      data: {
        engine: { enabled, online, last_run_at: last, signals_created: st.data?.last_result?.created ?? null },
        strategies: strategies.filter(s => s.is_enabled)
          .map(({ id, name, risk_level, timeframe, supported_assets }) => ({ id, name, risk_level, timeframe, supported_assets })),
        active_signals: sigs.count || 0,
        markets,
        decisions: decisions.slice(0, 15).map(d => ({
          asset: d.asset, signal: d.signal, indicators: d.indicators, model_version: d.model_version,
          strategy: names[d.strategy_id] || null, at: d.created_at,
        })),
      },
    })
  } catch (err) { next(err) }
})

export default router
