/**
 * Authentication API Routes
 * Handles admin login, token generation, and session validation.
 * R2C-Scan v2.0
 */
import { Router } from 'express';
import { verifyAdminPassword, generateToken, verifyToken } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authRateLimiter } from '../middleware/security.js';

const router = Router();

// POST /api/auth/login - Admin login
router.post('/login', authRateLimiter(), asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) {
    throw new AppError('Senha é obrigatória', 400, 'MISSING_PASSWORD');
  }

  if (!verifyAdminPassword(password)) {
    throw new AppError('Senha incorreta', 401, 'INVALID_PASSWORD');
  }

  const token = generateToken({
    role: 'admin',
    name: 'Administrador',
    iat: Math.floor(Date.now() / 1000)
  });

  res.json({
    token,
    user: { role: 'admin', name: 'Administrador' },
    message: 'Login realizado com sucesso'
  });
}));

// POST /api/auth/verify - Verify token validity
router.post('/verify', verifyToken, asyncHandler(async (req, res) => {
  res.json({
    valid: true,
    user: req.user,
    message: 'Token válido'
  });
}));

// GET /api/auth/status - Check auth status
router.get('/status', verifyToken, asyncHandler(async (req, res) => {
  res.json({
    authenticated: true,
    user: req.user
  });
}));

export default router;