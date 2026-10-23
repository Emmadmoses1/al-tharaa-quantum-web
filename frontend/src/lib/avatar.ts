import { supabase } from './supabase'
import { api } from './api'

// Square-crop and shrink a photo to a small JPEG before upload.
export function compressImage(file: File, size = 480): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const s = Math.min(img.width, img.height)
      const c = document.createElement('canvas')
      c.width = c.height = Math.min(size, s)
      const x = c.getContext('2d')
      if (!x) return reject(new Error('Canvas unavailable'))
      x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, c.width, c.height)
      c.toBlob(b => (b ? resolve(b) : reject(new Error('Could not process the image'))), 'image/jpeg', 0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Not a valid image')) }
    img.src = url
  })
}

export async function uploadAvatar(userId: string, blob: Blob): Promise<string> {
  const path = `${userId}/avatar-${Date.now()}.jpg`
  const { error } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  const r = await api.post<{ avatar_url: string }>('/api/account/avatar', { path })
  window.dispatchEvent(new Event('aq:profile-refresh'))
  return r.avatar_url
}
