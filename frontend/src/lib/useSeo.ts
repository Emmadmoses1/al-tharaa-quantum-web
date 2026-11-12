import { useEffect } from 'react'

const SITE = 'https://altharaaquantum.com'

function setMeta(sel: string, make: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(sel)
  if (!el) { el = make(); document.head.appendChild(el) }
  el.setAttribute(attr, value)
}

// Per-page title, description and canonical link (also used by link previews and search engines).
export function useSeo(title: string, description: string, path: string) {
  useEffect(() => {
    const full = `${title} | الثراء كوانتوم`
    document.title = full
    const url = SITE + path
    setMeta('meta[name="description"]', () => { const m = document.createElement('meta'); m.setAttribute('name', 'description'); return m }, 'content', description)
    setMeta('link[rel="canonical"]', () => { const l = document.createElement('link'); l.setAttribute('rel', 'canonical'); return l }, 'href', url)
    setMeta('meta[property="og:title"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:title'); return m }, 'content', full)
    setMeta('meta[property="og:description"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:description'); return m }, 'content', description)
    setMeta('meta[property="og:url"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:url'); return m }, 'content', url)
  }, [title, description, path])
}
