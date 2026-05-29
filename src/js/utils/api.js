/**
 * R2C-Scan — API Service Layer
 * v2.0 — Backend communication with fallback
 */

const _DEFAULT_BACKEND = 'https://r2c-scan.onrender.com/api';

function getApiBase() {
  if (window.__ENV && window.__ENV.API_URL) {
    const u = window.__ENV.API_URL;
    return u.endsWith('/api') ? u : u.replace(/\/$/, '') + '/api';
  }
  if (window.location.port === '3001') {
    return window.location.origin + '/api';
  }
  return _DEFAULT_BACKEND;
}

const API_BASE = getApiBase();
let apiToken = localStorage.getItem('r2c_api_token') || null;

const api = {
  isOnline: false,

  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      this.isOnline = data.status === 'ok';
      return this.isOnline;
    } catch {
      this.isOnline = false;
      return false;
    }
  },

  headers(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    if (apiToken) h['Authorization'] = `Bearer ${apiToken}`;
    return h;
  },

  async login(password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify({ password })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    apiToken = data.token;
    localStorage.setItem('r2c_api_token', data.token);
    return data;
  },

  async get(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
    return res.json();
  },

  async post(endpoint, body) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
    return res.json();
  },

  async put(endpoint, body) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT', headers: this.headers(), body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
    return res.json();
  },

  async del(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE', headers: this.headers() });
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
    return res.json();
  },

  getBase() { return API_BASE; },
  getToken() { return apiToken; }
};

// Try connecting to backend on startup
api.checkHealth().then(online => {
  if (online) console.log('✅ Backend API connected:', API_BASE);
  else console.log('ℹ️ Backend offline — using IndexedDB');
});

export default api;
export { API_BASE };