/**
 * R2C-Scan — Módulo de Acesso / Autenticação
 * Firebase Auth + Firestore (controle de acesso por perfil/RBAC).
 * Porte 1:1 do subsistema que vivia inline no index.html (~2654-3066).
 * Absorve o antigo utils/firebaseAuth.js (incompleto e não usado).
 * O painel admin de aprovação de usuários é adicionado na Parte 2.
 */
import toast from '../utils/toast.js';
import { state } from '../app.js';
import { esc } from '../utils/format.js';

// ─── Config (projeto r2cs-8b273; idêntica à do <head> do index.html) ───
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCD3r40576QC0tbHO2HIHNHc_BlOA9Qfr0',
  authDomain: 'r2cs-8b273.firebaseapp.com',
  projectId: 'r2cs-8b273',
  storageBucket: 'r2cs-8b273.firebasestorage.app',
  messagingSenderId: '933095320860',
  appId: '1:933095320860:web:3e96078c459985ce22ded9'
};

// Emails SEMPRE admin (você nunca fica trancado pra fora).
const BOOTSTRAP_ADMIN_EMAILS = ['jcaesposito@gmail.com'];
// Módulos com permissão granular.
export const ACCESS_MODULES = ['produtos', 'estoque', 'manutencao', 'fornecedores', 'relatorios'];

// ─── Estado do módulo ───
let firebaseAuth = null;
let firebaseUser = null;
let fsdb = null;            // Firestore — banco de controle de acesso
let userProfile = null;     // { uid, email, name, role, status, permissions }
let authResolved = false;

// ─── Ganchos (renderAdmin vive no app.js) ───
const hooks = {};
export function registerAuthHooks(map) { Object.assign(hooks, map); }
function safeCall(name, ...args) {
  if (typeof hooks[name] === 'function') return hooks[name](...args);
  if (typeof window[name] === 'function') return window[name](...args);
}

// ─── RBAC ───
function blankPermissions() {
  const p = {}; ACCESS_MODULES.forEach(m => { p[m] = { view: false, edit: false, delete: false }; }); return p;
}
function fullPermissions() {
  const p = {}; ACCESS_MODULES.forEach(m => { p[m] = { view: true, edit: true, delete: true }; }); return p;
}
function isBootstrapAdmin(email) {
  return !!email && BOOTSTRAP_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase());
}
export function isAdminUser() {
  return (userProfile && userProfile.role === 'admin') || isBootstrapAdmin(firebaseUser && firebaseUser.email);
}
export function can(module, action = 'view') {
  if (isAdminUser()) return true;
  if (!userProfile || userProfile.status !== 'approved') return false;
  const perms = userProfile.permissions || {};
  return !!(perms[module] && perms[module][action]);
}

// Espelha em window o que outros módulos já consomem (ex.: osCan da OS).
function syncWindowAuth() {
  window.userProfile = userProfile;
  window.firebaseUser = firebaseUser;
  window.isAdminUser = isAdminUser;
  window.can = can;
}

// ─── Init (SDK via CDN no <head>; inicializa quando disponível, com retry) ───
export function initAuth() {
  if (typeof window.firebase !== 'undefined' && window.firebase.auth) {
    doInit();
  } else {
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (typeof window.firebase !== 'undefined' && window.firebase.auth) { clearInterval(timer); doInit(); }
      else if (tries >= 10) clearInterval(timer);
    }, 500);
  }
  // Segurança: se a sessão não resolver em 6s, libera o formulário de login.
  setTimeout(() => { if (!authResolved) { firebaseUser = null; syncWindowAuth(); updateAuthGate(); } }, 6000);
}

function doInit() {
  if (!window.firebase.apps.length) window.firebase.initializeApp(FIREBASE_CONFIG);
  firebaseAuth = window.firebase.auth();
  try { if (window.firebase.firestore) fsdb = window.firebase.firestore(); } catch (_) {}
  firebaseAuth.onAuthStateChanged(handleAuthState);
}

async function handleAuthState(user) {
  firebaseUser = user;
  if (!user) {
    userProfile = null; state.isAdmin = false;
    syncWindowAuth(); updateLoginUI(); updateAuthGate(); return;
  }
  try { userProfile = await loadOrCreateProfile(user); }
  catch (err) { console.error('Erro ao carregar perfil de acesso:', err); userProfile = null; }
  state.isAdmin = isAdminUser();
  syncWindowAuth(); updateLoginUI(); updateAuthGate();
}

// Lê users/{uid}. Cria 'pending' se não existir; promove admin-mestre por email.
async function loadOrCreateProfile(user) {
  if (!fsdb) {
    return isBootstrapAdmin(user.email)
      ? { uid: user.uid, email: user.email, name: user.displayName || 'Admin', role: 'admin', status: 'approved', permissions: fullPermissions() }
      : { uid: user.uid, email: user.email, name: user.displayName || '', role: 'employee', status: 'pending', permissions: blankPermissions() };
  }
  const ref = fsdb.collection('users').doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const isAdm = isBootstrapAdmin(user.email);
    const profile = {
      uid: user.uid, email: user.email || '',
      name: user.displayName || (user.email ? user.email.split('@')[0] : 'Usuário'),
      role: isAdm ? 'admin' : 'employee', status: isAdm ? 'approved' : 'pending',
      permissions: isAdm ? fullPermissions() : blankPermissions(),
      createdAt: Date.now(), updatedAt: Date.now()
    };
    await ref.set(profile); return profile;
  }
  const data = snap.data();
  if (isBootstrapAdmin(user.email) && (data.role !== 'admin' || data.status !== 'approved')) {
    await ref.update({ role: 'admin', status: 'approved', permissions: fullPermissions(), updatedAt: Date.now() });
    data.role = 'admin'; data.status = 'approved'; data.permissions = fullPermissions();
  }
  return data;
}

// ─── Gate de acesso (bloqueia o app até logar/aprovar) ───
function updateAuthGate() {
  const gate = document.getElementById('auth-gate');
  if (!gate) return;
  authResolved = true;
  const views = {
    loading: document.getElementById('gate-loading'),
    login: document.getElementById('gate-login'),
    register: document.getElementById('gate-register'),
    status: document.getElementById('gate-status')
  };
  const show = which => {
    gate.style.display = 'flex';
    Object.entries(views).forEach(([k, el]) => { if (el) el.style.display = (k === which ? 'block' : 'none'); });
  };
  if (!firebaseUser) {
    show('login');
    setTimeout(() => document.getElementById('gate-email')?.focus(), 100);
    return;
  }
  if (isAdminUser() || (userProfile && userProfile.status === 'approved')) {
    gate.style.display = 'none';
    applyAccessUI();   // aplica visibilidade por permissão
    return;
  }
  const msgEl = document.getElementById('gate-status-msg');
  if (userProfile && userProfile.status === 'disabled') {
    if (msgEl) msgEl.innerHTML = '🚫 <b>Acesso desativado.</b><br>Fale com o administrador da empresa.';
  } else {
    if (msgEl) msgEl.innerHTML = '⏳ <b>Cadastro recebido!</b><br>Aguardando aprovação do administrador.';
  }
  show('status');
}

export function gateShow(which) {
  ['login', 'register'].forEach(k => {
    const el = document.getElementById('gate-' + k);
    if (el) el.style.display = (k === which ? 'block' : 'none');
  });
  if (which === 'register') setTimeout(() => document.getElementById('reg-name')?.focus(), 100);
}

// ─── Login modal (acesso admin/ações restritas) ───
export function openLoginModal() {
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('modal-login').classList.add('open');
  setTimeout(() => document.getElementById('login-email-input')?.focus(), 300);
}
export function closeLoginModal() { document.getElementById('modal-login').classList.remove('open'); }

function updateLoginUI() {
  const loginForm = document.getElementById('login-btn');
  const loginUserInfo = document.getElementById('login-user-info');
  const userEmail = document.getElementById('login-user-email');
  if (firebaseUser) {
    if (loginForm) loginForm.style.display = 'none';
    if (loginUserInfo) { loginUserInfo.style.display = 'block'; if (userEmail) userEmail.textContent = firebaseUser.email; }
  } else {
    if (loginForm) loginForm.style.display = 'flex';
    if (loginUserInfo) loginUserInfo.style.display = 'none';
  }
}

const LOGIN_ERRORS = {
  'auth/user-not-found': 'Usuário não encontrado', 'auth/wrong-password': 'Senha incorreta',
  'auth/invalid-credential': 'Email ou senha inválidos', 'auth/invalid-email': 'Email inválido',
  'auth/user-disabled': 'Acesso desativado', 'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos'
};

export async function handleGateLogin() {
  const email = document.getElementById('gate-email').value.trim();
  const password = document.getElementById('gate-pw').value;
  const errorEl = document.getElementById('gate-error');
  const btn = document.getElementById('gate-btn');
  const loadingBtn = document.getElementById('gate-loading-btn');
  if (!email || !password) { errorEl.textContent = 'Preencha email e senha'; errorEl.style.display = 'block'; return; }
  btn.style.display = 'none'; loadingBtn.style.display = 'block'; errorEl.style.display = 'none';
  try {
    if (!firebaseAuth) throw new Error('Serviço de login indisponível. Recarregue a página.');
    await firebaseAuth.signInWithEmailAndPassword(email, password); // onAuthStateChanged esconde o gate
  } catch (err) {
    errorEl.textContent = LOGIN_ERRORS[err.code] || err.message || 'Erro ao entrar'; errorEl.style.display = 'block';
  } finally { btn.style.display = 'flex'; loadingBtn.style.display = 'none'; }
}

export async function handleGateRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-pw').value;
  const errorEl = document.getElementById('reg-error');
  const btn = document.getElementById('reg-btn');
  const loadingBtn = document.getElementById('reg-loading');
  if (!name || !email || !password) { errorEl.textContent = 'Preencha nome, email e senha'; errorEl.style.display = 'block'; return; }
  if (password.length < 6) { errorEl.textContent = 'A senha deve ter ao menos 6 caracteres'; errorEl.style.display = 'block'; return; }
  btn.style.display = 'none'; loadingBtn.style.display = 'block'; errorEl.style.display = 'none';
  try {
    if (!firebaseAuth) throw new Error('Serviço indisponível. Recarregue a página.');
    const cred = await firebaseAuth.createUserWithEmailAndPassword(email, password);
    try { await cred.user.updateProfile({ displayName: name }); } catch (_) {}
    // handleAuthState cria o perfil 'pending' e o gate mostra "aguardando aprovação"
  } catch (err) {
    const map = {
      'auth/email-already-in-use': 'Este email já está cadastrado. Faça login.', 'auth/invalid-email': 'Email inválido',
      'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres)', 'auth/operation-not-allowed': 'Cadastro por email/senha não habilitado no Firebase'
    };
    errorEl.textContent = map[err.code] || err.message || 'Erro ao cadastrar'; errorEl.style.display = 'block';
  } finally { btn.style.display = 'flex'; loadingBtn.style.display = 'none'; }
}

export async function handleGatePasswordReset() {
  const email = document.getElementById('gate-email').value.trim();
  const errorEl = document.getElementById('gate-error');
  const setMsg = (msg, ok) => {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    errorEl.style.color = ok ? 'var(--accent)' : 'var(--danger)';
    errorEl.style.borderColor = ok ? 'var(--accent)' : 'var(--danger)';
    errorEl.style.background = ok ? 'rgba(0,245,160,.1)' : 'rgba(255,68,102,.1)';
  };
  if (!email) { setMsg('Digite seu email acima para redefinir a senha', false); return; }
  if (!firebaseAuth) { setMsg('Serviço indisponível. Recarregue a página.', false); return; }
  try {
    await firebaseAuth.sendPasswordResetEmail(email);
    setMsg('✓ Email de redefinição enviado para ' + email + '. Confira a caixa de entrada (e o spam).', true);
  } catch (err) {
    const map = {
      'auth/invalid-email': 'Email inválido',
      'auth/user-not-found': 'Não há conta com esse email',
      'auth/missing-email': 'Digite seu email',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos'
    };
    setMsg(map[err.code] || err.message || 'Erro ao enviar email de redefinição', false);
  }
}

export async function handleLogin() {
  const email = document.getElementById('login-email-input').value.trim();
  const password = document.getElementById('login-pw-input').value;
  const errorEl = document.getElementById('login-error');
  const loadingEl = document.getElementById('login-loading');
  const btn = document.getElementById('login-btn');
  if (!email || !password) { errorEl.textContent = 'Preencha email e senha'; errorEl.style.display = 'block'; return; }
  btn.style.display = 'none'; loadingEl.style.display = 'block'; errorEl.style.display = 'none';
  try {
    if (!firebaseAuth) throw new Error('Firebase não disponível. Tente novamente.');
    await firebaseAuth.signInWithEmailAndPassword(email, password);
    closeLoginModal(); toast('✓ Login realizado!', 'success');
    if (state.currentPage === 'page-admin') safeCall('renderAdmin');
  } catch (err) {
    errorEl.textContent = LOGIN_ERRORS[err.code] || err.message || 'Erro ao fazer login'; errorEl.style.display = 'block';
  } finally { btn.style.display = 'flex'; loadingEl.style.display = 'none'; }
}

export async function handleLogout() {
  if (!firebaseAuth) return;
  await firebaseAuth.signOut();
  firebaseUser = null; state.isAdmin = false;
  syncWindowAuth(); toast('Sessão encerrada', 'info'); updateLoginUI();
}

// Ações que exigem admin agora passam pelo login Firebase (substitui o api.login antigo).
export function checkAdmin() { if (firebaseUser) return true; openLoginModal(); return false; }
export function openAdminModal() { openLoginModal(); }
export function checkAdminPw() { toast('Use o login com email e senha', 'info'); openLoginModal(); }

// ═══════════════ PAINEL ADMIN DE USUÁRIOS (feature nova) ═══════════════
const MODULE_LABELS = { produtos: 'Produtos', estoque: 'Estoque', manutencao: 'Manutenção', fornecedores: 'Fornecedores', relatorios: 'Relatórios' };
const USER_STATUS = { approved: { t: 'Aprovado', c: 'ok' }, pending: { t: 'Pendente', c: 'warn' }, disabled: { t: 'Desativado', c: 'danger' } };
let editingUserId = null;

export async function renderUsers() {
  const list = document.getElementById('users-list');
  if (!list) return;
  if (!isAdminUser()) { list.innerHTML = '<div class="empty-state"><p>Apenas administradores</p></div>'; return; }
  if (!fsdb) { list.innerHTML = '<div class="empty-state"><p>Firestore indisponível</p></div>'; return; }
  let users = [];
  try { const snap = await fsdb.collection('users').get(); snap.forEach(d => users.push(d.data())); }
  catch (err) { list.innerHTML = '<div class="empty-state"><p>Erro ao carregar usuários</p></div>'; return; }
  const order = { pending: 0, approved: 1, disabled: 2 };
  users.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || (a.name || '').localeCompare(b.name || ''));
  if (!users.length) { list.innerHTML = '<div class="empty-state"><p>Nenhum usuário</p></div>'; return; }
  list.innerHTML = users.map(u => {
    const st = USER_STATUS[u.status] || USER_STATUS.pending;
    return `<div class="mini-card" onclick="window.openUserModal('${u.uid}')">
      <div class="mc-icon" style="background:rgba(0,200,255,.12)">${u.role === 'admin' ? '👑' : '👤'}</div>
      <div class="mc-body">
        <div class="mc-title">${esc(u.name || u.email)}</div>
        <div class="mc-sub">${esc(u.email)} · ${u.role === 'admin' ? 'Admin' : 'Funcionário'}</div>
      </div>
      <span class="status-badge ${st.c}">${st.t}</span>
    </div>`;
  }).join('');
}

export async function openUserModal(uid) {
  if (!isAdminUser() || !fsdb) return;
  const snap = await fsdb.collection('users').doc(uid).get();
  if (!snap.exists) { toast('Usuário não encontrado'); return; }
  const u = snap.data(); editingUserId = uid;
  document.getElementById('user-modal-name').textContent = u.name || u.email;
  document.getElementById('user-modal-email').textContent = u.email || '';
  document.getElementById('user-role').value = u.role || 'employee';
  document.getElementById('user-status').value = u.status || 'pending';
  const perms = u.permissions || {};
  document.getElementById('user-perms').innerHTML = ACCESS_MODULES.map(m => {
    const p = perms[m] || {};
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:.78rem">${MODULE_LABELS[m]}</span>
      <span style="display:flex;gap:10px">
        ${['view', 'edit', 'delete'].map(a => `<label style="font-size:.66rem;display:flex;align-items:center;gap:3px;color:var(--text2)">
          <input type="checkbox" data-mod="${m}" data-act="${a}" ${p[a] ? 'checked' : ''}> ${a === 'view' ? 'Ver' : a === 'edit' ? 'Editar' : 'Excluir'}
        </label>`).join('')}
      </span>
    </div>`;
  }).join('');
  document.getElementById('modal-user').classList.add('open');
}
export function closeUserModal() { document.getElementById('modal-user')?.classList.remove('open'); }

export async function saveUser() {
  if (!editingUserId || !fsdb) return;
  const role = document.getElementById('user-role').value;
  const status = document.getElementById('user-status').value;
  const permissions = {};
  ACCESS_MODULES.forEach(m => { permissions[m] = { view: false, edit: false, delete: false }; });
  document.querySelectorAll('#user-perms input[type=checkbox]').forEach(cb => { if (cb.checked) permissions[cb.dataset.mod][cb.dataset.act] = true; });
  try {
    await fsdb.collection('users').doc(editingUserId).update({ role, status, permissions, updatedAt: Date.now() });
    toast('Usuário atualizado', 'success'); closeUserModal(); renderUsers();
    // Se editei a mim mesmo, recarrega meu perfil e reaplica a UI
    if (firebaseUser && firebaseUser.uid === editingUserId) {
      userProfile = await loadOrCreateProfile(firebaseUser); state.isAdmin = isAdminUser(); syncWindowAuth(); applyAccessUI();
    }
  } catch (err) { toast('Erro ao salvar', 'error'); }
}

// Esconde no menu inferior os módulos que o usuário não pode ver.
export function applyAccessUI() {
  const navOf = { produtos: 'nav-catalog', estoque: 'nav-stock', manutencao: 'nav-maint', fornecedores: 'nav-suppliers', relatorios: 'nav-reports' };
  Object.entries(navOf).forEach(([mod, navId]) => {
    const el = document.getElementById(navId);
    if (el) el.style.display = can(mod, 'view') ? '' : 'none';
  });
}
