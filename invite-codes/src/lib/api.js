/**
 * API Service
 *
 * Centralized HTTP client for communicating with the backend.
 * Handles:
 * - Request/response interceptors
 * - Auth token injection
 * - Error handling
 * - Type-safe endpoints
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Get stored auth token
 */
function getToken() {
  try {
    return localStorage.getItem('r2c_token');
  } catch {
    return null;
  }
}

/**
 * Set auth token in storage
 */
export function setToken(token) {
  try {
    localStorage.setItem('r2c_token', token);
  } catch {
    // Storage not available
  }
}

/**
 * Clear auth token
 */
export function clearToken() {
  try {
    localStorage.removeItem('r2c_token');
    localStorage.removeItem('r2c_user');
  } catch {
    // Storage not available
  }
}

/**
 * Get stored user data
 */
export function getStoredUser() {
  try {
    const data = localStorage.getItem('r2c_user');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Store user data
 */
export function setStoredUser(user) {
  try {
    localStorage.setItem('r2c_user', JSON.stringify(user));
  } catch {
    // Storage not available
  }
}

/**
 * Generic API request function
 */
async function request(endpoint, options = {}) {
  const { method = 'GET', body, headers = {}, params } = options;

  // Build URL with query params
  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  // Build headers
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  // Inject auth token if available
  const token = getToken();
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 401) {
        clearToken();
        window.location.href = '/login';
        throw new ApiError('Sessão expirada', 401);
      }
      throw new ApiError(
        data.error || data.details?.[0]?.message || 'Erro na requisição',
        response.status,
        data.details
      );
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Erro de conexão com o servidor', 0);
  }
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// ── Auth API ──

export const authApi = {
  /**
   * Register a new user with invite code
   */
  register: (data) =>
    request('/auth/register', {
      method: 'POST',
      body: data
    }),

  /**
   * Login with email and password
   */
  login: (data) =>
    request('/auth/login', {
      method: 'POST',
      body: data
    }),

  /**
   * Exchange Firebase ID token for custom JWT
   */
  firebaseAuth: (idToken) =>
    request('/auth/firebase', {
      method: 'POST',
      body: { idToken }
    })
};

// ── Admin API ──

export const adminApi = {
  /**
   * Generate a new invite code
   */
  generateCode: (data = {}) =>
    request('/admin/generate-code', {
      method: 'POST',
      body: data
    }),

  /**
   * List all invite codes with pagination and filters
   */
  listCodes: (params = {}) =>
    request('/admin/codes', { params }),

  /**
   * Get a single invite code by ID
   */
  getCode: (id) =>
    request(`/admin/codes/${id}`),

  /**
   * Invalidate an invite code
   */
  invalidateCode: (id) =>
    request(`/admin/codes/${id}/invalidate`, {
      method: 'PATCH'
    })
};

export default { auth: authApi, admin: adminApi };