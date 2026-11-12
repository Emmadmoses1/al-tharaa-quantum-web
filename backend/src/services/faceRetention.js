import { supabase } from '../lib/supabase.js'

// Face-verification photos are sensitive. Once reviewed, they are deleted from storage after a retention period;
// the decision (approved / rejected) stays on the account. Pending photos are never touched.
const DAYS = Number(process.env.FACE_RETENTION_DAYS ?? 30)
const REJECTED_DAYS = 7

async function purge(status, days) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString()
  const { data, error } = await supabase.from('profiles').select('id, face_path')
    .eq('face_status', status).not('face_path', 'is', null).lt('face_reviewed_at', cutoff).limit(100)
  if (error) throw error
  let n = 0
  for (const p of data || []) {
    const { error: re } = await supabase.storage.from('face-verifications').remove([p.face_path])
    if (re) { console.error('face-retention remove failed', p.id, re.message); continue }
    await supabase.from('profiles').update({ face_path: null }).eq('id', p.id)
    n++
  }
  return n
}

export async function runFaceRetention() {
  if (!(DAYS > 0)) return 0
  const a = await purge('approved', DAYS)
  const r = await purge('rejected', REJECTED_DAYS)
  if (a + r) console.log(`face-retention: deleted ${a + r} photo(s)`)
  return a + r
}
