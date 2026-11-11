import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const attempts = (options.method || 'GET').toUpperCase() === 'GET' ? 3 : 1 // only safe, repeatable requests are retried
  let lastErr: Error = new Error('Request failed')
  for (let i = 0; i < attempts; i++) {
    const headers = await getAuthHeaders()
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 70000) // a sleeping server can take about a minute to wake
    try {
      const res = await fetch(`${API_URL}${path}`, { ...options, headers, signal: ctl.signal })
      let data: { success?: boolean; data?: unknown; error?: { message?: string } } | null = null
      try { data = await res.json() } catch { data = null }
      if (res.ok && data?.success) return data.data as T
      if ([502, 503, 504].includes(res.status) && !data?.error && i < attempts - 1) { await sleep(1500 * (i + 1)); continue }
      throw new Error(data?.error?.message || (res.status >= 500 ? 'Server is busy. Please try again.' : 'Request failed'))
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Request failed')
      const aborted = err.name === 'AbortError'
      lastErr = aborted ? new Error('The request took too long. Please try again.') : err
      if ((aborted || /failed to fetch|network|load failed/i.test(err.message)) && i < attempts - 1) { await sleep(1200 * (i + 1)); continue }
      throw lastErr
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastErr
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
}

export const statisticsApi = {
  getPublic: () => api.get<Record<string, { value: number; display: string }>>('/api/statistics'),
}

export const depositsApi = {
  getAll: () => api.get('/api/deposits'),
  create: (body: { asset: string; network: string; purpose: string }) =>
    api.post('/api/deposits', body),
  submitTxid: (id: string, txid: string) =>
    api.patch(`/api/deposits/${id}/txid`, { txid }),
}

export const investmentsApi = {
  getOpportunities: (params?: { category?: string }) => {
    const qs = params?.category ? `?category=${params.category}` : ''
    return api.get(`/api/investments/opportunities${qs}`)
  },
  getOpportunity: (id: string) => api.get(`/api/investments/opportunities/${id}`),
  getPortfolio: () => api.get('/api/investments/portfolio'),
}

export const tradingApi = {
  getPortfolio: () => api.get('/api/trading/portfolio'),
  getSignals: () => api.get('/api/trading/signals'),
  getStrategies: () => api.get('/api/trading/strategies'),
  getTrades: (params?: { status?: string }) => {
    const qs = params?.status ? `?status=${params.status}` : ''
    return api.get(`/api/trading/trades${qs}`)
  },
  emergencyStop: () => api.post('/api/trading/emergency-stop', {}),
}

export const profileApi = {
  get: () => api.get('/api/profile'),
  update: (body: Record<string, unknown>) => api.patch('/api/profile', body),
}
