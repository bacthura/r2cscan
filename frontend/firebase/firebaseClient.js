/*
 Firebase client utilities (modular SDK v9+)
 Usage (React/Vite/Next):
  import { auth, signInWithGoogle, signIn, register, logout, getIdToken } from './firebaseClient'

 Notes:
  - In production use env vars (NEXT_PUBLIC_ or VITE_) to provision the config.
  - Send Firebase ID token to backend in `Authorization: Bearer <idToken>` header.
*/

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup as _signInWithPopup,
  signInWithEmailAndPassword as _signInWithEmailAndPassword,
  createUserWithEmailAndPassword as _createUserWithEmailAndPassword,
  signOut as _signOut,
  onAuthStateChanged as _onAuthStateChanged,
  sendPasswordResetEmail as _sendPasswordResetEmail
} from 'firebase/auth';
import firebaseConfig from './firebaseConfig';

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const signInWithGoogle = () => _signInWithPopup(auth, googleProvider);
const signIn = (email, password) => _signInWithEmailAndPassword(auth, email, password);
const register = (email, password) => _createUserWithEmailAndPassword(auth, email, password);
const logout = () => _signOut(auth);
const onAuthState = (cb) => _onAuthStateChanged(auth, cb);
const resetPassword = (email) => _sendPasswordResetEmail(auth, email);

const getIdToken = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken(true);
};

export {
  app,
  auth,
  googleProvider,
  signInWithGoogle,
  signIn,
  register,
  logout,
  onAuthState,
  resetPassword,
  getIdToken
};
