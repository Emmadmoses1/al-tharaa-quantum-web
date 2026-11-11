import { supabase } from './supabase'
import { api } from './api'

// A random gesture the user must show next to their face, so an old or borrowed photo cannot be reused.
// The reviewing admin sees which gesture was asked for.
export const CHALLENGES = [
  'ارفع إصبعين بجانب وجهك',
  'ارفع إبهامك بجانب وجهك',
  'ضع كفك المفتوحة بجانب وجهك',
  'غطِّ عينك اليسرى بيدك',
  'أمل رأسك قليلاً إلى اليمين',
  'ارفع ثلاثة أصابع بجانب وجهك',
]
export const randomChallenge = () => CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]

export async function uploadFace(userId: string, blob: Blob, challenge: string): Promise<void> {
  const path = `${userId}/selfie-${Date.now()}.jpg`
  const { error } = await supabase.storage.from('face-verifications').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  await api.post('/api/account/face', { path, challenge })
  window.dispatchEvent(new Event('aq:profile-refresh'))
}
