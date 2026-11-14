import { supabase } from './supabase'

// Photos are resized in the browser (max 1400px) so uploads stay small and fast.
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const s = Math.min(1, 1400 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return await new Promise<Blob>((ok, no) => c.toBlob(x => (x ? ok(x) : no(new Error('Image conversion failed'))), 'image/jpeg', 0.85))
}

export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file')
  const blob = await shrink(file)
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const { error } = await supabase.storage.from('opportunity-images').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return supabase.storage.from('opportunity-images').getPublicUrl(path).data.publicUrl
}

// Videos go straight to storage with a progress callback. The size limit is the one set in Supabase (Storage settings).
export async function uploadVideo(file: File, onProgress: (pct: number) => void): Promise<string> {
  if (!file.type.startsWith('video/')) throw new Error('Choose a video file')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Please sign in again')
  const base = String(import.meta.env.VITE_SUPABASE_URL).replace(/\/$/, '')
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'mp4'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  await new Promise<void>((ok, no) => {
    const x = new XMLHttpRequest()
    x.open('POST', `${base}/storage/v1/object/opportunity-videos/${path}`)
    x.setRequestHeader('Authorization', `Bearer ${token}`)
    x.setRequestHeader('apikey', String(import.meta.env.VITE_SUPABASE_ANON_KEY))
    x.setRequestHeader('x-upsert', 'false')
    x.setRequestHeader('Content-Type', file.type || 'video/mp4')
    x.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)) }
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) return ok()
      if (x.status === 413) return no(new Error('This video is larger than your storage limit. Paste a YouTube / Vimeo link instead, or raise the limit in Supabase → Storage → Settings.'))
      let m = ''
      try { m = JSON.parse(x.responseText)?.message || '' } catch { /* not JSON */ }
      no(new Error(m || `Upload failed (${x.status})`))
    }
    x.onerror = () => no(new Error('Network error during upload. Try again, or paste a video link instead.'))
    x.send(file)
  })
  return `${base}/storage/v1/object/public/opportunity-videos/${path}`
}
