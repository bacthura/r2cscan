/**
 * Firebase client configuration
 *
 * Production (Vercel / Vite / Next) - prefer using env vars:
 *  - NEXT_PUBLIC_FIREBASE_API_KEY
 *  - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *  - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *  - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 *  - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 *  - NEXT_PUBLIC_FIREBASE_APP_ID
 *  - NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
 *
 * The values below are the web config you provided as sensible defaults
 * but it's recommended to inject them via env vars in production.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCD3r40576QC0tbHO2HIHNHc_BlOA9Qfr0',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'r2cs-8b273.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'r2cs-8b273',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'r2cs-8b273.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '933095320860',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:933095320860:web:3e96078c459985ce22ded9',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-CGWJN5NRVB'
};

export default firebaseConfig;
