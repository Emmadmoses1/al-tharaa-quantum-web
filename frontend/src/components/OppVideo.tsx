// Plays a product video: YouTube / Vimeo links are embedded, any other link or uploaded file plays directly.
function embed(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return null
}

export default function OppVideo({ url }: { url: string }) {
  if (!/^https?:\/\//i.test(url)) return null
  const e = embed(url)
  return (
    <div style={{ marginTop: 18 }}>
      {e ? (
        <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
          <iframe src={e} title="Video" loading="lazy" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
        </div>
      ) : (
        <video src={url} controls playsInline preload="metadata" style={{ width: '100%', maxHeight: 420, borderRadius: 12, background: '#000' }} />
      )}
    </div>
  )
}
