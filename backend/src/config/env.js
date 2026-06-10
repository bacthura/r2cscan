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

// Load .env file if it exists (development), safe to ignore on Render
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Optional env vars - server will warn but NOT crash in any environment
// This allows the app to start on Render even without all env vars configured
// Missing features will gracefully degrade
const optionalVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'FIREBASE_SERVICE_ACCOUNT',
  'FIREBASE_API_KEY'
];

if (process.env.NODE_ENV === 'production') {
  for (const v of optionalVars) {
    if (!process.env[v]) {
      console.warn(`⚠️  Missing optional env var: ${v} - related features will be unavailable`);
    }
  }
}

// Validação da senha admin.
// Em produção é obrigatória (a app não sobe sem ela).
// Em desenvolvimento, usa-se um fallback inseguro apenas para facilitar testes locais.
if (!process.env.ADMIN_PASSWORD) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ ADMIN_PASSWORD é obrigatório em produção! Defina nas variáveis de ambiente (Render Dashboard).');
    process.exit(1);
  } else {
    console.warn('⚠️  ADMIN_PASSWORD não definida — usando senha padrão INSEGURA "admin1245" (apenas dev). Defina em .env antes de publicar.');
  }
}

// Aviso de segurança: JWT_SECRET fraco/padrão em produção
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET é obrigatório em produção! Tokens não podem usar o segredo padrão.');
  process.exit(1);
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

  // Admin password from environment only — NO hardcoded default
  // Set ADMIN_PASSWORD in production environment variables
  adminPassword: process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? null : 'admin1245')
};

export default env;