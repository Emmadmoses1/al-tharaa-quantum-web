/* eslint-disable @typescript-eslint/no-explicit-any */
// Records failed network calls so the admin System Check can see them.
const w = window as any
if (!w.__netlogInstalled) {
  w.__netlogInstalled = true
  w.__netlog = []
  const orig = window.fetch.bind(window)
  const push = (url: string, status: number, error?: string) => {
    const clean = url.split('?')[0]
    w.__netlog.push({ url: clean, status, error })
    if (w.__netlog.length > 100) w.__netlog.shift()
  }
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const a = args[0] as any
    const url = typeof a === 'string' ? a : a?.url ?? String(a)
    try {
      const r = await orig(...args)
      if (r.status >= 400) push(url, r.status)
      return r
    } catch (e: any) {
      if (e?.name !== 'AbortError') push(url, 0, e?.message)
      throw e
    }
  }
}
export {}
