import { getDevice } from './device'
import { api } from './api'

// Runs once when the site opens. If this device was blocked by the admin, the whole site is covered by a notice.
function block() {
  if (document.getElementById('aq-blocked')) return
  const d = document.createElement('div')
  d.id = 'aq-blocked'
  d.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0B0B0B;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:Cairo,Arial,sans-serif'
  d.innerHTML = '<div style="max-width:420px"><div style="font-size:44px">⛔</div><h2 style="color:#D4AF37;margin:12px 0 8px">لا يمكن استخدام المنصة على هذا الجهاز</h2><p style="color:#aaa;line-height:1.9;margin:0">تم إيقاف الوصول من هذا الجهاز. إن كنت تعتقد أن ذلك خطأ فتواصل مع الدعم.<br>Access from this device has been disabled. If you think this is a mistake, contact support.</p></div>'
  document.body.appendChild(d)
  document.body.style.overflow = 'hidden'
}

void (async () => {
  try {
    const device = await getDevice()
    const r = await api.post<{ blocked?: boolean }>('/api/public/device-check', { device })
    if (r?.blocked) {
      try { Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k)) } catch { /* ignore */ }
      block()
      new MutationObserver(() => { if (!document.getElementById('aq-blocked')) block() }).observe(document.body, { childList: true })
    }
  } catch { /* offline or server waking up: never block on an error */ }
})()
