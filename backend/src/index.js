import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import 'dotenv/config'

import healthRouter from './routes/health.js'
import statisticsRouter from './routes/statistics.js'
import depositsRouter from './routes/deposits.js'
import withdrawalsRouter from './routes/withdrawals.js'
import investmentsRouter from './routes/investments.js'
import tradingRouter from './routes/trading.js'
import profileRouter from './routes/profile.js'
import notificationsRouter from './routes/notifications.js'
import tradeActionsRouter from './routes/tradeActions.js'
import binaryRouter from './routes/binary.js'
import { processInvoices } from './services/invoiceMailer.js'
import publicSettingsRouter from './routes/publicSettings.js'
import adminIntegrationsRouter from './routes/adminIntegrations.js'
import adminSettingsRouter from './routes/adminSettings.js'
import aiRouter from './routes/ai.js'
import opportunityImagesRouter from './routes/opportunityImages.js'
import bonusRouter from './routes/bonus.js'
import referralRouter from './routes/referral.js'
import userSettingsRouter from './routes/userSettings.js'
import redeemRouter from './routes/redeem.js'
import nowpaymentsRouter from './routes/nowpayments.js'
import adminPaymentsRouter from './routes/adminPayments.js'
import trackRouter from './routes/track.js'
import adminAnalyticsRouter from './routes/adminAnalytics.js'
import { supabase as sbPrune } from './lib/supabase.js'
import { settleBinary } from './services/binarySettler.js'
import { sendNotificationEmails } from './services/emailNotifier.js'
import adminTradesRouter from './routes/adminTrades.js'
import adminUsersRouter from './routes/adminUsers.js'
import adminStrategiesRouter from './routes/adminStrategies.js'
import adminBinaryRouter from './routes/adminBinary.js'
import adminRouter from './routes/admin.js'
import reservesRouter from './routes/adminReserves.js'
import marketsRouter from './routes/markets.js'
import aiStatusRouter from './routes/aiStatus.js'
import { startLoop } from './services/loop.js'
import { scanDeposits } from './services/depositWatcher.js'
import { runSignalEngine } from './services/signalEngine.js'
import { monitorPositions } from './services/positionMonitor.js'
import { errorHandler } from './middleware/errorHandler.js'
import pushRouter from './routes/push.js'
import signupRouter from './routes/signup.js'
import accountRouter from './routes/account.js'
import adminUserActivityRouter from './routes/adminUserActivity.js'
import { runEngagement } from './services/engagement.js'
import { syncPendingPayments } from './services/nowpaymentsSync.js'

const app = express()
const PORT = process.env.PORT || 3001

// Security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", '*.supabase.co'],
    },
  },
}))

// CORS
app.use(cors({
  origin: (origin, cb) => {
    const allowed = (process.env.FRONTEND_URL || 'http://localhost:5173')
      .split(',').map(u => u.trim().replace(/\/$/, '')).filter(Boolean)
    if (!origin || allowed.includes(origin)) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
  message: { success: false, error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(globalLimiter)

// Body parsing
app.use(express.json({ limit: '10kb' }))

// Trust proxy (for Termux / production)
app.set('trust proxy', 1)

// Routes
app.use('/api/health', healthRouter)
app.use('/api/statistics', statisticsRouter)
app.use('/api/deposits', depositsRouter)
app.use('/api/withdrawals', withdrawalsRouter)
app.use('/api/investments', investmentsRouter)
app.use('/api/trading', tradingRouter)
app.use('/api/profile', profileRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/trade', tradeActionsRouter)
app.use('/api/binary', binaryRouter)
app.use('/api/public/settings', publicSettingsRouter)
app.use('/api/admin/integrations', adminIntegrationsRouter)
app.use('/api/admin/settings', adminSettingsRouter)
app.use('/api/admin/ai', aiRouter)
app.use('/api/admin/opportunity-images', opportunityImagesRouter)
app.use('/api/bonus', bonusRouter)
app.use('/api/referral', referralRouter)
app.use('/api/settings', userSettingsRouter)
app.use('/api/redeem', redeemRouter)
app.use('/api/nowpayments', nowpaymentsRouter)
app.use('/api/admin/nowpayments', adminPaymentsRouter)
app.use('/api/track', trackRouter)
app.use('/api/admin/analytics', adminAnalyticsRouter)
app.use('/api/admin/reserves', reservesRouter)
app.use('/api/markets', marketsRouter)
app.use('/api/ai-status', aiStatusRouter)
app.use('/api/admin/trades', adminTradesRouter)
app.use('/api/admin/users', adminUsersRouter)
app.use('/api/admin/strategies', adminStrategiesRouter)
app.use('/api/admin/binary', adminBinaryRouter)
app.use('/api/push', pushRouter)
app.use('/api/signup', signupRouter)
app.use('/api/account', accountRouter)
app.use('/api/admin/user-activity', adminUserActivityRouter)
app.use('/api/admin', adminRouter)

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: 'Route not found', code: 'NOT_FOUND' },
  })
})

// Error handler
app.use(errorHandler)

app.listen(PORT, () => {
  if (process.env.DEPOSIT_WATCHER !== 'off') startLoop('deposits', scanDeposits, Number(process.env.DEPOSIT_SCAN_SEC || 45) * 1000)
  if (process.env.SIGNAL_ENGINE !== 'off') startLoop('signals', runSignalEngine, Number(process.env.SIGNAL_INTERVAL_MIN || 15) * 60000)
  if (process.env.POSITION_MONITOR !== 'off') startLoop('positions', monitorPositions, 30000)
  startLoop('binary', settleBinary, 2000)
  startLoop('invoices', processInvoices, 20000)
  startLoop('prune-views', async () => { await sbPrune.rpc('prune_page_views') }, 6 * 3600 * 1000)
  startLoop('deliver', sendNotificationEmails, 10000)
  startLoop('engagement', runEngagement, 60000)
  startLoop('np-sync', syncPendingPayments, 60000)
  console.log(`AL THARAA QUANTUM API on port ${PORT} (${process.env.NODE_ENV || 'dev'})`)
})
