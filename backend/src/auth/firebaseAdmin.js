/**
 * Firebase Admin initializer
 * Accepts `FIREBASE_SERVICE_ACCOUNT` env as raw JSON or base64-encoded JSON.
 */
import admin from 'firebase-admin';
import env from '../config/env.js';

let initialized = false;

export function getFirebaseAdmin() {
  if (initialized) return admin;
  if (!env.firebaseServiceAccount) return null;

  try {
    const raw = env.firebaseServiceAccount.trim();
    let json = raw;
    if (!raw.startsWith('{')) {
      // try base64 decode
      json = Buffer.from(raw, 'base64').toString('utf8');
    }
    const serviceAccount = JSON.parse(json);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    initialized = true;
    console.log('✅ Firebase Admin initialized');
    return admin;
  } catch (err) {
    console.error('Failed to initialize Firebase Admin:', err.message);
    return null;
  }
}

export default getFirebaseAdmin;
