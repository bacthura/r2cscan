#!/usr/bin/env node
// Gera env.js baseado em variáveis de ambiente no momento do build
const fs = require('fs');
const path = require('path');

const env = {
  API_URL: process.env.API_URL || process.env.BACKEND_URL || '',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
};

const out = `window.__ENV = ${JSON.stringify(env)};`;
const outPath = path.join(__dirname, '..', 'env.js');

try {
  fs.writeFileSync(outPath, out, { encoding: 'utf8' });
  console.log(`Wrote env.js to ${outPath}`);
} catch (err) {
  console.error('Failed to write env.js', err);
  process.exit(1);
}
