/**
 * Environment Configuration
 * Centralized access to all environment variables with validation.
 * R2C-Scan v2.0
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET'
];

// Validate required vars in production
if (process.env.NODE_ENV === 'production') {
  for (const v of requiredVars) {
    if (!process.env[v]) {
      console.error(`❌ Missing required env var: ${v}`);
      process.exit(1);
    }
  }
}

const env = {
  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'r2c-scan-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Server
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // CORS
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),

  // Rate Limit
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,

  // Upload
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,

  // Firebase (service account JSON as raw JSON or base64)
  firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || '',

  // Firebase Web API Key (for password verification via REST API)
  firebaseApiKey: process.env.FIREBASE_API_KEY || '',

  // Admin default (will be overridden by DB in production)
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123'
};

export default env;