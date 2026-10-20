import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { AiStatus, SIGNAL_COLOR, SIGNAL_AR, RISK_AR, trendOf, rsiOf, volOf, fmtTime, minutesAgo } from '../../lib/ai'
import { Skeleton } from '../../components/ui/Skeleton'
import PriceChart from '../../components/PriceChart'

/* eslint-disable @typescript-eslint/no-explicit-any */
const sec = { fontSize: 15, fontWeight: 700, fontFamily: 'Cairo', color: '#D4AF37', margin: '26px 0 12px' } as const
const mono = { fontFamily: 'Montserrat', direction: 'ltr', display: 'inline-block' } as const

function Health({ ok, label, note }: { ok: boolean; label: string; note?: string }) {
  const c = ok ? '#10b981' : '#f59e0b'
  return (
    <div className="glass-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      {ok ? <CheckCircle2 size={18} color={c} /> : <AlertCircle size={18} color={c} />}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Cairo' }}>{label}</div>
        <div style={{ fontSize: 11, color: c, fontFamily: 'Cairo' }}>{note || (ok ? 'يعمل' : 'غير متاح')}</div>
      </div>
    </div>
  )
}

function Stat({ l, v, color }: { l: string; v: string; color?: string }) {
  return (
    <div className="glass-card" style={{ padding: '14px 12px' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: color || '#D4AF37', ...mono }}>{v}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', marginTop: 3 }}>{l}</div>
    </div>
  )
}

export default function AiIntelligencePage() {
  const { user } = useAuth()

  const ai = useQuery({ queryKey: ['ai-status'], queryFn: () => api.get<AiStatus>('/api/ai-status'), refetchInterval: 30000, staleTime: 0 })
  const mk = useQuery({ queryKey: ['markets'], queryFn: () => api.get<any>('/api/markets'), refetchInterval: 30000, staleTime: 15000 })

  const perf = useQuery({
    queryKey: ['my-perf', user?.id], enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('trades').select('realized_pnl,created_at,executed_at,closed_at')
        .eq('user_id', user!.id).eq('status', 'closed').order('closed_at', { ascending: false }).limit(1000)
      if (error) throw error
      const rows = (data || []).filter((t: any) => t.realized_pnl != null)
      const wins = rows.filter((t: any) => Number(t.realized_pnl) > 0)
      const losses = rows.filter((t: any) => Number(t.realized_pnl) < 0)
      const gp = wins.reduce((s: number, t: any) => s + Number(t.realized_pnl), 0)
      const gl = Math.abs(losses.reduce((s: number, t: any) => s + Number(t.realized_pnl), 0))
      const durs = rows.filter((t: any) => t.closed_at).map((t: any) => (new Date(t.closed_at).getTime() - new Date(t.executed_at || t.created_at).getTime()) / 60000)
      return {
        total: rows.length, wins: wins.length, losses: losses.length,
        winRate: rows.length ? (wins.length / rows.length) * 100 : null,
        gp, gl, net: gp - gl,
        avgWin: wins.length ? gp / wins.length : null,
        avgLoss: losses.length ? gl / losses.length : null,
        pf: gl > 0 ? gp / gl : null,
        avgDur: durs.length ? durs.reduce((a: number, b: number) => a + b, 0) / durs.length : null,
      }
    },
  })

  const d = ai.data
  const p = perf.data
  const f = (n: number | null | undefined, dp = 2) => (n == null ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: dp }))
  const dur = (m: number | null | undefined) => (m == null ? '—' : m < 60 ? `${Math.round(m)} د` : m < 1440 ? `${(m / 60).toFixed(1)} س` : `${(m / 1440).toFixed(1)} يوم`)

  return (
    <div style={{ direction: 'rtl', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}>ذكاء السوق</h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', lineHeight: 1.9 }}>
        ما يراه محرك الإشارات الآن، وحالة النظام، وأداء صفقاتك. كل الأرقام حقيقية وتُحسب من بيانات السوق وسجلاتك.
      </p>

      <div style={sec}>حالة النظام</div>
      <div className="ai-h">
        <Health ok={ai.isSuccess} label="الخادم وقاعدة البيانات" />
        <Health ok={mk.isSuccess && !mk.data?.stale} label="بيانات السوق" note={mk.isSuccess ? (mk.data?.stale ? 'بيانات قديمة مؤقتاً' : 'يعمل') : 'غير متاح'} />
        <Health ok={!!d?.engine.online} label="محرك الإشارات" note={d ? (d.engine.online ? `آخر تشغيل ${minutesAgo(d.engine.last_run_at)}` : d.engine.enabled ? 'متأخر عن موعده' : 'متوقف') : undefined} />
      </div>

      <div style={sec}>قراءة السوق</div>
      {ai.isLoading ? <Skeleton height={120} borderRadius={14} /> : !d || d.markets.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', fontSize: 13 }}>لا توجد قراءات بعد. تظهر بعد أول تشغيل للمحرك مع استراتيجية مفعّلة.</div>
      ) : (
        <div className="ai-m">
          {d.markets.map(m => {
            const t = trendOf(m.indicators); const i = m.indicators
            return (
              <div key={m.asset} className="glass-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <b style={{ ...mono, color: '#fff', fontSize: 16 }}>{m.asset}/USDT</b>
                  <span style={{ fontSize: 11, fontWeight: 700, color: SIGNAL_COLOR[m.signal] || '#9ca3af', background: `${SIGNAL_COLOR[m.signal] || '#9ca3af'}1a`, borderRadius: 6, padding: '3px 9px', fontFamily: 'Cairo' }}>{SIGNAL_AR[m.signal] || m.signal}</span>
                </div>
                {[['الاتجاه', t.t, t.c], ['RSI', i?.rsi != null ? `${i.rsi} (${rsiOf(i)})` : '—', '#fff'], ['التذبذب', i?.atr_pct != null ? `${i.atr_pct}% (${volOf(i)})` : '—', '#fff'], ['EMA 20 / 50', i?.ema20 != null ? `${f(i.ema20)} / ${f(i.ema50)}` : '—', '#fff']].map(([l, v, c]) => (
                  <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(212,175,55,0.06)', fontSize: 12.5, fontFamily: 'Cairo' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>{l}</span><span style={{ color: c as string, fontWeight: 600, direction: 'ltr' }}>{v}</span>
                  </div>
                ))}
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cairo', marginTop: 8 }}>{minutesAgo(m.at)}</div>
              </div>
            )
          })}
        </div>
      )}

      <div style={sec}>الرسم البياني</div>
      <div className="glass-card" style={{ padding: 12 }}><PriceChart /></div>

      <div style={sec}>الاستراتيجيات المفعّلة</div>
      {d && d.strategies.length > 0 ? d.strategies.map(s => (
        <div key={s.id} className="glass-card" style={{ padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <b style={{ color: '#fff', fontFamily: 'Cairo', fontSize: 14 }}>{s.name}</b>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo' }}>مخاطر {RISK_AR[s.risk_level] || s.risk_level} · <span style={mono}>{s.timeframe}</span> · <span style={mono}>{s.supported_assets.join('/')}</span></span>
        </div>
      )) : <div style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', fontSize: 13 }}>لا توجد استراتيجيات مفعّلة.</div>}

      <div style={sec}>أداء صفقاتي</div>
      {perf.isLoading ? <Skeleton height={100} borderRadius={14} /> : !p || p.total === 0 ? (
        <div className="glass-card" style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', fontSize: 13 }}>
          لا توجد صفقات مغلقة بعد. ستظهر إحصاءاتك هنا بعد إغلاق أول صفقة.
          <div style={{ marginTop: 12 }}><Link to="/dashboard/signals" className="btn-gold" style={{ textDecoration: 'none', padding: '10px 20px', fontSize: 13 }}>عرض الإشارات</Link></div>
        </div>
      ) : (
        <div className="ai-p">
          <Stat l="إجمالي الصفقات" v={String(p.total)} />
          <Stat l="الرابحة / الخاسرة" v={`${p.wins} / ${p.losses}`} />
          <Stat l="نسبة الربح" v={p.winRate == null ? '—' : `${p.winRate.toFixed(1)}%`} />
          <Stat l="صافي الربح (USDT)" v={`${p.net >= 0 ? '+' : ''}${f(p.net)}`} color={p.net >= 0 ? '#10b981' : '#ef4444'} />
          <Stat l="إجمالي الربح" v={f(p.gp)} color="#10b981" />
          <Stat l="إجمالي الخسارة" v={f(p.gl)} color="#ef4444" />
          <Stat l="متوسط الربح" v={f(p.avgWin)} />
          <Stat l="متوسط الخسارة" v={f(p.avgLoss)} />
          <Stat l="معامل الربح" v={f(p.pf)} />
          <Stat l="متوسط مدة الصفقة" v={dur(p.avgDur)} />
        </div>
      )}

      <div style={sec}>سجل قرارات الذكاء الاصطناعي</div>
      {d && d.decisions.length > 0 ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {d.decisions.map((x, idx) => (
            <div key={idx} className="glass-card" style={{ padding: '11px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <span><b style={{ ...mono, color: '#fff' }}>{x.asset}</b> <span style={{ color: SIGNAL_COLOR[x.signal] || '#9ca3af', fontWeight: 700, fontSize: 12, fontFamily: 'Cairo' }}>{SIGNAL_AR[x.signal] || x.signal}</span></span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', ...mono }}>{fmtTime(x.at)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', marginTop: 4 }}>
                {x.strategy || '—'} · RSI {x.indicators?.rsi ?? '—'} · ATR {x.indicators?.atr_pct ?? '—'}% · <span style={mono}>{x.model_version || ''}</span>
              </div>
            </div>
          ))}
        </div>
      ) : <div style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', fontSize: 13 }}>لا توجد قرارات مسجّلة بعد.</div>}

      <div style={{ marginTop: 26, padding: '12px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', color: 'rgba(245,158,11,0.9)', fontSize: 12, fontFamily: 'Cairo', lineHeight: 1.9 }}>
        الإشارات تقديرات مبنية على مؤشرات فنية وليست نصيحة مالية، والأداء السابق لا يضمن المستقبل. قد تخسر جزءاً من رأس مالك أو كله.
      </div>
      <style>{`.ai-h{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.ai-m{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ai-p{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}@media(max-width:800px){.ai-h{grid-template-columns:1fr}.ai-p{grid-template-columns:1fr 1fr}}@media(max-width:560px){.ai-m{grid-template-columns:1fr}}`}</style>
    </div>
  )
}
