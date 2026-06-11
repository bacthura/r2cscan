/**
 * R2C-Scan Backend Server
 * Express API with Supabase integration
 * Ready for Render deployment
 * v2.0
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import env from './config/env.js';
import { securityHeaders, apiRateLimiter, sanitizeInput } from './middleware/security.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

// Routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import maintenanceRoutes from './routes/maintenance.js';
import workOrderRoutes from './routes/workOrders.js';
import stockRoutes from './routes/stock.js';
import supplierRoutes from './routes/suppliers.js';
import dashboardRoutes from './routes/dashboard.js';
import inviteCodeRoutes from './routes/inviteCodes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ── Security ──
app.use(securityHeaders());
app.use(cors({
  origin: env.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ── Rate Limiting ──
app.use(apiRateLimiter());

// ── Body Parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Sanitization ──
app.use(sanitizeInput);

// ── Request Logging (development) ──
if (!env.isProduction) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Invite Code Routes (includes /auth/* and /admin/*)
app.use('/api', inviteCodeRoutes);

// ── Health Check ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ── Serve static files in production ──
if (env.isProduction) {
  const distPath = path.join(__dirname, '../../');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── Error Handling ──
app.use(notFound);
app.use(errorHandler);

// ── Start Server ──
function start() {
  try {
    app.listen(env.port, () => {
      console.log(`
╔═══════════════════════════════════════════╗
║         R2C-Scan API v2.0                 ║
║───────────────────────────────────────────║
║  Status:  ✅ Running                      ║
║  Port:    ${String(env.port).padEnd(31)}║
║  Env:     ${env.nodeEnv.padEnd(31)}║
║  API:     http://localhost:${env.port}/api ║
╚═══════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

start();

export default app;