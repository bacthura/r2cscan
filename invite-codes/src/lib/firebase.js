/**
 * Firebase Client Configuration
 *
 * This file initializes Firebase on the client side.
 * IMPORTANT: Only contains public-facing config values.
 * Never expose service account keys or admin secrets here.
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase configuration - get from environment variables
// These are public-facing values safe to expose
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Initialize Firebase
let app = null;
let auth = null;

try {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    console.log('✅ Firebase Client initialized');
  } else {
    console.warn('⚠️ Firebase not configured. Set VITE_FIREBASE_* env vars.');
  }
} catch (err) {
  console.error('❌ Firebase init error:', err.message);
}

export { auth };
export default app;