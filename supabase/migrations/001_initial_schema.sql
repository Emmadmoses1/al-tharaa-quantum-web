-- ============================================================
-- AL THARAA QUANTUM — INITIAL DATABASE SCHEMA
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  nationality TEXT,
  preferred_currency TEXT NOT NULL DEFAULT 'BHD',
  preferred_language TEXT NOT NULL DEFAULT 'ar',
  role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user','admin','support','finance','trading_admin','super_admin')),
  kyc_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (kyc_status IN ('pending','submitted','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PLATFORM STATISTICS
-- ============================================================
CREATE TABLE platform_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_key TEXT UNIQUE NOT NULL,
  metric_value NUMERIC,
  display_value TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_statistics (metric_key, metric_value, display_value, is_visible) VALUES
  ('registered_users', 0, '0', false),
  ('countries_served', 0, '40+', true),
  ('platform_uptime', 99.97, '99.97%', true),
  ('supported_assets', 4, '4', true),
  ('total_volume', 0, '0', false);

-- ============================================================
-- CURRENCIES
-- ============================================================
CREATE TABLE currencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  symbol TEXT NOT NULL,
  decimal_precision INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO currencies (code, name, name_ar, symbol, decimal_precision, display_order) VALUES
  ('BHD', 'Bahraini Dinar', 'دينار بحريني', 'BD', 3, 1),
  ('USD', 'US Dollar', 'دولار أمريكي', '$', 2, 2),
  ('EUR', 'Euro', 'يورو', '€', 2, 3),
  ('GBP', 'British Pound', 'جنيه إسترليني', '£', 2, 4),
  ('SAR', 'Saudi Riyal', 'ريال سعودي', 'SR', 2, 5),
  ('AED', 'UAE Dirham', 'درهم إماراتي', 'AED', 2, 6),
  ('QAR', 'Qatari Riyal', 'ريال قطري', 'QR', 2, 7),
  ('KWD', 'Kuwaiti Dinar', 'دينار كويتي', 'KD', 3, 8),
  ('OMR', 'Omani Rial', 'ريال عماني', 'OMR', 3, 9),
  ('NGN', 'Nigerian Naira', 'نيرة نيجيرية', '₦', 2, 10);

-- ============================================================
-- ASSETS (CRYPTO)
-- ============================================================
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  supported_networks TEXT[] NOT NULL DEFAULT '{}',
  decimal_precision INTEGER NOT NULL DEFAULT 8,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO assets (symbol, name, name_ar, supported_networks, decimal_precision) VALUES
  ('USDT', 'Tether USD', 'تيثر', ARRAY['TRC20','ERC20','BEP20'], 6),
  ('BTC', 'Bitcoin', 'بيتكوين', ARRAY['Bitcoin'], 8),
  ('ETH', 'Ethereum', 'إيثيريوم', ARRAY['ERC20'], 8),
  ('USDC', 'USD Coin', 'يو إس دي كوين', ARRAY['ERC20','BEP20'], 6);

-- ============================================================
-- CURRENCY RATES
-- ============================================================
CREATE TABLE currency_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_currency TEXT NOT NULL,
  quote_currency TEXT NOT NULL,
  rate NUMERIC(20,10) NOT NULL,
  provider TEXT NOT NULL DEFAULT 'manual',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(base_currency, quote_currency)
);

-- ============================================================
-- DEPOSIT ADDRESSES (ADMIN MANAGED)
-- ============================================================
CREATE TABLE deposit_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset TEXT NOT NULL REFERENCES assets(symbol),
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  label TEXT,
  minimum_deposit NUMERIC(20,8) NOT NULL DEFAULT 0,
  required_confirmations INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','deprecated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(asset, network)
);

-- ============================================================
-- DEPOSITS
-- ============================================================
CREATE TABLE deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  asset TEXT NOT NULL,
  network TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('investment','trading')),
  wallet_address TEXT NOT NULL,
  amount NUMERIC(20,8),
  minimum_deposit NUMERIC(20,8),
  required_confirmations INTEGER NOT NULL DEFAULT 1,
  confirmations INTEGER NOT NULL DEFAULT 0,
  txid TEXT,
  status TEXT NOT NULL DEFAULT 'awaiting_payment'
    CHECK (status IN ('awaiting_payment','detected','confirming','confirmed','failed','expired','rejected')),
  expires_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX deposits_txid_unique ON deposits(txid) WHERE txid IS NOT NULL;

-- ============================================================
-- LEDGER ENTRIES (IMMUTABLE)
-- ============================================================
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  ledger_type TEXT NOT NULL CHECK (ledger_type IN ('investment','trading')),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('credit','debit','fee','adjustment')),
  asset TEXT NOT NULL,
  amount NUMERIC(20,8) NOT NULL,
  balance_before NUMERIC(20,8) NOT NULL,
  balance_after NUMERIC(20,8) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ledger entries must never be updated or deleted
CREATE RULE no_update_ledger AS ON UPDATE TO ledger_entries DO INSTEAD NOTHING;
CREATE RULE no_delete_ledger AS ON DELETE TO ledger_entries DO INSTEAD NOTHING;

-- ============================================================
-- INVESTMENT OPPORTUNITIES
-- ============================================================
CREATE TABLE investment_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ar TEXT,
  category TEXT NOT NULL,
  location TEXT,
  description TEXT,
  description_ar TEXT,
  investment_type TEXT NOT NULL DEFAULT 'equity',
  minimum_investment NUMERIC(20,3) NOT NULL,
  target_amount NUMERIC(20,3) NOT NULL,
  amount_raised NUMERIC(20,3) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BHD',
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low','medium','high','very_high')),
  duration_days INTEGER,
  deadline TIMESTAMPTZ,
  fees_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  projected_return_min NUMERIC(5,2),
  projected_return_max NUMERIC(5,2),
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','open','funding','funded','active','matured','completed','cancelled','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INVESTMENT ALLOCATIONS
-- ============================================================
CREATE TABLE investment_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  opportunity_id UUID NOT NULL REFERENCES investment_opportunities(id),
  amount_invested NUMERIC(20,3) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BHD',
  current_value NUMERIC(20,3),
  fees_paid NUMERIC(20,3) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','matured','completed','cancelled')),
  deposit_id UUID REFERENCES deposits(id),
  started_at TIMESTAMPTZ,
  expected_end_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WITHDRAWALS
-- ============================================================
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  withdrawal_type TEXT NOT NULL CHECK (withdrawal_type IN ('trading','investment_redemption')),
  asset TEXT NOT NULL,
  network TEXT NOT NULL,
  amount NUMERIC(20,8) NOT NULL,
  fees NUMERIC(20,8) NOT NULL DEFAULT 0,
  net_amount NUMERIC(20,8) NOT NULL,
  destination_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','processing','completed','rejected','cancelled')),
  txid TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STRATEGIES
-- ============================================================
CREATE TABLE strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  description_ar TEXT,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('conservative','moderate','aggressive')),
  timeframe TEXT NOT NULL DEFAULT '1h',
  supported_assets TEXT[] NOT NULL DEFAULT '{}',
  max_position_size_percent NUMERIC(5,2) NOT NULL DEFAULT 5,
  max_daily_loss_percent NUMERIC(5,2) NOT NULL DEFAULT 3,
  max_open_positions INTEGER NOT NULL DEFAULT 3,
  stop_loss_percent NUMERIC(5,2),
  take_profit_percent NUMERIC(5,2),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO strategies (name, description, description_ar, risk_level, timeframe, supported_assets) VALUES
  ('Quantum Momentum', 'Momentum-based strategy using volume and price action', 'استراتيجية الزخم', 'moderate', '1h', ARRAY['BTC','ETH']),
  ('Quantum Trend', 'Trend-following strategy with moving averages', 'استراتيجية الاتجاه', 'moderate', '4h', ARRAY['BTC','ETH','USDT']),
  ('Quantum Conservative', 'Low-risk strategy focused on capital preservation', 'استراتيجية محافظة', 'conservative', '1d', ARRAY['BTC','ETH']),
  ('Quantum Balanced', 'Balanced risk-reward strategy', 'استراتيجية متوازنة', 'moderate', '4h', ARRAY['BTC','ETH']),
  ('Quantum Scalper', 'Short-term scalping strategy', 'استراتيجية السكالبينغ', 'aggressive', '15m', ARRAY['BTC']),
  ('Quantum Swing', 'Swing trading over multiple days', 'استراتيجية السوينغ', 'moderate', '1d', ARRAY['BTC','ETH']),
  ('Quantum Growth', 'Growth-focused higher risk strategy', 'استراتيجية النمو', 'aggressive', '4h', ARRAY['BTC','ETH']);

-- ============================================================
-- TRADES
-- ============================================================
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  strategy_id UUID REFERENCES strategies(id),
  asset TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  order_type TEXT NOT NULL CHECK (order_type IN ('market','limit','stop')),
  requested_price NUMERIC(20,8),
  executed_price NUMERIC(20,8),
  quantity NUMERIC(20,8) NOT NULL,
  fees NUMERIC(20,8) NOT NULL DEFAULT 0,
  stop_loss NUMERIC(20,8),
  take_profit NUMERIC(20,8),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','open','closed','cancelled','failed')),
  exchange TEXT,
  external_order_id TEXT,
  realized_pnl NUMERIC(20,8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- ============================================================
-- TRADING PORTFOLIOS
-- ============================================================
CREATE TABLE trading_portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id),
  available_balance NUMERIC(20,8) NOT NULL DEFAULT 0,
  allocated_capital NUMERIC(20,8) NOT NULL DEFAULT 0,
  unrealized_pnl NUMERIC(20,8) NOT NULL DEFAULT 0,
  realized_pnl NUMERIC(20,8) NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  losing_trades INTEGER NOT NULL DEFAULT 0,
  max_drawdown NUMERIC(5,2) NOT NULL DEFAULT 0,
  ai_status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (ai_status IN ('inactive','active','paused','emergency_stopped')),
  active_strategy_id UUID REFERENCES strategies(id),
  risk_level TEXT NOT NULL DEFAULT 'moderate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AI SIGNALS
-- ============================================================
CREATE TABLE ai_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id UUID REFERENCES strategies(id),
  asset TEXT NOT NULL,
  signal TEXT NOT NULL CHECK (signal IN ('BUY','SELL','HOLD','WAIT')),
  entry_zone_low NUMERIC(20,8),
  entry_zone_high NUMERIC(20,8),
  stop_loss NUMERIC(20,8),
  take_profit_1 NUMERIC(20,8),
  take_profit_2 NUMERIC(20,8),
  risk_level TEXT,
  confidence_percent NUMERIC(5,2),
  timeframe TEXT,
  analysis_summary TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AI DECISIONS (AUDIT)
-- ============================================================
CREATE TABLE ai_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id UUID REFERENCES strategies(id),
  asset TEXT NOT NULL,
  signal TEXT NOT NULL,
  indicators JSONB,
  risk_assessment JSONB,
  decision TEXT NOT NULL,
  model_version TEXT,
  execution_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  message TEXT NOT NULL,
  message_ar TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','urgent')),
  admin_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "users_own_profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "users_own_deposits" ON deposits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_own_ledger" ON ledger_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_own_allocations" ON investment_allocations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_own_withdrawals" ON withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_own_trades" ON trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_own_portfolio" ON trading_portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_own_notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_tickets" ON support_tickets FOR ALL USING (auth.uid() = user_id);

-- Public read for opportunities and statistics
ALTER TABLE investment_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_opportunities" ON investment_opportunities FOR SELECT USING (status IN ('open','funding','funded','active'));
ALTER TABLE platform_statistics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_statistics" ON platform_statistics FOR SELECT USING (is_visible = true);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_deposits_user_id ON deposits(user_id);
CREATE INDEX idx_deposits_status ON deposits(status);
CREATE INDEX idx_deposits_txid ON deposits(txid) WHERE txid IS NOT NULL;
CREATE INDEX idx_ledger_user_id ON ledger_entries(user_id);
CREATE INDEX idx_ledger_type ON ledger_entries(ledger_type);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_allocations_user_id ON investment_allocations(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
