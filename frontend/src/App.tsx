import { Routes, Route, Navigate } from 'react-router-dom'
import LangSwitch from './components/LangSwitch'
import SoundEvents from './components/SoundEvents'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AdminRoute from './components/layout/AdminRoute'
import DashboardLayout from './components/layout/DashboardLayout'
import AdminLayout from './components/layout/AdminLayout'

// Public pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// User dashboard pages
import DashboardHome from './pages/dashboard/DashboardHome'
import DepositSwitch from './components/DepositSwitch'
import Tracker from './components/Tracker'
import AdminPayments from './pages/admin/AdminPayments'
import AdminTraffic from './pages/admin/AdminTraffic'
import InvestmentsPage from './pages/dashboard/InvestmentsPage'
import TradingPage from './pages/dashboard/TradingPage'
import SignalsPage from './pages/dashboard/SignalsPage'
import TradeRoom from './pages/dashboard/TradeRoom'
import TransactionsPage from './pages/dashboard/TransactionsPage'
import ProfilePage from './pages/dashboard/ProfilePage'
import NotificationsPage from './pages/dashboard/NotificationsPage'
import WithdrawPage from './pages/dashboard/WithdrawPage'
import SettingsPage from './pages/dashboard/SettingsPage'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminDeposits from './pages/admin/AdminDeposits'
import AdminWithdrawals from './pages/admin/AdminWithdrawals'
import AdminWallets from './pages/admin/AdminWallets'
import AdminOpportunities from './pages/admin/AdminOpportunities'
import AdminAllocations from './pages/admin/AdminAllocations'
import AdminAiOverview from './pages/admin/AdminAiOverview'
import AdminStrategies from './pages/admin/AdminStrategies'
import AdminRisk from './pages/admin/AdminRisk'
import AdminTransactions from './pages/admin/AdminTransactions'
import AdminLedger from './pages/admin/AdminLedger'
import AdminCurrencies from './pages/admin/AdminCurrencies'
import AdminStatistics from './pages/admin/AdminStatistics'
import AdminNotifications from './pages/admin/AdminNotifications'
import AdminSettings from './pages/admin/AdminSettings'
import AdminTrades from './pages/admin/AdminTrades'
import AdminBinary from './pages/admin/AdminBinary'
import AdminSystem from './pages/admin/AdminSystem'
import AdminReserves from './pages/admin/AdminReserves'
import AdminBalances from './pages/admin/AdminBalances'
import AdminSignalEngine from './pages/admin/AdminSignalEngine'
import AdminSupport from './pages/admin/AdminSupport'
import AdminAudit from './pages/admin/AdminAudit'
import SupportPage from './pages/dashboard/SupportPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import { AboutPage, SecurityPage, FaqPage, ContactPage, RiskPage, PrivacyPage, TermsPage } from './pages/public/PublicPages'
import AiTradingPage from './pages/public/AiTradingPage'
import OpportunitiesPublic from './pages/public/OpportunitiesPublic'
import MarketsPublic from './pages/public/MarketsPublic'
import MarketsDash from './pages/dashboard/MarketsDash'
import AiIntelligencePage from './pages/dashboard/AiIntelligencePage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AdminIntegrations from './pages/admin/AdminIntegrations'
import SiteNotice from './components/SiteNotice'
import WelcomeBonus from './components/WelcomeBonus'
import InstallButton from './components/InstallButton'

function UserPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  )
}

function AdminPage({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <AdminLayout>{children}</AdminLayout>
    </AdminRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <LangSwitch />
      <SoundEvents />
      <SiteNotice />
      <WelcomeBonus />
      <InstallButton />
      <Tracker />
      <Routes>
        {/* ── Public ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/ai-trading" element={<AiTradingPage />} />
        <Route path="/opportunities" element={<OpportunitiesPublic />} />
        <Route path="/markets" element={<MarketsPublic />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/risk" element={<RiskPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ── User Dashboard ── */}
        <Route path="/dashboard" element={<UserPage><DashboardHome /></UserPage>} />
        <Route path="/dashboard/deposit" element={<UserPage><DepositSwitch /></UserPage>} />
        <Route path="/dashboard/withdraw" element={<UserPage><WithdrawPage /></UserPage>} />
        <Route path="/dashboard/investments" element={<UserPage><InvestmentsPage /></UserPage>} />
        <Route path="/dashboard/trading" element={<Navigate to="/dashboard/trade" replace />} />
        <Route path="/dashboard/signals" element={<UserPage><SignalsPage /></UserPage>} />
        <Route path="/dashboard/trade" element={<UserPage><TradeRoom /></UserPage>} />
        <Route path="/dashboard/transactions" element={<UserPage><TransactionsPage /></UserPage>} />
        <Route path="/dashboard/notifications" element={<UserPage><NotificationsPage /></UserPage>} />
        <Route path="/dashboard/profile" element={<UserPage><ProfilePage /></UserPage>} />
        <Route path="/dashboard/settings" element={<UserPage><SettingsPage /></UserPage>} />
        <Route path="/dashboard/support" element={<UserPage><SupportPage /></UserPage>} />
        <Route path="/dashboard/markets" element={<UserPage><MarketsDash /></UserPage>} />
        <Route path="/dashboard/ai" element={<UserPage><AiIntelligencePage /></UserPage>} />

        {/* ── Admin Panel ── */}
        <Route path="/admin" element={<AdminPage><AdminDashboard /></AdminPage>} />
        <Route path="/admin/users" element={<AdminPage><AdminUsers /></AdminPage>} />
        <Route path="/admin/deposits" element={<AdminPage><AdminDeposits /></AdminPage>} />
        <Route path="/admin/withdrawals" element={<AdminPage><AdminWithdrawals /></AdminPage>} />
        <Route path="/admin/transactions" element={<AdminPage><AdminTransactions /></AdminPage>} />
        <Route path="/admin/ledger" element={<AdminPage><AdminLedger /></AdminPage>} />
        <Route path="/admin/reserves" element={<AdminPage><AdminReserves /></AdminPage>} />
        <Route path="/admin/balances" element={<AdminPage><AdminBalances /></AdminPage>} />
        <Route path="/admin/opportunities" element={<AdminPage><AdminOpportunities /></AdminPage>} />
        <Route path="/admin/allocations" element={<AdminPage><AdminAllocations /></AdminPage>} />
        <Route path="/admin/ai" element={<AdminPage><AdminAiOverview /></AdminPage>} />
        <Route path="/admin/signal-engine" element={<AdminPage><AdminSignalEngine /></AdminPage>} />
        <Route path="/admin/strategies" element={<AdminPage><AdminStrategies /></AdminPage>} />
        <Route path="/admin/risk" element={<AdminPage><AdminRisk /></AdminPage>} />
        <Route path="/admin/wallets" element={<AdminPage><AdminWallets /></AdminPage>} />
        <Route path="/admin/currencies" element={<AdminPage><AdminCurrencies /></AdminPage>} />
        <Route path="/admin/notifications" element={<AdminPage><AdminNotifications /></AdminPage>} />
        <Route path="/admin/statistics" element={<AdminPage><AdminStatistics /></AdminPage>} />
        <Route path="/admin/settings" element={<AdminPage><AdminSettings /></AdminPage>} />
        <Route path="/admin/trades" element={<AdminPage><AdminTrades /></AdminPage>} />
        <Route path="/admin/binary" element={<AdminPage><AdminBinary /></AdminPage>} />
        <Route path="/admin/system" element={<AdminPage><AdminSystem /></AdminPage>} />
        <Route path="/admin/support" element={<AdminPage><AdminSupport /></AdminPage>} />
        <Route path="/admin/audit" element={<AdminPage><AdminAudit /></AdminPage>} />
        <Route path="/admin/integrations" element={<AdminPage><AdminIntegrations /></AdminPage>} />
        <Route path="/admin/payments" element={<AdminPage><AdminPayments /></AdminPage>} />
        <Route path="/admin/traffic" element={<AdminPage><AdminTraffic /></AdminPage>} />

        {/* ── 404 ── */}
        <Route path="*" element={
          <div style={{
            minHeight: '100vh', background: '#0B0B0B',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexDirection: 'column',
            gap: 14, direction: 'rtl',
          }}>
            <div style={{ fontSize: 72, fontWeight: 900, color: '#D4AF37', fontFamily: 'Montserrat' }}>
              404
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'Cairo' }}>
              الصفحة غير موجودة
            </div>
            <a href="/" style={{ color: '#D4AF37', fontFamily: 'Cairo', fontSize: 14, textDecoration: 'none' }}>
              العودة للرئيسية
            </a>
          </div>
        } />
      </Routes>
    </AuthProvider>
  )
}
