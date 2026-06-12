/**
 * R2C-Scan — Main Application Module
 * v2.0 — All business logic consolidated
 */
import { initDB, getAll, getById, save, remove, STORES } from './utils/db.js';
import toast from './utils/toast.js';
import api from './utils/api.js';
import { escapeHTML } from './utils/format.js';
import { startScanner, stopScanner, toggleCamera, requestCameraPermission } from './scanner.js';
import {
  registerProductHooks, openProductByQR, openProductByCode,
  renderCatalog, setFilter, setSort, productCardHTML,
  openDetailById, openDetail, closeDetail, deleteCurrentProduct,
  shareProduct, toggleFav, duplicateProduct, openAddModal,
  editProduct, closeAddModal, saveProduct, previewPhoto, addSpecField
} from './modules/products.js';
import {
  setStockTab, openStockModal, closeStockModal, saveStockItem, renderStock,
  openMovementModal, openMovementModalForItem, closeMovementModal,
  toggleMovementFields, saveMovement
} from './modules/stock.js';
import {
  openSupplierModal, closeSupplierModal, saveSupplier, renderSuppliers
} from './modules/suppliers.js';
import {
  generatePurchaseList, renderPurchases, cyclePurchase, removePurchase, exportPurchases
} from './modules/purchases.js';

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
export const state = {
  currentPage: 'page-home',
  scanMode: 'qr',
  currentFilter: 'todos',
  currentSort: 'date',
  isAdmin: false,
  editingId: null,
  currentDetailId: null,
  photoDataURL: null,
  isLight: false,
  maintCalendarDate: new Date(),
  maintTab: 'all',
  stockTab: 'items',
  reportsTab: 'products',
  chartsInitialized: false,
  myCharts: {},
  movItemId: null,
  recognition: null
};

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════
function goPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navMap = {
    'page-home': 'nav-home', 'page-scanner': 'nav-scanner', 'page-catalog': 'nav-catalog',
    'page-maint': 'nav-maint', 'page-maint-calendar': 'nav-maint', 'page-stock': 'nav-stock',
    'page-purchases': 'nav-stock',
    'page-suppliers': 'nav-suppliers', 'page-reports': 'nav-reports', 'page-about': 'nav-about',
    'page-admin': 'nav-home'
  };
  const navItem = document.getElementById(navMap[pageId]);
  if (navItem) navItem.classList.add('active');

  state.currentPage = pageId;

  // Handle scanner lifecycle
  if (pageId === 'page-scanner') {
    setupScannerPage();
  } else {
    stopScanner();
  }

  // Render on page change
  const renderers = {
    'page-catalog': renderCatalog,
    'page-home': renderHome,
    'page-admin': renderAdmin,
    'page-maint': renderMaint,
    'page-maint-calendar': renderMaintCalendar,
    'page-stock': renderStock,
    'page-purchases': renderPurchases,
    'page-suppliers': renderSuppliers,
    'page-reports': renderReports,
    'page-about': renderAbout
  };
  if (renderers[pageId]) renderers[pageId]();
}

// Make goPage globally accessible for onclick handlers
window.goPage = goPage;

// ═══════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════
window.toggleTheme = function() {
  state.isLight = !state.isLight;
  document.body.classList.toggle('light-theme', state.isLight);
  localStorage.setItem('r2c-theme', state.isLight ? 'light' : 'dark');
};

// ═══════════════════════════════════════════
// SCANNER PAGE
// ═══════════════════════════════════════════
async function setupScannerPage() {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    toast('Permissão de câmera necessária', 'warning');
    return;
  }

  const result = await startScanner('scanner-reader', handleScanResult);
  if (result) {
    document.getElementById('scanner-loading')?.classList.add('hidden');
  }
}

function handleScanResult(data) {
  document.getElementById('scan-result-val').textContent = data;
  document.getElementById('scan-result-box').classList.add('show');
  toast('Leitura realizada!', 'success');
  recordScan(data);
  openProductByQR(data);
}

async function recordScan(data) {
  const scan = { id: `scan_${Date.now()}`, data, timestamp: Date.now() };
  await save(STORES.SCAN_HISTORY, scan);
}

// ═══════════════════════════════════════════
// SCAN MODE
// ═══════════════════════════════════════════
window.setScanMode = function(mode) {
  state.scanMode = mode;
  document.getElementById('mode-qr-btn')?.classList.toggle('active-mode', mode === 'qr');
  document.getElementById('mode-ai-btn')?.classList.toggle('active-mode', mode === 'ai');
  document.getElementById('capture-btn').style.display = mode === 'ai' ? 'flex' : 'none';
  document.getElementById('scan-result-box')?.classList.remove('show');
  document.getElementById('ai-status')?.classList.remove('show');

  if (mode === 'qr') {
    stopScanner();
    setupScannerPage();
  }
};

window.toggleFlash = async function() {
  toast('Flash disponível apenas em dispositivos compatíveis', 'info');
};

window.restartScanner = function() {
  stopScanner();
  setupScannerPage();
  toast('Scanner reiniciado', 'info');
};

// ═══════════════════════════════════════════
// PRODUTOS — módulo migrado (modules/products.js)
// Bindings para os handlers inline (onclick=) do HTML
// ═══════════════════════════════════════════
window.openProductByCode = openProductByCode;
window.setFilter = setFilter;
window.setSort = setSort;
window.openDetailById = openDetailById;
window.closeDetail = closeDetail;
window.deleteCurrentProduct = deleteCurrentProduct;
window.shareProduct = shareProduct;
window.toggleFav = toggleFav;
window.duplicateProduct = duplicateProduct;
window.openAddModal = openAddModal;
window.editProduct = editProduct;
window.closeAddModal = closeAddModal;
window.saveProduct = saveProduct;
window.previewPhoto = previewPhoto;
window.addSpecField = addSpecField;

// Ganchos: funções que vivem no app.js até seus módulos serem migrados
registerProductHooks({ renderHome, renderAdmin, resumeScanner: setupScannerPage });

// ═══════════════════════════════════════════
// VOICE SEARCH
// ═══════════════════════════════════════════
window.startVoiceSearch = function() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    toast('Reconhecimento de voz não disponível', 'warning');
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!state.recognition) {
    state.recognition = new SpeechRecognition();
    state.recognition.lang = 'pt-BR';
    state.recognition.interimResults = false;
    state.recognition.onresult = e => {
      const text = e.results[0][0].transcript;
      const input = document.getElementById('search-input');
      if (input) input.value = text;
      renderCatalog();
      document.getElementById('voice-btn')?.classList.remove('listening');
      toast('Busca: "' + text + '"', 'info');
    };
    state.recognition.onerror = () => { document.getElementById('voice-btn')?.classList.remove('listening'); };
    state.recognition.onend = () => { document.getElementById('voice-btn')?.classList.remove('listening'); };
  }
  document.getElementById('voice-btn')?.classList.add('listening');
  try { state.recognition.start(); } catch (e) { document.getElementById('voice-btn')?.classList.remove('listening'); }
};

// ═══════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════
async function renderHome() {
  const all = await getAll(STORES.PRODUCTS);
  const allMaint = await getAll(STORES.MAINTENANCE);

  setStat('stat-total', all.length);
  const cats = new Set(all.map(p => p.category).filter(Boolean));
  setStat('stat-cats', cats.size);
  const week = new Date(); week.setDate(week.getDate() - 7);
  setStat('stat-recent', all.filter(p => new Date(p.createdAt) > week).length);
  setStat('stat-maint', allMaint.filter(m => m.status !== 'done').length);

  const recent = [...all].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  const homeRecent = document.getElementById('home-recent');
  if (homeRecent) {
    homeRecent.innerHTML = recent.length
      ? recent.map(p => productCardHTML(p)).join('')
      : getEmptyState('nenhum produto ainda');
  }

  const pending = allMaint.filter(m => m.status !== 'done').sort((a, b) => a.date - b.date).slice(0, 3);
  const homeMaint = document.getElementById('home-maint');
  if (homeMaint) {
    homeMaint.innerHTML = pending.length
      ? pending.map(m => maintMiniCardHTML(m)).join('')
      : getEmptyState('nenhuma manutenção pendente');
  }
}

function setStat(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ═══════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════
async function renderAdmin() {
  const list = document.getElementById('admin-list');
  if (!list) return;
  if (!state.isAdmin) {
    list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg><p>Faça login como administrador</p></div>`;
    return;
  }
  const all = await getAll(STORES.PRODUCTS);
  list.innerHTML = all.length
    ? all.map(p => `<div class="product-card" style="display:flex;gap:10px;align-items:center;padding:10px" onclick="window.openDetailById('${p.id}')">
        <div style="width:44px;height:44px;border-radius:8px;overflow:hidden;flex-shrink:0;background:var(--bg3);display:flex;align-items:center;justify-content:center">
          ${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover">` : `<svg viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.5" style="width:18px;height:18px"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--font-head);font-size:.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(p.name)}</div>
          <div style="font-size:.68rem;color:var(--text2)">${p.sku || '—'} · ${p.category || 'Geral'}</div>
        </div>
        <button onclick="event.stopPropagation();window.editProduct('${p.id}')" style="background:none;border:1px solid var(--border);border-radius:7px;padding:5px;cursor:pointer">
          <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" style="width:14px;height:14px"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </div>`).join('')
    : `<div class="empty-state"><p>Nenhum produto cadastrado</p></div>`;
}

// Helper de formulário compartilhado (Manutenção/Estoque usam)
function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

// ═══════════════════════════════════════════
// MANUTENÇÃO
// ═══════════════════════════════════════════
window.openMaintModal = function(data) {
  const editId = document.getElementById('maint-edit-id');
  if (editId) editId.value = data?.id || '';
  const title = document.getElementById('modal-maint-title');
  if (title) title.textContent = data ? '✏️ Editar Manutenção' : '🔧 Nova Manutenção';
  setVal('m-name', data?.name);
  setVal('m-type', data?.type || 'Preventiva');
  setVal('m-priority', data?.priority || 'media');
  setVal('m-date', data?.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  setVal('m-time', data?.time || '08:00');
  setVal('m-desc', data?.desc);
  setVal('m-tech', data?.tech);
  setVal('m-recurrence', data?.recurrence || 'none');
  const checklist = document.getElementById('maint-checklist');
  if (checklist) {
    checklist.innerHTML = '';
    if (data?.checklist) {
      data.checklist.forEach((item) => addCheckItem(item.text, item.done));
    } else {
      addCheckItem();
    }
  }
  document.getElementById('modal-maint')?.classList.add('open');
};

window.closeMaintModal = function() {
  document.getElementById('modal-maint')?.classList.remove('open');
};

window.addCheckItem = function(text = '', done = false) {
  const div = document.createElement('div');
  div.className = 'maint-check-item';
  div.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center';
  div.innerHTML = `<input type="checkbox" ${done ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent);flex-shrink:0">
    <input type="text" value="${escapeHTML(text)}" placeholder="Item do checklist" class="m-check-input" style="flex:1;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-family:var(--font-mono);font-size:.72rem;outline:none">
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--danger);font-size:1.1rem;cursor:pointer;flex-shrink:0">×</button>`;
  document.getElementById('maint-checklist')?.appendChild(div);
};

window.saveMaint = async function() {
  const name = (document.getElementById('m-name')?.value || '').trim();
  if (!name) { toast('Nome do equipamento obrigatório', 'error'); return; }
  const editId = document.getElementById('maint-edit-id')?.value || '';
  const id = editId || `maint_${Date.now()}`;
  const checklistItems = [];
  document.querySelectorAll('#maint-checklist .maint-check-item').forEach(div => {
    const text = div.querySelector('.m-check-input')?.value.trim();
    const done = div.querySelector('input[type="checkbox"]')?.checked || false;
    if (text) checklistItems.push({ text, done });
  });
  const dateStr = document.getElementById('m-date')?.value || '';
  const timeStr = document.getElementById('m-time')?.value || '08:00';
  const date = new Date(`${dateStr}T${timeStr}`).getTime();
  const old = editId ? await getById(STORES.MAINTENANCE, id) : null;
  const raw = {
    id, name,
    type: document.getElementById('m-type')?.value || 'Preventiva',
    priority: document.getElementById('m-priority')?.value || 'media',
    date, time: timeStr,
    desc: (document.getElementById('m-desc')?.value || '').trim(),
    tech: (document.getElementById('m-tech')?.value || '').trim(),
    recurrence: document.getElementById('m-recurrence')?.value || 'none',
    checklist: checklistItems,
    status: old?.status || 'pending',
    createdAt: old?.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  await save(STORES.MAINTENANCE, raw);
  window.closeMaintModal();
  toast('Manutenção salva!', 'success');
  renderMaint();
  if (state.currentPage === 'page-home') renderHome();

  if (!editId && raw.recurrence !== 'none') {
    scheduleRecurrence(raw);
  }
};

async function scheduleRecurrence(raw) {
  const intervals = { daily: 1, weekly: 7, monthly: 30, quarterly: 90, yearly: 365 };
  const days = intervals[raw.recurrence];
  if (!days) return;
  for (let i = 1; i <= 4; i++) {
    const newDate = new Date(raw.date);
    newDate.setDate(newDate.getDate() + days * i);
    const newId = `maint_${Date.now()}_${i}`;
    const recurring = { ...raw, id: newId, date: newDate.getTime(), createdAt: Date.now(), updatedAt: Date.now(), status: 'pending', recurrence: 'none' };
    await save(STORES.MAINTENANCE, recurring);
  }
}

window.updateMaintStatus = async function(id, status) {
  const item = await getById(STORES.MAINTENANCE, id);
  if (!item) return;
  item.status = status;
  item.updatedAt = Date.now();
  await save(STORES.MAINTENANCE, item);
  toast(`Status alterado para: ${status}`, 'success');
  renderMaint();
  if (state.currentPage === 'page-home') renderHome();
  if (state.currentPage === 'page-maint-calendar') renderMaintCalendar();
};

window.setMaintTab = function(el, tab) {
  document.querySelectorAll('#maint-tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  state.maintTab = tab;
  renderMaint();
};

async function renderMaint() {
  let all = await getAll(STORES.MAINTENANCE);
  all.sort((a, b) => b.date - a.date);
  if (state.maintTab !== 'all') all = all.filter(m => m.status === state.maintTab);

  const list = document.getElementById('maint-list');
  if (!list) return;
  if (all.length === 0) {
    list.innerHTML = getEmptyState('nenhuma manutenção encontrada');
    return;
  }
  list.innerHTML = all.map(m => {
    const jsonStr = JSON.stringify(m).replace(/'/g, '&#39;');
    const statusClass = { pending: 'warn', inprogress: 'info', done: 'ok' };
    const statusText = { pending: 'Pendente', inprogress: 'Em Andamento', done: 'Concluída' };
    const prioIcon = m.priority === 'critica' ? '🔴' : m.priority === 'alta' ? '🟠' : m.priority === 'media' ? '🟡' : '🟢';
    const doneCount = m.checklist ? m.checklist.filter(c => c.done).length : 0;
    const totalCount = m.checklist ? m.checklist.length : 0;
    return `<div class="mini-card">
      <div class="mc-icon" style="background:rgba(0,200,255,.1)">${prioIcon}</div>
      <div class="mc-body" onclick="window.openMaintModal(JSON.parse('${jsonStr}'))">
        <div class="mc-title">${escapeHTML(m.name)}</div>
        <div class="mc-sub">${m.type} — ${new Date(m.date).toLocaleString('pt-BR')}${m.tech ? ' · ' + escapeHTML(m.tech) : ''}</div>
        ${totalCount > 0 ? `<div class="mc-sub">Checklist: ${doneCount}/${totalCount}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
        <span class="status-badge ${statusClass[m.status] || 'warn'}">${statusText[m.status] || 'Pendente'}</span>
        <div style="display:flex;gap:4px">
          <button onclick="event.stopPropagation();window.updateMaintStatus('${m.id}','inprogress')" style="background:none;border:1px solid var(--border);border-radius:5px;padding:3px 6px;font-size:.6rem;cursor:pointer;color:var(--accent2)">▶</button>
          <button onclick="event.stopPropagation();window.updateMaintStatus('${m.id}','done')" style="background:none;border:1px solid var(--border);border-radius:5px;padding:3px 6px;font-size:.6rem;cursor:pointer;color:var(--accent)">✓</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function maintMiniCardHTML(m) {
  const statusText = { pending: 'Pendente', inprogress: 'Em Andamento', done: 'Concluída' };
  const statusClass = { pending: 'warn', inprogress: 'info', done: 'ok' };
  return `<div class="mini-card" onclick="goPage('page-maint')">
    <div class="mc-icon" style="background:${m.priority === 'critica' || m.priority === 'alta' ? 'rgba(255,68,102,.1)' : 'rgba(0,200,255,.1)'}">
      ${m.priority === 'critica' || m.priority === 'alta' ? '⚠️' : '🔧'}
    </div>
    <div class="mc-body">
      <div class="mc-title">${escapeHTML(m.name)}</div>
      <div class="mc-sub">${m.type} — ${new Date(m.date).toLocaleDateString('pt-BR')}</div>
    </div>
    <span class="status-badge ${statusClass[m.status] || 'warn'}">${statusText[m.status] || 'Pendente'}</span>
  </div>`;
}

// ═══════════════════════════════════════════
// CALENDÁRIO
// ═══════════════════════════════════════════
window.prevMaintMonth = function() {
  state.maintCalendarDate.setMonth(state.maintCalendarDate.getMonth() - 1);
  renderMaintCalendar();
};

window.nextMaintMonth = function() {
  state.maintCalendarDate.setMonth(state.maintCalendarDate.getMonth() + 1);
  renderMaintCalendar();
};

async function renderMaintCalendar() {
  const year = state.maintCalendarDate.getFullYear();
  const month = state.maintCalendarDate.getMonth();
  const label = document.getElementById('maint-month-label');
  if (label) label.textContent = new Date(year, month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const all = await getAll(STORES.MAINTENANCE);
  const monthMaints = all.filter(m => { const d = new Date(m.date); return d.getMonth() === month && d.getFullYear() === year; });

  let grid = '';
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  dayNames.forEach(d => { grid += `<div style="text-align:center;font-size:.6rem;color:var(--text2);padding:4px">${d}</div>`; });
  for (let i = 0; i < firstDay; i++) grid += '<div></div>';
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayMaints = monthMaints.filter(m => new Date(m.date).toISOString().split('T')[0] === dateStr);
    const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
    const hasMaint = dayMaints.length > 0;
    grid += `<div onclick="window.showMaintDay('${dateStr}')" style="background:${hasMaint ? 'rgba(0,200,255,.1)' : 'transparent'};border:${isToday ? '2px solid var(--accent)' : '1px solid var(--border)'};border-radius:6px;padding:4px;text-align:center;cursor:pointer;font-size:.72rem;min-height:36px;display:flex;flex-direction:column;align-items:center;justify-content:center">
      <span>${day}</span>
      ${hasMaint ? `<span style="font-size:.5rem;color:var(--accent2)">${dayMaints.length}</span>` : ''}
    </div>`;
  }
  const gridEl = document.getElementById('maint-calendar-grid');
  if (gridEl) gridEl.innerHTML = grid;
}

window.showMaintDay = async function(dateStr) {
  const all = await getAll(STORES.MAINTENANCE);
  const dayMaints = all.filter(m => new Date(m.date).toISOString().split('T')[0] === dateStr);
  const list = document.getElementById('maint-day-list');
  if (!list) return;
  if (dayMaints.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>Nenhuma manutenção agendada para ${new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR')}</p></div>`;
    return;
  }
  list.innerHTML = dayMaints.map(m => `<div class="mini-card" onclick="window.openMaintModal(JSON.parse('${JSON.stringify(m).replace(/'/g, '&#39;')}'))">
    <div class="mc-icon" style="background:rgba(0,200,255,.1)">🔧</div>
    <div class="mc-body">
      <div class="mc-title">${escapeHTML(m.name)}</div>
      <div class="mc-sub">${m.type} · ${m.tech || 'Sem técnico'}</div>
    </div>
    <span class="status-badge ${m.status === 'done' ? 'ok' : m.status === 'inprogress' ? 'info' : 'warn'}">${m.status === 'done' ? 'Concluída' : m.status === 'inprogress' ? 'Em Andamento' : 'Pendente'}</span>
  </div>`).join('');
};

// ═══════════════════════════════════════════
// ESTOQUE — módulo migrado (modules/stock.js)
// Bindings para os handlers inline (onclick=) do HTML
// ═══════════════════════════════════════════
window.setStockTab = setStockTab;
window.openStockModal = openStockModal;
window.closeStockModal = closeStockModal;
window.saveStockItem = saveStockItem;
window.openMovementModal = openMovementModal;
window.openMovementModalForItem = openMovementModalForItem;
window.closeMovementModal = closeMovementModal;
window.toggleMovementFields = toggleMovementFields;
window.saveMovement = saveMovement;

// ═══════════════════════════════════════════
// FORNECEDORES — módulo migrado (modules/suppliers.js)
// Bindings para os handlers inline (onclick=) do HTML
// ═══════════════════════════════════════════
window.openSupplierModal = openSupplierModal;
window.closeSupplierModal = closeSupplierModal;
window.saveSupplier = saveSupplier;

// ═══════════════════════════════════════════
// COMPRAS — módulo migrado (modules/purchases.js)
// Bindings para os handlers inline (onclick=) do HTML
// ═══════════════════════════════════════════
window.generatePurchaseList = generatePurchaseList;
window.cyclePurchase = cyclePurchase;
window.removePurchase = removePurchase;
window.exportPurchases = exportPurchases;

// ═══════════════════════════════════════════
// RELATÓRIOS
// ═══════════════════════════════════════════
window.setReportsTab = function(el, tab) {
  document.querySelectorAll('#reports-tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  state.reportsTab = tab;
  const rp = document.getElementById('reports-products');
  const rm = document.getElementById('reports-maint');
  const rs = document.getElementById('reports-stock');
  if (rp) rp.style.display = tab === 'products' ? 'block' : 'none';
  if (rm) rm.style.display = tab === 'maint' ? 'block' : 'none';
  if (rs) rs.style.display = tab === 'stock' ? 'block' : 'none';
  if (tab === 'products') renderProdReports();
  if (tab === 'maint') renderMaintReports();
  if (tab === 'stock') renderStockReports();
};

async function renderReports() {
  if (!state.chartsInitialized) { state.chartsInitialized = true; renderProdReports(); }
  renderMaintReports();
  renderStockReports();
}

async function renderProdReports() {
  if (typeof Chart === 'undefined') return;
  const all = await getAll(STORES.PRODUCTS);
  const cats = {};
  all.forEach(p => { const c = p.category || 'Geral'; cats[c] = (cats[c] || 0) + 1; });

  // Categories chart
  const catCtx = document.getElementById('chart-categories')?.getContext('2d');
  if (catCtx) {
    if (state.myCharts.catChart) state.myCharts.catChart.destroy();
    state.myCharts.catChart = new Chart(catCtx, {
      type: 'doughnut',
      data: { labels: Object.keys(cats), datasets: [{ data: Object.values(cats), backgroundColor: ['#00F5A0', '#00C8FF', '#FF6B35', '#A855F7', '#F59E0B', '#FF4466', '#34D399', '#60A5FA'] }] },
      options: { plugins: { legend: { display: false } }, responsive: true }
    });
  }

  // Registrations over time
  const weeks = {};
  all.forEach(p => {
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-W${Math.ceil((d.getDate() + (new Date(d.getFullYear(), d.getMonth(), 1).getDay())) / 7)}-${d.getMonth() + 1}`;
    weeks[key] = (weeks[key] || 0) + 1;
  });
  const regCtx = document.getElementById('chart-registrations')?.getContext('2d');
  if (regCtx) {
    if (state.myCharts.regChart) state.myCharts.regChart.destroy();
    state.myCharts.regChart = new Chart(regCtx, {
      type: 'bar',
      data: { labels: Object.keys(weeks).slice(-10), datasets: [{ label: 'Produtos', data: Object.values(weeks).slice(-10), backgroundColor: 'rgba(0,245,160,.6)', borderColor: '#00F5A0', borderWidth: 1 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,.05)' } }, x: { grid: { display: false } } }, responsive: true }
    });
  }

  const catList = document.getElementById('report-cat-list');
  if (catList) {
    catList.innerHTML = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([c, count]) =>
      `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:.78rem">
        <span>${c}</span><span style="font-weight:700">${count}</span>
      </div>`
    ).join('');
  }
}

async function renderMaintReports() {
  if (typeof Chart === 'undefined') return;
  const all = await getAll(STORES.MAINTENANCE);
  const statusCounts = { pending: 0, inprogress: 0, done: 0 };
  all.forEach(m => { statusCounts[m.status] = (statusCounts[m.status] || 0) + 1; });

  const ctx = document.getElementById('chart-maint-status')?.getContext('2d');
  if (ctx) {
    if (state.myCharts.maintChart) state.myCharts.maintChart.destroy();
    state.myCharts.maintChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels: ['Pendentes', 'Em Andamento', 'Concluídas'], datasets: [{ data: [statusCounts.pending, statusCounts.inprogress, statusCounts.done], backgroundColor: ['#F59E0B', '#00C8FF', '#00F5A0'] }] },
      options: { plugins: { legend: { display: false } }, responsive: true }
    });
  }

  const equip = {};
  all.forEach(m => { equip[m.name] = (equip[m.name] || 0) + 1; });
  const list = document.getElementById('report-maint-list');
  if (list) {
    list.innerHTML = Object.entries(equip).sort((a, b) => b[1] - a[1]).map(([n, count]) =>
      `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:.78rem">
        <span>${n}</span><span style="font-weight:700">${count}</span>
      </div>`
    ).join('') || '<p style="color:var(--text2);font-size:.78rem">Nenhum dado</p>';
  }
}

async function renderStockReports() {
  if (typeof Chart === 'undefined') return;
  const all = await getAll(STORES.STOCK);
  const lowStock = all.filter(i => i.qty <= i.min);

  const ctx = document.getElementById('chart-stock')?.getContext('2d');
  if (ctx && all.length > 0) {
    if (state.myCharts.stockChart) state.myCharts.stockChart.destroy();
    state.myCharts.stockChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: all.slice(0, 10).map(i => i.name),
        datasets: [
          { label: 'Atual', data: all.slice(0, 10).map(i => i.qty), backgroundColor: 'rgba(0,245,160,.6)' },
          { label: 'Mínimo', data: all.slice(0, 10).map(i => i.min), backgroundColor: 'rgba(255,68,102,.4)' }
        ]
      },
      options: { plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,.05)' } }, x: { grid: { display: false } } }, responsive: true }
    });
  }

  const alertList = document.getElementById('report-alert-list');
  if (alertList) {
    if (lowStock.length === 0) {
      alertList.innerHTML = '<p style="color:var(--text2);font-size:.78rem">✅ Nenhum item com estoque crítico</p>';
    } else {
      alertList.innerHTML = lowStock.map(i => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:.78rem">
        <span>${escapeHTML(i.name)}</span><span style="color:var(--danger);font-weight:700">${i.qty} / ${i.min}</span>
      </div>`).join('');
    }
  }
}

// ═══════════════════════════════════════════
// ABOUT
// ═══════════════════════════════════════════
async function renderAbout() {
  const prods = await getAll(STORES.PRODUCTS);
  const maints = await getAll(STORES.MAINTENANCE);
  const stocks = await getAll(STORES.STOCK);
  const supps = await getAll(STORES.SUPPLIERS);
  const scans = await getAll(STORES.SCAN_HISTORY);
  setStat('about-prod', prods.length);
  setStat('about-maint', maints.length);
  setStat('about-stock', stocks.length);
  setStat('about-supp', supps.length);
  setStat('about-scans', scans.length);
}

// ═══════════════════════════════════════════
// EXPORT / IMPORT
// ═══════════════════════════════════════════
window.exportData = async function(format) {
  const data = {
    products: await getAll(STORES.PRODUCTS),
    maintenance: await getAll(STORES.MAINTENANCE),
    stock: await getAll(STORES.STOCK),
    suppliers: await getAll(STORES.SUPPLIERS),
    scanHistory: await getAll(STORES.SCAN_HISTORY)
  };

  if (format === 'json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `r2c-scan-export-${Date.now()}.json`);
  } else if (format === 'csv') {
    let csv = 'Tipo,Nome,SKU/Código,Categoria,Data\n';
    data.products.forEach(p => { csv += `Produto,${p.name},${p.sku || ''},${p.category || ''},${new Date(p.createdAt).toISOString()}\n`; });
    data.maintenance.forEach(m => { csv += `Manutenção,${m.name},${m.type},${m.priority},${new Date(m.date).toISOString()}\n`; });
    data.stock.forEach(s => { csv += `Estoque,${s.name},${s.qty} ${s.unit},${s.location || ''},${new Date(s.createdAt).toISOString()}\n`; });
    data.suppliers.forEach(s => { csv += `Fornecedor,${s.name},${s.cnpj || ''},${s.category || ''},${new Date(s.createdAt).toISOString()}\n`; });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `r2c-scan-export-${Date.now()}.csv`);
  }
  toast(`Dados exportados como ${format.toUpperCase()}`, 'success');
};

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

window.importData = function(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const data = JSON.parse(e.target.result);
      let count = 0;
      if (data.products) { for (const p of data.products) { await save(STORES.PRODUCTS, p); count++; } }
      if (data.maintenance) { for (const m of data.maintenance) { await save(STORES.MAINTENANCE, m); count++; } }
      if (data.stock) { for (const s of data.stock) { await save(STORES.STOCK, s); count++; } }
      if (data.suppliers) { for (const s of data.suppliers) { await save(STORES.SUPPLIERS, s); count++; } }
      toast(`${count} registros importados!`, 'success');
      renderHome();
      if (state.currentPage === 'page-catalog') renderCatalog();
    } catch (err) {
      toast('Erro ao importar: formato inválido', 'error');
    }
    input.value = '';
  };
  reader.readAsText(input.files[0]);
};

// ═══════════════════════════════════════════
// ADMIN AUTH
// ═══════════════════════════════════════════
window.checkAdmin = function() {
  if (state.isAdmin) return true;
  window.openAdminModal();
  return false;
};

window.openAdminModal = function() {
  document.getElementById('modal-admin-login')?.classList.add('open');
  setTimeout(() => document.getElementById('admin-pw-input')?.focus(), 300);
};

window.closeAdminModal = function() {
  document.getElementById('modal-admin-login')?.classList.remove('open');
  const pw = document.getElementById('admin-pw-input');
  if (pw) pw.value = '';
};

window.checkAdminPw = async function() {
  const pw = document.getElementById('admin-pw-input')?.value;
  if (!pw) { toast('Digite a senha', 'warning'); return; }

  try {
    await api.login(pw);
    state.isAdmin = true;
    window.closeAdminModal();
    toast('✓ Acesso admin liberado', 'success');
    if (state.currentPage === 'page-admin') renderAdmin();
  } catch (err) {
    const pwInput = document.getElementById('admin-pw-input');
    if (pwInput) pwInput.style.borderColor = 'var(--danger)';
    setTimeout(() => { if (pwInput) pwInput.style.borderColor = ''; }, 1000);
    toast('Senha incorreta', 'error');
  }
};

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function getEmptyState(context) {
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg>
    <p>${context ? 'Nenhum ' + context : 'Nenhum dado encontrado'}</p>
  </div>`;
}

// ═══════════════════════════════════════════
// AUTH STATUS CSS CHECK
// ═══════════════════════════════════════════
function updateAdminBadgeVisibility() {
  const badge = document.getElementById('admin-badge');
  if (badge) badge.style.display = state.isAdmin ? 'inline-flex' : 'none';
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
export async function init() {
  console.log('🚀 R2C-Scan v2.0 initializing...');

  // Initialize database
  await initDB();
  console.log('✅ Database initialized');

  // Theme
  if (localStorage.getItem('r2c-theme') === 'light') {
    state.isLight = true;
    document.body.classList.add('light-theme');
  }

  // Seed demo data (only if empty)
  await seedDemoData();

  // Render home
  renderHome();

  // Hide splash screen
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => { if (splash) splash.style.display = 'none'; }, 500);
    }
  }, 1200);

  // Register modal close handlers
  document.getElementById('modal-add')?.addEventListener('click', e => { if (e.target === e.currentTarget) window.closeAddModal(); });
  document.getElementById('modal-admin-login')?.addEventListener('click', e => { if (e.target === e.currentTarget) window.closeAdminModal(); });
  document.getElementById('modal-maint')?.addEventListener('click', e => { if (e.target === e.currentTarget) window.closeMaintModal(); });
  document.getElementById('modal-stock')?.addEventListener('click', e => { if (e.target === e.currentTarget) window.closeStockModal(); });
  document.getElementById('modal-movement')?.addEventListener('click', e => { if (e.target === e.currentTarget) window.closeMovementModal(); });
  document.getElementById('modal-supplier')?.addEventListener('click', e => { if (e.target === e.currentTarget) window.closeSupplierModal(); });

  console.log('✅ R2C-Scan v2.0 ready');
}

async function seedDemoData() {
  // Products
  const allProd = await getAll(STORES.PRODUCTS);
  if (allProd.length === 0) {
    const demos = [
      { id: 'demo1', name: 'Parafuso Sextavado M8', sku: 'FIX-0001', category: 'Fixadores', description: 'Parafuso de aço inox grau 8.8, cabeça sextavada, rosca completa.', techSpecs: [{ key: 'Material', val: 'Aço Inox 304' }, { key: 'Diâmetro', val: 'M8' }, { key: 'Comprimento', val: '40mm' }, { key: 'Passo', val: '1,25mm' }, { key: 'Torque', val: '25 N·m' }], photo: null, qrData: 'R2CSCAN:demo1', createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now(), fav: false },
      { id: 'demo2', name: 'Válvula de Esfera 1/2"', sku: 'HID-0042', category: 'Hidráulica', description: 'Válvula de esfera em latão, passagem plena, rosca BSP.', techSpecs: [{ key: 'Material', val: 'Latão' }, { key: 'Bitola', val: '1/2" BSP' }, { key: 'Pressão máx.', val: '20 bar' }, { key: 'Temperatura', val: '-20°C a 120°C' }, { key: 'Rosca', val: 'BSP' }], photo: null, qrData: 'R2CSCAN:demo2', createdAt: Date.now() - 86400000, updatedAt: Date.now(), fav: false },
      { id: 'demo3', name: 'Disjuntor DIN 20A', sku: 'ELE-0108', category: 'Elétrica', description: 'Disjuntor monopolar curva C para painel elétrico.', techSpecs: [{ key: 'Corrente', val: '20A' }, { key: 'Curva', val: 'C' }, { key: 'Tensão', val: '230/400V' }, { key: 'Polos', val: '1P' }, { key: 'Norma', val: 'IEC 60898' }], photo: null, qrData: 'R2CSCAN:demo3', createdAt: Date.now() - 3600000 * 5, updatedAt: Date.now(), fav: false }
    ];
    for (const d of demos) await save(STORES.PRODUCTS, d);
  }

  // Maintenance
  const allMaint = await getAll(STORES.MAINTENANCE);
  if (allMaint.length === 0) {
    const now = Date.now();
    const demos = [
      { id: 'maint_demo1', name: 'Prensa Hidráulica 50T', type: 'Preventiva', priority: 'alta', date: now + 86400000 * 2, time: '08:00', desc: 'Troca de óleo e verificação de vedação', tech: 'Carlos Silva', recurrence: 'monthly', checklist: [{ text: 'Verificar nível de óleo', done: false }, { text: 'Inspecionar mangueiras', done: false }, { text: 'Testar pressão', done: false }], status: 'pending', createdAt: now, updatedAt: now },
      { id: 'maint_demo2', name: 'Compressor de Ar', type: 'Corretiva', priority: 'critica', date: now + 86400000, time: '10:30', desc: 'Vazamento na válvula de alívio - substituir', tech: 'João Santos', recurrence: 'none', checklist: [{ text: 'Despressurizar sistema', done: false }, { text: 'Substituir válvula', done: false }], status: 'pending', createdAt: now, updatedAt: now },
      { id: 'maint_demo3', name: 'Esteira Transportadora', type: 'Inspeção', priority: 'media', date: now + 86400000 * 5, time: '14:00', desc: 'Inspeção visual e medição de desgaste', tech: 'Maria Oliveira', recurrence: 'weekly', checklist: [{ text: 'Verificar correias', done: false }, { text: 'Lubrificar rolamentos', done: false }, { text: 'Medir tensão', done: false }, { text: 'Inspecionar emendas', done: false }], status: 'pending', createdAt: now, updatedAt: now }
    ];
    for (const d of demos) await save(STORES.MAINTENANCE, d);
  }

  // Stock
  const allStock = await getAll(STORES.STOCK);
  if (allStock.length === 0) {
    const demos = [
      { id: 'stock_demo1', name: 'Parafuso M8 x 40mm', qty: 200, min: 50, unit: 'un', location: 'Prateleira A3', obs: '', createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'stock_demo2', name: 'Óleo Hidráulico AW68', qty: 15, min: 20, unit: 'L', location: 'Tanque 2', obs: '', createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'stock_demo3', name: 'Filtro de Ar', qty: 8, min: 10, unit: 'un', location: 'Gaveta 5', obs: '', createdAt: Date.now(), updatedAt: Date.now() }
    ];
    for (const d of demos) await save(STORES.STOCK, d);
  }

  // Suppliers
  const allSupp = await getAll(STORES.SUPPLIERS);
  if (allSupp.length === 0) {
    const demos = [
      { id: 'supp_demo1', name: 'Aços Especiais Ltda', cnpj: '12.345.678/0001-90', ie: '123.456.789', contact: 'Pedro Almeida', phone: '(11) 3333-4444', email: 'pedro@acos.com.br', address: 'Av. Industrial, 1000, São Paulo, SP', category: 'Fixadores, Chapas, Perfilados', obs: 'Prazo de entrega 15 dias', createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'supp_demo2', name: 'Hidráulica Brasil', cnpj: '98.765.432/0001-10', ie: '987.654.321', contact: 'Ana Costa', phone: '(11) 4444-5555', email: 'ana@hidraulica.com.br', address: 'Rua dos Canos, 500, São Paulo, SP', category: 'Válvulas, Mangueiras, Conexões', obs: '', createdAt: Date.now(), updatedAt: Date.now() }
    ];
    for (const d of demos) await save(STORES.SUPPLIERS, d);
  }
}

export default { init, goPage };