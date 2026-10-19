export function startLoop(name, fn, ms) {
  let busy = false
  const tick = async () => {
    if (busy) return
    busy = true
    try {
      const r = await fn()
      if (r) console.log(`[${name}]`, JSON.stringify(r))
    } catch (e) {
      console.error(`[${name}] error:`, e.message)
    } finally {
      busy = false
    }
  }
  setTimeout(tick, 5000)
  return setInterval(tick, ms)
}
