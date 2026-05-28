/**
 * Auth Context
 *
 * Manages authentication state globally.
 * Provides:
 * - User state & loading
 * - Login/register/logout functions
 * - Role-based access control
 * - Token management
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, setToken, clearToken, getStoredUser, setStoredUser } from '../lib/api';

const AuthContext = createContext(null);

/**
 * Auth Provider Component
 * Wraps the application and provides auth state
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize from stored session on mount
  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  /**
   * Login with email and password
   */
  const login = useCallback(async (email, password) => {
    const response = await authApi.login({ email, password });
    const { token, user: userData } = response.data;

    setToken(token);
    setStoredUser(userData);
    setUser(userData);

    return userData;
  }, []);

  /**
   * Register a new user with invite code
   */
  const register = useCallback(async (name, email, password, code) => {
    const response = await authApi.register({ name, email, password, code });
    const { token, user: userData } = response.data;

    setToken(token);
    setStoredUser(userData);
    setUser(userData);

    return userData;
  }, []);

  /**
   * Logout - clears all stored auth data
   */
  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  /**
   * Check if current user has admin role
   */
  const isAdmin = user?.role === 'admin';

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = !!user;

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAdmin,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;