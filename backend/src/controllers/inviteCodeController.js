/**
 * Invite Code Controller
 * R2C-Scan - Invite Code System
 *
 * Handles HTTP request/response for invite code operations.
 * All routes are protected by authentication and admin middleware.
 */
import { generateCodeSchema, registerWithCodeSchema, listCodesQuerySchema } from '../schemas/inviteCode.js';
import * as inviteService from '../services/inviteCodeService.js';
import { getFirebaseAdmin } from '../auth/firebaseAdmin.js';
import { generateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

/**
 * POST /admin/generate-code
 * Generate a new invite code (Admin only)
 */
export async function generateCode(req, res, next) {
  try {
    const { expiresInHours, label } = generateCodeSchema.parse(req.body);

    const code = await inviteService.generateInviteCode(
      req.user.id,
      expiresInHours,
      label
    );

    res.status(201).json({
      success: true,
      message: 'Código de convite gerado com sucesso',
      data: {
        id: code.id,
        code: code.code,
        expires_at: code.expires_at,
        label: code.label,
        created_at: code.created_at
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/register
 * Register a new user using an invite code
 */
export async function registerWithCode(req, res, next) {
  try {
    const { name, email, password, code } = registerWithCodeSchema.parse(req.body);

    // 1. Validate invite code server-side
    //    This checks: exists, not used, not expired
    const inviteCode = await inviteService.validateInviteCode(code);

    // 2. Create user in Firebase Auth
    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      return res.status(503).json({
        success: false,
        error: 'Cadastro indisponível: autenticação não configurada no servidor'
      });
    }

    let firebaseUser;
    try {
      firebaseUser = await firebaseAdmin.auth().createUser({
        email,
        password,
        displayName: name,
        emailVerified: false
      });
    } catch (firebaseErr) {
      // Map Firebase errors to user-friendly messages
      if (firebaseErr.code === 'auth/email-already-exists') {
        return res.status(409).json({
          success: false,
          error: 'Este email já está cadastrado'
        });
      }
      if (firebaseErr.code === 'auth/invalid-email') {
        return res.status(400).json({
          success: false,
          error: 'Email inválido'
        });
      }
      if (firebaseErr.code === 'auth/weak-password') {
        return res.status(400).json({
          success: false,
          error: 'Senha muito fraca'
        });
      }
      throw firebaseErr;
    }

    // 3. Create user profile in Supabase
    const profile = await inviteService.createProfile({
      id: firebaseUser.uid,
      name,
      email,
      role: 'user'
    });

    // 4. Mark invite code as used (atomic operation)
    await inviteService.markCodeAsUsed(inviteCode.id, firebaseUser.uid);

    // 5. Generate JWT for immediate login
    const token = generateToken({
      id: firebaseUser.uid,
      email,
      name,
      role: 'user'
    });

    logger.info('Usuário registrado com código de convite', {
      userId: firebaseUser.uid,
      email,
      codeId: inviteCode.id
    });

    res.status(201).json({
      success: true,
      message: 'Conta criada com sucesso',
      data: {
        token,
        user: {
          id: firebaseUser.uid,
          name,
          email,
          role: 'user'
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/login
 * Authenticate user and return JWT
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email e senha são obrigatórios'
      });
    }

    // Verify credentials via Firebase
    // Note: Firebase Auth REST API is used since Admin SDK
    // doesn't verify passwords directly. We use the Firebase
    // Auth REST API for sign-in verification.
    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      return res.status(503).json({
        success: false,
        error: 'Login indisponível: autenticação não configurada no servidor'
      });
    }

    // Get user by email from Firebase
    let firebaseUser;
    try {
      firebaseUser = await firebaseAdmin.auth().getUserByEmail(email);
    } catch {
      return res.status(401).json({
        success: false,
        error: 'Email ou senha inválidos'
      });
    }

    // For password verification, use Firebase Auth REST API
    // In production, the frontend handles Firebase sign-in and sends us the ID token
    // For now, we verify the password through a custom approach
    const { FIREBASE_API_KEY } = process.env;
    if (!FIREBASE_API_KEY) {
      // Fallback for development: check via custom JWT
      logger.warn('FIREBASE_API_KEY não configurada, usando fallback de desenvolvimento');
      return res.status(400).json({
        success: false,
        error: 'Autenticação Firebase não configurada'
      });
    }

    // Verify password via Firebase Auth REST API
    const signInResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      }
    );

    const signInData = await signInResponse.json();

    if (!signInResponse.ok) {
      if (signInData.error?.message === 'EMAIL_NOT_FOUND' ||
          signInData.error?.message === 'INVALID_PASSWORD' ||
          signInData.error?.message === 'INVALID_LOGIN_CREDENTIALS') {
        return res.status(401).json({
          success: false,
          error: 'Email ou senha inválidos'
        });
      }
      if (signInData.error?.message === 'USER_DISABLED') {
        return res.status(403).json({
          success: false,
          error: 'Conta desativada'
        });
      }
      throw new Error(`Firebase sign-in error: ${signInData.error?.message}`);
    }

    // Get user profile from Supabase
    const profile = await inviteService.getProfileById(firebaseUser.uid);

    // Generate JWT
    const token = generateToken({
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: profile?.name || firebaseUser.displayName || '',
      role: profile?.role || 'user'
    });

    logger.info('Usuário autenticado', { userId: firebaseUser.uid, email });

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        token,
        user: {
          id: firebaseUser.uid,
          name: profile?.name || firebaseUser.displayName || '',
          email: firebaseUser.email,
          role: profile?.role || 'user'
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /admin/codes
 * List all invite codes with pagination and filters (Admin only)
 */
export async function listCodes(req, res, next) {
  try {
    const query = listCodesQuerySchema.parse(req.query);

    const result = await inviteService.listInviteCodes({
      page: query.page,
      limit: query.limit,
      used: query.used,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /admin/codes/:id
 * Get a single invite code details (Admin only)
 */
export async function getCode(req, res, next) {
  try {
    const code = await inviteService.getInviteCodeById(req.params.id);

    res.json({
      success: true,
      data: code
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /admin/codes/:id/invalidate
 * Manually invalidate an invite code (Admin only)
 */
export async function invalidateCode(req, res, next) {
  try {
    const code = await inviteService.invalidateInviteCode(req.params.id);

    res.json({
      success: true,
      message: 'Código de convite invalidado com sucesso',
      data: code
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/firebase
 * Exchange Firebase ID token for custom JWT
 * Used by frontend after Firebase Auth sign-in
 */
export async function firebaseAuth(req, res, next) {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'Token do Firebase é obrigatório'
      });
    }

    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      return res.status(503).json({
        success: false,
        error: 'Autenticação não configurada no servidor'
      });
    }

    // Verify the Firebase ID token
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);

    const { uid, email, name } = decodedToken;

    // Get or create profile
    let profile = await inviteService.getProfileById(uid);
    if (!profile) {
      profile = await inviteService.createProfile({
        id: uid,
        name: name || 'Usuário',
        email: email || '',
        role: 'user'
      });
    }

    // Generate custom JWT
    const token = generateToken({
      id: uid,
      email,
      name: profile.name,
      role: profile.role
    });

    res.json({
      success: true,
      message: 'Autenticado com sucesso',
      data: {
        token,
        user: {
          id: uid,
          name: profile.name,
          email,
          role: profile.role
        }
      }
    });
  } catch (err) {
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado, faça login novamente'
      });
    }
    if (err.code === 'auth/argument-error') {
      return res.status(400).json({
        success: false,
        error: 'Token inválido'
      });
    }
    next(err);
  }
}