import { supabase } from './supabase.js'

// Device bans. A device is identified by the id the browser keeps (localStorage + cookie + IndexedDB).
// Exact id match blocks the whole site and every login. The coarse fingerprint + IP match is only used to stop NEW signups.
export async function banDevicesOf(userId, reason) {
  const { data } = await supabase.from('device_accounts').select('device_id, fp, ip').eq('user_id', userId)
  if (!data?.length) return 0
  const rows = data.map(d => ({ device_id: d.device_id, fp: d.fp || null, ip: d.ip || null, user_id: userId, reason: String(reason || 'Suspended').slice(0, 200) }))
  await supabase.from('blocked_devices').upsert(rows, { onConflict: 'device_id' })
  return rows.length
}

export async function unbanDevicesOf(userId) {
  await supabase.from('blocked_devices').delete().eq('user_id', userId)
}

export async function isBlockedDevice({ id, fp = null, ip = null, soft = false }) {
  if (!id) return false
  const { data: a } = await supabase.from('blocked_devices').select('device_id').eq('device_id', id).limit(1)
  if (a?.length) return true
  if (soft && fp && ip) {
    const { data: b } = await supabase.from('blocked_devices').select('user_id').eq('fp', fp).eq('ip', ip).limit(1)
    if (b?.length) {
      await supabase.from('blocked_devices').upsert({ device_id: id, fp, ip, user_id: b[0].user_id, reason: 'Matched a blocked device at signup' }, { onConflict: 'device_id' })
      return true
    }
  }
  return false
}
