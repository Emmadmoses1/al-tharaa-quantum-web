import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { inputCss, btn, labelCss, cardCss } from '../../components/ui/AdminKit'
import { Skeleton } from '../../components/ui/Skeleton'

type Feed = { id: string; name: string; url: string }
type Item = { title: string; link: string; summary: string; image: string; video: string; published: string | null }

// RSS finder: read opportunity news from feeds you trust, and turn any item into a DRAFT opportunity (title, text, picture and video are carried over).
export default function AdminRss() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const [feedId, setFeedId] = useState('')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)

  const feeds = useQuery({ queryKey: ['rss-feeds'], queryFn: () => api.get<Feed[]>('/api/admin/opp-tools/feeds') })
  const items = useQuery({ queryKey: ['rss-items', feedId], enabled: !!feedId, retry: 0, staleTime: 120000, queryFn: () => api.get<Item[]>(`/api/admin/opp-tools/items/${feedId}`) })

  async function addFeed() {
    setBusy('add'); setMsg(null)
    try {
      const f = await api.post<Feed>('/api/admin/opp-tools/feeds', { name, url })
      setName(''); setUrl(''); setFeedId(f.id)
      await qc.invalidateQueries({ queryKey: ['rss-feeds'] })
    } catch (e) { setMsg({ ok: false, t: e instanceof Error ? e.message : 'Failed' }) }
    setBusy('')
  }
  async function delFeed() {
    if (!feedId || !window.confirm('Remove this feed?')) return
    try { await api.post(`/api/admin/opp-tools/feeds/${feedId}/delete`, {}); setFeedId(''); await qc.invalidateQueries({ queryKey: ['rss-feeds'] }) }
    catch (e) { setMsg({ ok: false, t: e instanceof Error ? e.message : 'Failed' }) }
  }
  async function use(it: Item, idx: number) {
    setBusy(`use${idx}`); setMsg(null)
    let cover = ''
    if (it.image) {
      try { cover = (await api.post<{ url: string }>('/api/admin/opp-tools/import-image', { url: it.image })).url }
      catch { setMsg({ ok: false, t: 'The picture could not be copied, so the draft opens without it.' }) }
    }
    const description = `${it.summary}${it.link ? `\n\nSource: ${it.link}` : ''}`.slice(0, 2000)
    try { sessionStorage.setItem('aq_opp_prefill', JSON.stringify({ name: it.title.slice(0, 120), description, cover_image_url: cover, video_url: it.video })) } catch { /* storage blocked */ }
    setBusy('')
    nav('/admin/opportunities')
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>RSS Finder</h1>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Montserrat', lineHeight: 1.7, marginBottom: 14 }}>
        Add RSS or Atom links from sources you trust. Pick an article and it opens as a <b>Draft</b> opportunity with the title, text, picture and video already filled in.
        The content belongs to its source: get permission, rewrite it in your own words, and verify every claim and number before you publish.
      </p>

      <div style={{ ...cardCss, display: 'grid', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
          <div><label style={labelCss}>NAME</label><input value={name} onChange={e => setName(e.target.value)} maxLength={60} style={inputCss} placeholder="e.g. Agri news" /></div>
          <div><label style={labelCss}>FEED LINK (https)</label><input value={url} onChange={e => setUrl(e.target.value)} style={inputCss} placeholder="https://example.com/feed.xml" /></div>
        </div>
        <button type="button" onClick={addFeed} disabled={busy === 'add' || name.trim().length < 2 || !url} style={btn('gold', busy === 'add' || name.trim().length < 2 || !url)}>{busy === 'add' ? 'Checking feed…' : 'Add feed'}</button>
      </div>

      {msg && <div style={{ fontSize: 12, fontFamily: 'Montserrat', color: msg.ok ? '#10b981' : '#ef4444', marginBottom: 10 }}>{msg.t}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <select value={feedId} onChange={e => setFeedId(e.target.value)} style={{ ...inputCss, flex: 1 }}>
          <option value="">{feeds.isLoading ? 'Loading…' : (feeds.data || []).length ? 'Choose a feed…' : 'No feeds yet — add one above'}</option>
          {(feeds.data || []).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        {feedId && <button type="button" onClick={delFeed} style={btn('red')}>Remove feed</button>}
      </div>

      {feedId && items.isLoading && <Skeleton height={120} borderRadius={14} />}
      {feedId && items.isError && <div style={{ ...cardCss, color: '#ef4444', fontSize: 12, fontFamily: 'Montserrat' }}>{items.error instanceof Error ? items.error.message : 'Could not read this feed.'}</div>}
      <div style={{ display: 'grid', gap: 10 }}>
        {(items.data || []).map((it, i) => (
          <div key={`${it.link}${i}`} style={{ ...cardCss, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {it.image ? <img src={it.image} alt="" loading="lazy" referrerPolicy="no-referrer" style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} /> : null}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13 }}>{it.title}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat', fontSize: 11, lineHeight: 1.7, margin: '4px 0', maxHeight: 54, overflow: 'hidden' }}>{it.summary}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 10, fontFamily: 'Montserrat', color: 'rgba(255,255,255,0.4)' }}>
                {it.image && <span style={{ color: '#10b981' }}>PHOTO</span>}
                {it.video && <span style={{ color: '#818cf8' }}>VIDEO</span>}
                {it.link && <a href={it.link} target="_blank" rel="noopener noreferrer" style={{ color: '#D4AF37' }}>source</a>}
              </div>
            </div>
            <button type="button" onClick={() => use(it, i)} disabled={busy !== ''} style={btn('gold', busy !== '')}>{busy === `use${i}` ? '…' : 'Use as draft'}</button>
          </div>
        ))}
      </div>
    </div>
  )
}
