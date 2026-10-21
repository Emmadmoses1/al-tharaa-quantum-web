import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

// Registers the service worker (needed for "install app") and shows an install button when the browser allows it.
export default function InstallButton() {
  const [ev, setEv] = useState<InstallEvent | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
    const onPrompt = (e: Event) => { e.preventDefault(); setEv(e as InstallEvent) }
    const onInstalled = () => setEv(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled) }
  }, [])

  if (!ev) return null
  return (
    <button type="button" aria-label="Install app" translate="no"
      onClick={async () => { await ev.prompt(); await ev.userChoice.catch(() => null); setEv(null) }}
      style={{ position: 'fixed', left: 10, bottom: 186, zIndex: 9999, width: 44, height: 44, borderRadius: '50%', background: '#D4AF37', border: 'none', color: '#0B0B0B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.5)' }}>
      <Download size={20} />
    </button>
  )
}
