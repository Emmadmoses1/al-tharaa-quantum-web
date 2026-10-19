import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { depositsApi } from '../lib/api'

// ============================================================
// TYPES
// ============================================================

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  nationality: string | null
  preferred_currency: string
  preferred_language: string
  role: string
  kyc_status: string
  created_at: string
}

export interface Deposit {
  id: string
  user_id: string
  asset: string
  network: string
  purpose: string
  wallet_address: string
  amount: number | null
  minimum_deposit: number
  required_confirmations: number
  confirmations: number
  txid: string | null
  status: string
  expires_at: string | null
  confirmed_at: string | null
  created_at: string
}

export interface InvestmentOpportunity {
  id: string
  name: string
  name_ar: string | null
  category: string
  location: string | null
  description: string | null
  description_ar: string | null
  minimum_investment: number
  target_amount: number
  amount_raised: number
  currency: string
  risk_level: string
  duration_days: number | null
  deadline: string | null
  fees_percent: number
  projected_return_min: number | null
  projected_return_max: number | null
  cover_image_url: string | null
  status: string
  created_at: string
}

export interface InvestmentAllocation {
  id: string
  user_id: string
  opportunity_id: string
  amount_invested: number
  currency: string
  current_value: number | null
  fees_paid: number
  status: string
  started_at: string | null
  expected_end_at: string | null
  created_at: string
  investment_opportunities: {
    name: string
    name_ar: string | null
    category: string
    cover_image_url: string | null
  } | null
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  title_ar: string | null
  message: string
  message_ar: string | null
  is_read: boolean
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface LedgerEntry {
  id: string
  user_id: string
  ledger_type: string
  entry_type: string
  asset: string
  amount: number
  balance_before: number
  balance_after: number
  reference_type: string | null
  description: string | null
  created_at: string
}

export interface Strategy {
  id: string
  name: string
  description: string | null
  description_ar: string | null
  risk_level: string
  timeframe: string
  supported_assets: string[]
  max_position_size_percent: number
  max_daily_loss_percent: number
  max_open_positions: number
  stop_loss_percent: number | null
  take_profit_percent: number | null
  is_enabled: boolean
}

export interface TradingPortfolio {
  id: string
  user_id: string
  available_balance: number
  allocated_capital: number
  unrealized_pnl: number
  realized_pnl: number
  total_trades: number
  winning_trades: number
  losing_trades: number
  max_drawdown: number
  ai_status: string
  active_strategy_id: string | null
  risk_level: string
}

export interface Trade {
  id: string
  user_id: string
  strategy_id: string | null
  asset: string
  side: string
  order_type: string
  executed_price: number | null
  quantity: number
  fees: number
  stop_loss: number | null
  take_profit: number | null
  status: string
  realized_pnl: number | null
  created_at: string
  closed_at: string | null
}

export interface PlatformStat {
  metric_key: string
  metric_value: number | null
  display_value: string | null
}

// ============================================================
// PLATFORM STATISTICS (public)
// ============================================================

export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_statistics')
        .select('metric_key, metric_value, display_value')
        .eq('is_visible', true)
      if (error) throw error
      return data as PlatformStat[]
    },
    staleTime: 1000 * 60 * 10,
  })
}

// ============================================================
// PROFILE
// ============================================================

export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: !!user?.id,
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user?.id) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', user?.id] })
    },
  })
}

// ============================================================
// DEPOSITS
// ============================================================

export function useDeposits() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['deposits', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Deposit[]
    },
    enabled: !!user?.id,
  })
}

export function useCreateDeposit() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      asset: string
      network: string
      purpose: 'investment' | 'trading'
    }) => {
      if (!user?.id) throw new Error('Not authenticated')

      // Get active wallet address
      const { data: wallet, error: walletErr } = await supabase
        .from('deposit_addresses')
        .select('address, minimum_deposit, required_confirmations')
        .eq('asset', params.asset)
        .eq('network', params.network)
        .eq('status', 'active')
        .single()

      if (walletErr || !wallet) {
        throw new Error('No active wallet found for this asset/network. Contact support.')
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          asset: params.asset,
          network: params.network,
          purpose: params.purpose,
          wallet_address: wallet.address,
          minimum_deposit: wallet.minimum_deposit,
          required_confirmations: wallet.required_confirmations,
          status: 'awaiting_payment',
          expires_at: expiresAt,
        })
        .select()
        .single()

      if (error) throw error
      return data as Deposit
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deposits', user?.id] })
    },
  })
}

export function useSubmitTxid() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ depositId, txid }: { depositId: string; txid: string }) => {
      if (!user?.id) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('deposits')
        .update({ txid, status: 'detected', updated_at: new Date().toISOString() })
        .eq('id', depositId)
        .eq('user_id', user.id)
        .eq('status', 'awaiting_payment')
        .select()
      if (!error && data && data.length > 0) return data[0]
      if (error?.code === '23505') throw new Error('رقم المعاملة هذا مستخدم من قبل')
      // Direct update blocked or matched nothing: go through the backend route
      return await depositsApi.submitTxid(depositId, txid)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deposits', user?.id] })
    },
  })
}

// ============================================================
// INVESTMENT OPPORTUNITIES
// ============================================================

export function useOpportunities(category?: string) {
  return useQuery({
    queryKey: ['opportunities', category],
    queryFn: async () => {
      let query = supabase
        .from('investment_opportunities')
        .select('*')
        .in('status', ['open', 'funding'])
        .order('created_at', { ascending: false })

      if (category && category !== 'all') {
        query = query.eq('category', category)
      }

      const { data, error } = await query
      if (error) throw error
      return data as InvestmentOpportunity[]
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: ['opportunity', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_opportunities')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as InvestmentOpportunity
    },
    enabled: !!id,
  })
}

// ============================================================
// INVESTMENT PORTFOLIO
// ============================================================

export function useInvestmentPortfolio() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['investment-portfolio', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('investment_allocations')
        .select(`
          *,
          investment_opportunities (
            name, name_ar, category, cover_image_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as InvestmentAllocation[]
    },
    enabled: !!user?.id,
  })
}

// ============================================================
// TRADING PORTFOLIO
// ============================================================

export function useTradingPortfolio() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['trading-portfolio', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('trading_portfolios')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data as TradingPortfolio | null
    },
    enabled: !!user?.id,
  })
}

// ============================================================
// TRADES
// ============================================================

export function useTrades(status?: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['trades', user?.id, status],
    queryFn: async () => {
      if (!user?.id) return []
      let query = supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (status && status !== 'all') {
        query = query.eq('status', status)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Trade[]
    },
    enabled: !!user?.id,
  })
}

// ============================================================
// STRATEGIES
// ============================================================

export function useStrategies() {
  return useQuery({
    queryKey: ['strategies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .order('name')
      if (error) throw error
      return data as Strategy[]
    },
    staleTime: 1000 * 60 * 10,
  })
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export function useNotifications() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as Notification[]
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  })
}

export function useUnreadCount() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      if (error) throw error
      return count || 0
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  })
}

export function useMarkNotificationRead() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', user?.id] })
      qc.invalidateQueries({ queryKey: ['unread-count', user?.id] })
    },
  })
}

export function useMarkAllRead() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', user?.id] })
      qc.invalidateQueries({ queryKey: ['unread-count', user?.id] })
    },
  })
}

// ============================================================
// LEDGER
// ============================================================

export function useLedger(ledgerType?: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['ledger', user?.id, ledgerType],
    queryFn: async () => {
      if (!user?.id) return []
      let query = supabase
        .from('ledger_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (ledgerType) {
        query = query.eq('ledger_type', ledgerType)
      }

      const { data, error } = await query
      if (error) throw error
      return data as LedgerEntry[]
    },
    enabled: !!user?.id,
  })
}

// ============================================================
// CURRENCIES
// ============================================================

export function useCurrencies() {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 60,
  })
}

// ============================================================
// ADMIN — USERS
// ============================================================

export function useAdminUsers(search?: string, role?: string) {
  return useQuery({
    queryKey: ['admin-users', search, role],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
      }
      if (role && role !== 'all') {
        query = query.eq('role', role)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Profile[]
    },
  })
}

export function useAdminUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

// ============================================================
// ADMIN — DEPOSITS
// ============================================================

export function useAdminDeposits(status?: string) {
  return useQuery({
    queryKey: ['admin-deposits', status],
    queryFn: async () => {
      let query = supabase
        .from('deposits')
        .select(`
          *,
          profiles (full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (status && status !== 'all') {
        query = query.eq('status', status)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    refetchInterval: 15000,
  })
}

// ============================================================
// ADMIN — WITHDRAWALS
// ============================================================

export function useAdminWithdrawals(status?: string) {
  return useQuery({
    queryKey: ['admin-withdrawals', status],
    queryFn: async () => {
      let query = supabase
        .from('withdrawals')
        .select(`
          *,
          profiles (full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (status && status !== 'all') {
        query = query.eq('status', status)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    refetchInterval: 15000,
  })
}

// ============================================================
// ADMIN — OPPORTUNITIES
// ============================================================

export function useAdminOpportunities() {
  return useQuery({
    queryKey: ['admin-opportunities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_opportunities')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as InvestmentOpportunity[]
    },
  })
}

export function useAdminCreateOpportunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (opp: Partial<InvestmentOpportunity>) => {
      const { data, error } = await supabase
        .from('investment_opportunities')
        .insert(opp)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-opportunities'] })
      qc.invalidateQueries({ queryKey: ['opportunities'] })
    },
  })
}

export function useAdminUpdateOpportunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InvestmentOpportunity> }) => {
      const { data, error } = await supabase
        .from('investment_opportunities')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-opportunities'] })
      qc.invalidateQueries({ queryKey: ['opportunities'] })
    },
  })
}

// ============================================================
// ADMIN — WALLETS
// ============================================================

export function useAdminWallets() {
  return useQuery({
    queryKey: ['admin-wallets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposit_addresses')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useAdminCreateWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (wallet: {
      asset: string
      network: string
      address: string
      label?: string
      minimum_deposit: number
      required_confirmations: number
    }) => {
      const { data, error } = await supabase
        .from('deposit_addresses')
        .insert({ ...wallet, status: 'active' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-wallets'] })
    },
  })
}

export function useAdminToggleWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('deposit_addresses')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-wallets'] })
    },
  })
}

// ============================================================
// ADMIN — PLATFORM STATS
// ============================================================

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [usersRes, depositsRes, withdrawalsRes, allocationsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('deposits').select('id', { count: 'exact', head: true }).eq('status', 'awaiting_payment'),
        supabase.from('withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('investment_allocations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ])
      return {
        totalUsers: usersRes.count || 0,
        pendingDeposits: depositsRes.count || 0,
        pendingWithdrawals: withdrawalsRes.count || 0,
        activeInvestments: allocationsRes.count || 0,
      }
    },
    refetchInterval: 30000,
  })
}
