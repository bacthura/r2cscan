/**
 * R2C-Scan — Firebase Authentication Module
 * v2.0 — Email/password login (no registration), session management
 */

// Firebase configuration from project
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCD3r40576QC0tbHO2HIHNHc_BlOA9Qfr0',
  authDomain: 'r2cs-8b273.firebaseapp.com',
  projectId: 'r2cs-8b273',
  storageBucket: 'r2cs-8b273.firebasestorage.app',
  messagingSenderId: '933095320860',
  appId: '1:933095320860:web:3e96078c459985ce22ded9',
  measurementId: 'G-CGWJN5NRVB'
};

let auth = null;
let currentUser = null;
let authListeners = [];

/**
 * Dynamically load Firebase Auth SDK
 * @returns {Promise<boolean>}
 */
async function loadFirebaseSDK() {
  if (window.firebase) return true;
  
  return new Promise((resolve) => {
    // Load Firebase App
    const appScript = document.createElement('script');
    appScript.src = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js';
    appScript.onload = () => {
      // Load Firebase Auth
      const authScript = document.createElement('script');
      authScript.src = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js';
      authScript.onload = () => resolve(true);
      authScript.onerror = () => resolve(false);
      document.head.appendChild(authScript);
    };
    appScript.onerror = () => resolve(false);
    document.head.appendChild(appScript);
  });
}

/**
 * Initialize Firebase Auth
 * @returns {Promise<boolean>}
 */
export async function initAuth() {
  try {
    const loaded = await loadFirebaseSDK();
    if (!loaded) {
      console.warn('⚠️ Firebase SDK failed to load');
      return false;
    }

    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(FIREBASE_CONFIG);
    }

    auth = window.firebase.auth();
    
    // Set language to Portuguese
    auth.languageCode = 'pt-BR';

    // Listen for auth state changes
    auth.onAuthStateChanged(user => {
      currentUser = user;
      const isLoggedIn = !!user;
      // Notify all listeners
      authListeners.forEach(cb => {
        try { cb(user, isLoggedIn); } catch (e) { /* ignore */ }
      });
      
      if (user) {
        console.log('✅ Firebase user authenticated:', user.email);
      } else {
        console.log('ℹ️ Firebase user not authenticated');
      }
    });

    console.log('✅ Firebase Auth initialized');
    return true;
  } catch (err) {
    console.error('❌ Firebase Auth init error:', err);
    return false;
  }
}

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} User credential
 */
export async function loginWithEmail(email, password) {
  if (!auth) throw new Error('Firebase Auth not initialized');
  
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    currentUser = result.user;
    return result.user;
  } catch (err) {
    // Translate Firebase errors to Portuguese
    const errorMap = {
      'auth/user-not-found': 'Usuário não encontrado',
      'auth/wrong-password': 'Senha incorreta',
      'auth/invalid-credential': 'Email ou senha inválidos',
      'auth/invalid-email': 'Email inválido',
      'auth/user-disabled': 'Usuário desabilitado',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde'
    };
    const message = errorMap[err.code] || err.message || 'Erro ao fazer login';
    throw new Error(message);
  }
}

/**
 * Sign out current user
 */
export async function logout() {
  if (!auth) return;
  try {
    await auth.signOut();
    currentUser = null;
  } catch (err) {
    console.error('❌ Logout error:', err);
    throw err;
  }
}

/**
 * Get current user
 * @returns {Object|null}
 */
export function getUser() {
  return currentUser;
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!currentUser;
}

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Receives (user, isLoggedIn)
 * @returns {Function} Unsubscribe function
 */
export function onAuthChange(callback) {
  authListeners.push(callback);
  // Immediately call with current state if available
  if (auth) {
    try { callback(currentUser, !!currentUser); } catch (e) { /* ignore */ }
  }
  return () => {
    authListeners = authListeners.filter(cb => cb !== callback);
  };
}

/**
 * Get Firebase ID token for backend API calls
 * @returns {Promise<string|null>}
 */
export async function getIdToken() {
  if (!auth || !currentUser) return null;
  try {
    return await currentUser.getIdToken(true);
  } catch {
    return null;
  }
}

export default {
  initAuth,
  loginWithEmail,
  logout,
  getUser,
  isAuthenticated,
  onAuthChange,
  getIdToken
};