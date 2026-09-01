import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import emailDetectionsRoutes from './routes/emailDetections.js';
import authRoutes from './routes/auth.js';
import invoiceRoutes from './routes/invoices.js';
import invoiceSettingsRoutes from './routes/invoiceSettings.js';
import uploadRoutes from './routes/upload.js';
import tdsRoutes from './routes/tds.js';
import taxPlannerRoutes from './routes/taxPlanner.js';
import dealsRoutes from './routes/deals.js';
import incomeRoutes from './routes/income.js';
import expensesRoutes from './routes/expenses.js';
import paymentsRoutes from './routes/payments.js';
import usageRoutes from './routes/usage.js';
import notificationsRoutes from './routes/notifications.js';
import exportRoutes from './routes/export.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Security headers
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
  })
);

// CORS — whitelist frontend only
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5174', 'http://localhost:5175');
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Dev-User-Id', 'X-Dev-Plan'],
  })
);

// Global rate limit: 150 req/15min per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'RATE_LIMITED', message: 'Too many requests, please try again later', statusCode: 429 },
  })
);

// Stricter rate limit for auth routes: 10/15min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Too many auth attempts', statusCode: 429 },
});

// Razorpay webhook needs raw body BEFORE express.json() parses it
// Must be registered as a specific path middleware BEFORE the global json parser
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Health check (for uptime monitoring pings)
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/invoice-settings', invoiceSettingsRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/tds', tdsRoutes);
app.use('/api/v1/tax', taxPlannerRoutes);
app.use('/api/v1/deals', dealsRoutes);
app.use('/api/v1/income', incomeRoutes);
app.use('/api/v1/expenses', expensesRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/usage', usageRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/email-detections', emailDetectionsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found`, statusCode: 404 });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred', statusCode: 500 });
});

app.listen(PORT, () => {
  console.log(`Kcretio backend running on port ${PORT}`);

  // Start background cron jobs (only in production or when explicitly enabled)
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_JOBS === 'true') {
    import('./jobs/scheduledJobs.js').then(({ startAllJobs }) => startAllJobs()).catch(console.error);
  }
});

export default app;
