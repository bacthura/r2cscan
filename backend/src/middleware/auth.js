/**
 * Authentication Middleware
 * Validates JWT tokens and attaches user info to request.
 * R2C-Scan v2.0
 */
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Verify JWT token from Authorization header
 * Usage: app.use('/api', verifyToken, protectedRoutes)
 */
export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

/**
 * Optional auth - attaches user if token present, but doesn't block
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, env.jwtSecret);
    } catch (_) {
      // Token invalid, continue without user
    }
  }
  next();
}

/**
 * Admin-only middleware
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
}

/**
 * Generate JWT token
 */
export function generateToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

/**
 * Verify admin password (simple auth for local admin panel)
 */
export function verifyAdminPassword(password) {
  return password === env.adminPassword;
}