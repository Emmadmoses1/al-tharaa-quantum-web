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
import adminRouter from './routes/admin.js'
import reservesRouter from './routes/adminReserves.js'
import { startLoop } from './services/loop.js'
import { scanDeposits } from './services/depositWatcher.js'
import { runSignalEngine } from './services/signalEngine.js'
import { monitorPositions } from './services/positionMonitor.js'
import { errorHandler } from './middleware/errorHandler.js'

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
  max: 200,
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
app.use('/api/admin/reserves', reservesRouter)
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
  console.log(`AL THARAA QUANTUM API on port ${PORT} (${process.env.NODE_ENV || 'dev'})`)
})
