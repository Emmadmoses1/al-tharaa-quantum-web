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

export class ApiError extends Error {
  code?: string
  constructor(message: string, code?: string) { super(message); this.name = 'ApiError'; this.code = code }
}

const isAdminPath = (p: string) => p.startsWith('/api/admin')

// Plain Arabic for every known server code, so users never see raw English or technical wording.
const AR: Record<string, string> = {
  SIGNAL_EXPIRED: 'انتهت صلاحية هذه الإشارة. حدّث الصفحة واختر أحدث إشارة.',
  SIGNAL_STALE: 'السعر تجاوز حدود هذه الإشارة. انتظر إشارة جديدة.',
  PRICE_MOVED: 'ابتعد السعر عن نقطة دخول الإشارة. حدّث الصفحة لرؤية أحدث إشارة.',
  PRICE_UNAVAILABLE: 'سعر السوق غير متاح لحظياً. حاول مرة أخرى بعد قليل.',
  FACE_REQUIRED: 'يجب توثيق حسابك بالوجه قبل السحب. افتح صفحة التحقق من الوجه.',
  MAINTENANCE: 'المنصة في صيانة قصيرة. نعود قريباً.',
  PAUSED: 'هذه الخدمة متوقفة مؤقتاً من الإدارة.',
  ACCOUNT_SUSPENDED: 'حسابك موقوف. تواصل مع الدعم.',
  RATE_LIMITED: 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.',
  UNAUTHORIZED: 'انتهت جلستك. سجّل الدخول من جديد.',
  FORBIDDEN: 'ليست لديك صلاحية لهذا الإجراء.',
  BELOW_MINIMUM: 'المبلغ أقل من الحد الأدنى المسموح.',
  TRADING_USDT_ONLY: 'التداول متاح برصيد USDT فقط.',
  WALLET_NOT_FOUND: 'لم نجد محفظتك. حدّث الصفحة وحاول مجدداً.',
  DUPLICATE_TXID: 'تم استخدام رقم المعاملة هذا من قبل.',
  NOT_FOUND: 'العنصر المطلوب غير موجود.',
  INVALID_STATUS: 'لا يمكن تنفيذ هذا الإجراء في حالته الحالية.',
  NO_KEY: 'خدمة الدفع غير متاحة مؤقتاً. حاول لاحقاً أو تواصل مع الدعم.',
  NOWPAYMENTS_ERROR: 'خدمة الدفع غير متاحة مؤقتاً. حاول لاحقاً أو تواصل مع الدعم.',
  BAD_REQUEST: 'البيانات المدخلة غير صحيحة. راجع الحقول وحاول مرة أخرى.',
  VALIDATION_ERROR: 'البيانات المدخلة غير صحيحة. راجع الحقول وحاول مرة أخرى.',
}

function friendly(path: string, status: number, code?: string, msg?: string): string {
  if (isAdminPath(path)) return msg || (status >= 500 ? 'Server is busy. Please try again.' : 'Request failed')
  if (code && AR[code]) return AR[code]
  if (msg && /[\u0600-\u06FF]/.test(msg)) return msg
  if (msg && /insufficient/i.test(msg)) return 'رصيدك غير كافٍ لإتمام العملية.'
  if (status >= 500) return 'الخادم مشغول الآن. حاول بعد لحظات.'
  return 'تعذّر تنفيذ الطلب. حاول مرة أخرى.'
}

// Wake a sleeping free-tier server as soon as the app opens, so the first real action is not slow.
if (typeof window !== 'undefined') { fetch(`${API_URL}/api/health`, { cache: 'no-store' }).catch(() => undefined) }


async function rawRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const attempts = (options.method || 'GET').toUpperCase() === 'GET' ? 3 : 1 // only safe, repeatable requests are retried
  let lastErr: Error = new Error('Request failed')
  for (let i = 0; i < attempts; i++) {
    const headers = await getAuthHeaders()
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 70000) // a sleeping server can take about a minute to wake
    try {
      const res = await fetch(`${API_URL}${path}`, { ...options, headers, signal: ctl.signal })
      let data: { success?: boolean; data?: unknown; error?: { message?: string; code?: string } } | null = null
      try { data = await res.json() } catch { data = null }
      if (res.ok && data?.success) return data.data as T
      if ([502, 503, 504].includes(res.status) && !data?.error && i < attempts - 1) { await sleep(1500 * (i + 1)); continue }
      throw new ApiError(friendly(path, res.status, data?.error?.code, data?.error?.message), data?.error?.code)
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try { return await rawRequest<T>(path, options) }
  catch (e) {
    if (e instanceof ApiError || isAdminPath(path)) throw e
    const m = e instanceof Error ? e.message : ''
    if (/too long/i.test(m)) throw new Error('استغرق الطلب وقتاً طويلاً. حاول مرة أخرى.')
    if (/failed to fetch|network|load failed/i.test(m)) throw new Error('تعذّر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.')
    throw e
  }
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
