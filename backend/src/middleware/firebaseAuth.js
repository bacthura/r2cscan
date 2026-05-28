/**
 * Firebase authentication middleware
 * Verifies Firebase ID tokens using the Admin SDK and attaches `req.user`.
 */
import getFirebaseAdmin from '../auth/firebaseAdmin.js';

export async function verifyFirebaseToken(req, res, next) {
  const admin = getFirebaseAdmin();
  if (!admin) return res.status(500).json({ error: 'Firebase not configured on server' });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  const idToken = authHeader.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = { uid: decoded.uid, email: decoded.email, firebase: decoded };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token Firebase inválido' });
  }
}

export default verifyFirebaseToken;
