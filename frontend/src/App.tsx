import { Routes, Route } from 'react-router-dom'
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
import DepositPage from './pages/dashboard/DepositPage'
import InvestmentsPage from './pages/dashboard/InvestmentsPage'
import TradingPage from './pages/dashboard/TradingPage'
import SignalsPage from './pages/dashboard/SignalsPage'
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
import AdminKyc from './pages/admin/AdminKyc'
import AdminReserves from './pages/admin/AdminReserves'
import AdminBalances from './pages/admin/AdminBalances'
import AdminSignalEngine from './pages/admin/AdminSignalEngine'

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
      <Routes>
        {/* ── Public ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ── User Dashboard ── */}
        <Route path="/dashboard" element={<UserPage><DashboardHome /></UserPage>} />
        <Route path="/dashboard/deposit" element={<UserPage><DepositPage /></UserPage>} />
        <Route path="/dashboard/withdraw" element={<UserPage><WithdrawPage /></UserPage>} />
        <Route path="/dashboard/investments" element={<UserPage><InvestmentsPage /></UserPage>} />
        <Route path="/dashboard/trading" element={<UserPage><TradingPage /></UserPage>} />
        <Route path="/dashboard/signals" element={<UserPage><SignalsPage /></UserPage>} />
        <Route path="/dashboard/transactions" element={<UserPage><TransactionsPage /></UserPage>} />
        <Route path="/dashboard/notifications" element={<UserPage><NotificationsPage /></UserPage>} />
        <Route path="/dashboard/profile" element={<UserPage><ProfilePage /></UserPage>} />
        <Route path="/dashboard/settings" element={<UserPage><SettingsPage /></UserPage>} />

        {/* ── Admin Panel ── */}
        <Route path="/admin" element={<AdminPage><AdminDashboard /></AdminPage>} />
        <Route path="/admin/users" element={<AdminPage><AdminUsers /></AdminPage>} />
        <Route path="/admin/kyc" element={<AdminPage><AdminKyc /></AdminPage>} />
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
