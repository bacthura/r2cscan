/**
 * Invite Code Routes
 * R2C-Scan - Invite Code System
 *
 * Defines all routes for invite code management and registration.
 * Routes are organized by access level:
 * - /auth/* : Public routes (registration, login)
 * - /admin/* : Admin-protected routes (code management)
 */
import { Router } from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/security.js';
import * as controller from '../controllers/inviteCodeController.js';

const router = Router();

// ── Auth Routes (Public with rate limiting) ──

/**
 * POST /api/auth/register
 * Register a new user with invite code
 * Body: { name, email, password, code }
 */
router.post('/register', authRateLimiter(), controller.registerWithCode);

/**
 * POST /api/auth/login
 * Authenticate existing user
 * Body: { email, password }
 */
router.post('/login', authRateLimiter(), controller.login);

/**
 * POST /api/auth/firebase
 * Exchange Firebase ID token for custom JWT
 * Body: { idToken }
 */
router.post('/firebase', controller.firebaseAuth);

// ── Admin Routes (Protected) ──

/**
 * POST /api/admin/generate-code
 * Generate a new invite code
 * Body: { expiresInHours?: number, label?: string }
 */
router.post(
  '/generate-code',
  verifyToken,
  requireAdmin,
  controller.generateCode
);

/**
 * GET /api/admin/codes
 * List all invite codes with pagination, search, and filters
 * Query: { page, limit, used, search, sortBy, sortOrder }
 */
router.get(
  '/codes',
  verifyToken,
  requireAdmin,
  controller.listCodes
);

/**
 * GET /api/admin/codes/:id
 * Get a single invite code by ID
 */
router.get(
  '/codes/:id',
  verifyToken,
  requireAdmin,
  controller.getCode
);

/**
 * PATCH /api/admin/codes/:id/invalidate
 * Manually invalidate an invite code
 */
router.patch(
  '/codes/:id/invalidate',
  verifyToken,
  requireAdmin,
  controller.invalidateCode
);

export default router;