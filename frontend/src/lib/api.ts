import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data?.error?.message || 'Request failed')
  }
  return data.data as T
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
