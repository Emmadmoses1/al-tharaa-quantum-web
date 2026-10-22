import { supabase } from '../lib/supabase.js'

// 1) New open investment opportunities are announced to every user (in-app, email and push through the delivery loop).
// 2) Users who have not visited for a while get a "we miss you" message listing the opportunities that are really open.
const INACTIVE_DAYS = Number(process.env.INACTIVE_DAYS || 7)
const REPEAT_DAYS = Number(process.env.MISSYOU_REPEAT_DAYS || 14)
const ADMIN_ROLES = ['admin', 'super_admin', 'finance', 'trading_admin']
let lastMiss = 0

const nm = o => o.name_ar || o.name
async function everyone() {
  const { data, error } = await supabase.from('profiles').select('id, role')
  if (error) throw error
  return (data || []).filter(p => !ADMIN_ROLES.includes(p.role)).map(p => p.id)
}
async function insertMany(rows) {
  for (let i = 0; i < rows.length; i += 400) {
    const { error } = await supabase.from('notifications').insert(rows.slice(i, i + 400))
    if (error) throw error
  }
}

async function announce() {
  const { data: opps, error } = await supabase.from('investment_opportunities')
    .select('id, name, name_ar, currency, minimum_investment, projected_return_min, projected_return_max, status')
    .eq('status', 'open').is('announced_at', null).limit(3)
  if (error) throw error
  let n = 0
  for (const o of opps || []) {
    const { data: claim } = await supabase.from('investment_opportunities').update({ announced_at: new Date().toISOString() }).eq('id', o.id).is('announced_at', null).select('id')
    if (!claim || claim.length === 0) continue
    const users = await everyone()
    const ret = o.projected_return_min ? ` · عائد متوقع ${o.projected_return_min}–${o.projected_return_max}% (غير مضمون)` : ''
    const retEn = o.projected_return_min ? ` · Projected return ${o.projected_return_min}–${o.projected_return_max}% (not guaranteed)` : ''
    await insertMany(users.map(id => ({
      user_id: id, type: 'opportunity', title: 'New investment opportunity', title_ar: 'فرصة استثمارية جديدة',
      message: `${o.name} is now open. Minimum ${o.currency} ${Number(o.minimum_investment).toLocaleString()}${retEn}.`,
      message_ar: `${nm(o)} متاحة الآن. الحد الأدنى ${o.currency} ${Number(o.minimum_investment).toLocaleString()}${ret}.`,
    })))
    n += users.length
  }
  return n
}

async function missYou() {
  if (Date.now() - lastMiss < 6 * 3600 * 1000) return 0
  lastMiss = Date.now()
  const seenCut = Date.now() - INACTIVE_DAYS * 86400000
  const repeatCut = Date.now() - REPEAT_DAYS * 86400000
  const { data: profs, error } = await supabase.from('profiles').select('id, role, last_seen_at, last_missyou_at').limit(2000)
  if (error) throw error
  const idle = (profs || []).filter(p => !ADMIN_ROLES.includes(p.role)
    && p.last_seen_at && new Date(p.last_seen_at).getTime() < seenCut
    && (!p.last_missyou_at || new Date(p.last_missyou_at).getTime() < repeatCut)).slice(0, 200)
  if (idle.length === 0) return 0
  const { data: opps } = await supabase.from('investment_opportunities').select('name, name_ar').eq('status', 'open').order('created_at', { ascending: false }).limit(3)
  const list = (opps || []).map(nm)
  const listEn = (opps || []).map(o => o.name)
  await insertMany(idle.map(p => ({
    user_id: p.id, type: 'missyou', title: 'We miss you', title_ar: 'اشتقنا لك!',
    message: list.length ? `Open investment opportunities are waiting for you: ${listEn.join(', ')}. Come back and take a look.` : 'Your account is waiting for you. Come back and see what is new.',
    message_ar: list.length ? `هناك فرص استثمارية مفتوحة بانتظارك: ${list.join('، ')}. ادخل وتصفّح الفرص.` : 'حسابك بانتظارك. ادخل وتعرّف على الجديد.',
  })))
  await supabase.from('profiles').update({ last_missyou_at: new Date().toISOString() }).in('id', idle.map(p => p.id))
  return idle.length
}

export async function runEngagement() {
  const a = await announce()
  const m = await missYou()
  return a || m ? { announced_to: a, missed: m } : null
}
