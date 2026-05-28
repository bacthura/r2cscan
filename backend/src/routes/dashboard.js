/**
 * Dashboard API Routes
 * Provides aggregated statistics and reports.
 * R2C-Scan v2.0
 */
import { Router } from 'express';
import { dashboard as dashService } from '../services/supabaseService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/dashboard/stats - Get main dashboard stats
router.get('/stats', asyncHandler(async (req, res) => {
  const data = await dashService.getStats();
  res.json({ data });
}));

// GET /api/dashboard/health - API health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;