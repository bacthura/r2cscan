/**
 * R2C-Scan — Módulo de Produtos / Catálogo
 * Módulo 1 da migração (ver MIGRATION-GUIDE.md)
 * Fonte da verdade: index.html (~linhas 1640-2054). index.html intocado.
 */
import { getAll, getById, save, remove, STORES } from '../utils/db.js';
import toast from '../utils/toast.js';
import { escapeHTML, q } from '../utils/format.js';
import { state } from '../app.js';

// ─── Ganchos temporários até os módulos correspondentes serem migrados ───
// (renderHome/renderAdmin vivem no app.js; resumeScanner religa o html5-qrcode)
const hooks = {};
export function registerProductHooks(map) { Object.assign(hooks, map); }
function safeCall(name, ...args) {
  if (typeof hooks[name] === 'function') return hooks[name](...args);
  if (typeof window[name] === 'function') return window[name](...args);
}

// ═══════════════ BUSCA POR CÓDIGO / QR ═══════════════
export async function openProductByQR(code) {
  const all = await getAll(STORES.PRODUCTS);
  const prod = all.find(p => p.qrData === code || p.sku === code || p.id === code);
  if (prod) openDetail(prod, false);
}

export async function openProductByCode() {
  const val = q('scan-result-val').textContent;
  const all = await getAll(STORES.PRODUCTS);
  const prod = all.find(p => p.qrData === val || p.sku === val || p.id === val);
  if (prod) openDetail(prod, false);
  else toast('Produto não encontrado');
}

// ═══════════════ CATÁLOGO ═══════════════
export async function renderCatalog() {
  const query = (q('search-input')?.value || '').toLowerCase();
  let all = await getAll(STORES.PRODUCTS);

  all.sort((a, b) => {
    if (state.currentSort === 'name') return a.name.localeCompare(b.name);
    if (state.currentSort === 'category') return (a.category || '').localeCompare(b.category || '');
    if (state.currentSort === 'fav') return (b.fav ? 1 : 0) - (a.fav ? 1 : 0);
    return b.createdAt - a.createdAt;
  });

  const filtered = all.filter(p => {
    const matchCat = state.currentFilter === 'todos' || (p.category || '').toLowerCase() === state.currentFilter.toLowerCase();
    const matchQ = !query || p.name.toLowerCase().includes(query) || (p.sku || '').toLowerCase().includes(query) || (p.category || '').toLowerCase().includes(query);
    return matchCat && matchQ;
  });

  const cats = [...new Set(all.map(p => p.category).filter(Boolean))];
  const filterRow = q('filter-row');
  if (filterRow) {
    filterRow.innerHTML = '<div class="filter-chip active" data-cat="todos" onclick="window.setFilter(this)">Todos</div>';
    cats.forEach(c => {
      const chip = document.createElement('div');
      chip.className = 'filter-chip' + (c === state.currentFilter ? ' active' : '');
      chip.dataset.cat = c;
      chip.textContent = c;
      chip.onclick = () => setFilter(chip);
      filterRow.appendChild(chip);
    });
    const chipAll = filterRow.querySelector('[data-cat="todos"]');
    if (state.currentFilter !== 'todos' && chipAll) chipAll.classList.remove('active');
  }

  const list = q('catalog-list');
  if (!list) return;
  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg><p>Nenhum produto encontrado</p></div>`;
    return;
  }
  list.innerHTML = filtered.map(p => productCardHTML(p)).join('');
}

export function setFilter(el) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  state.currentFilter = el.dataset.cat;
  renderCatalog();
}

export function setSort(el) {
  document.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  state.currentSort = el.dataset.sort;
  renderCatalog();
}

export function productCardHTML(p) {
  const isFav = p.fav ? 'active' : '';
  const imgContent = p.photo
    ? `<img src="${p.photo}" alt="${escapeHTML(p.name)}" loading="lazy">`
    : `<div class="no-img"><svg viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.5" style="width:28px;height:28px"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span>Sem imagem</span></div>`;
  return `<div class="product-card">
    <div class="card-img" onclick="window.openDetailById('${p.id}')">${imgContent}</div>
    <div class="card-body">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-tag">${escapeHTML(p.category || 'Geral')}</div>
        <button class="fav-btn ${isFav}" onclick="event.stopPropagation();window.toggleFav('${p.id}')">
          <svg viewBox="0 0 24 24" fill="${p.fav ? '#FF6B35' : 'none'}" stroke="${p.fav ? '#FF6B35' : '#888'}" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
      </div>
      <div class="card-name" onclick="window.openDetailById('${p.id}')">${escapeHTML(p.name)}</div>
      <div class="card-sku">${escapeHTML(p.sku || 'SKU não definido')}</div>
      <div class="card-footer" onclick="window.openDetailById('${p.id}')">
        <div class="status">Cadastrado</div>
        <div style="font-size:.62rem;color:var(--text2)">${new Date(p.createdAt).toLocaleDateString('pt-BR')}</div>
      </div>
    </div>
  </div>`;
}

// ═══════════════ DETALHE ═══════════════
export async function openDetailById(id) {
  const prod = await getById(STORES.PRODUCTS, id);
  if (prod) openDetail(prod, false);
}

export function openDetail(prod, byAI) {
  state.currentDetailId = prod.id;
  const img = q('detail-img');
  if (img) { img.src = prod.photo || ''; img.style.display = prod.photo ? 'block' : 'none'; }
  if (q('detail-category')) q('detail-category').textContent = prod.category || 'Geral';
  if (q('detail-title')) q('detail-title').textContent = prod.name;
  if (q('detail-sku')) q('detail-sku').textContent = prod.sku ? `SKU: ${prod.sku}` : '';
  if (q('detail-desc')) q('detail-desc').textContent = prod.description || '';
  if (q('detail-ai-badge')) q('detail-ai-badge').style.display = byAI ? 'inline-flex' : 'none';

  const specsHTML = [];
  if (prod.specs) Object.entries(prod.specs).forEach(([k, v]) =>
    specsHTML.push(`<div class="spec-item"><div class="spec-key">${escapeHTML(k)}</div><div class="spec-val">${escapeHTML(v)}</div></div>`));
  if (q('detail-specs')) q('detail-specs').innerHTML = specsHTML.join('');

  const techRows = prod.techSpecs || [];
  const techTable = q('detail-tech-table');
  if (techTable) {
    if (techRows.length > 0) {
      techTable.innerHTML = techRows.map(r => `<div class="tech-spec-row"><span class="tsk">${escapeHTML(r.key)}</span><span class="tsv">${escapeHTML(r.val)}</span></div>`).join('');
      techTable.style.display = 'block';
    } else techTable.style.display = 'none';
  }

  const qrWrap = q('detail-qr-canvas');
  if (qrWrap && typeof QRCode !== 'undefined') {
    qrWrap.innerHTML = '';
    const qrData = prod.qrData || prod.id;
    new QRCode(qrWrap, { text: qrData, width: 160, height: 160, colorDark: '#000', colorLight: '#fff', correctLevel: QRCode.CorrectLevel.H });
    if (q('detail-qr-label')) q('detail-qr-label').textContent = prod.sku || prod.id;
  }

  q('detail-page')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeDetail() {
  q('detail-page')?.classList.remove('open');
  document.body.style.overflow = '';
  state.currentDetailId = null;
  if (state.currentPage === 'page-scanner' && state.scanMode === 'qr') safeCall('resumeScanner');
}

export async function deleteCurrentProduct() {
  if (!state.currentDetailId) return;
  if (!confirm('Excluir este produto?')) return;
  await remove(STORES.PRODUCTS, state.currentDetailId);
  closeDetail();
  toast('Produto excluído', 'success');
  safeCall('renderHome');
}

export function shareProduct() {
  if (navigator.share) navigator.share({ title: 'R2C-Scan', text: 'Dados do produto', url: window.location.href });
  else toast('Compartilhamento não disponível', 'warning');
}

export async function toggleFav(id) {
  const prod = await getById(STORES.PRODUCTS, id);
  if (!prod) return;
  prod.fav = !prod.fav;
  await save(STORES.PRODUCTS, prod);
  renderCatalog();
  if (state.currentPage === 'page-home') safeCall('renderHome');
  toast(prod.fav ? '⭐ Adicionado aos favoritos' : 'Removido dos favoritos');
}

export async function duplicateProduct() {
  if (!state.currentDetailId) return;
  const prod = await getById(STORES.PRODUCTS, state.currentDetailId);
  if (!prod) return;
  const newProd = {
    ...prod,
    id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: prod.name + ' (cópia)',
    sku: prod.sku ? prod.sku + '-COPY' : '',
    createdAt: Date.now(), updatedAt: Date.now(),
    qrData: `R2CSCAN:${Date.now()}`
  };
  await save(STORES.PRODUCTS, newProd);
  toast('Produto duplicado!', 'success');
  safeCall('renderHome');
  closeDetail();
}

// ═══════════════ ADICIONAR / EDITAR ═══════════════
export function openAddModal() {
  state.editingId = null;
  state.photoDataURL = null;
  if (q('modal-title')) q('modal-title').textContent = '📦 Novo Produto';
  resetForm();
  q('modal-add')?.classList.add('open');
}

export async function editProduct(id) {
  const prod = await getById(STORES.PRODUCTS, id);
  if (!prod) return;
  state.editingId = id;
  state.photoDataURL = prod.photo || null;
  if (q('modal-title')) q('modal-title').textContent = '✏️ Editar Produto';
  setVal('f-name', prod.name); setVal('f-sku', prod.sku);
  setVal('f-cat', prod.category); setVal('f-desc', prod.description);
  if (prod.photo) {
    const preview = q('photo-preview');
    if (preview) { preview.src = prod.photo; preview.style.display = 'block'; }
    const label = q('upload-label-inner');
    if (label) label.style.display = 'none';
  }
  resetSpecFields();
  if (prod.techSpecs && prod.techSpecs.length > 0) {
    const container = q('specs-fields');
    if (container) {
      container.innerHTML = '';
      prod.techSpecs.forEach(({ key, val }) => addSpecField(key, val));
    }
  }
  q('modal-add')?.classList.add('open');
}

export function closeAddModal() { q('modal-add')?.classList.remove('open'); }

function resetForm() {
  ['f-name', 'f-sku', 'f-cat', 'f-desc'].forEach(id => setVal(id, ''));
  const preview = q('photo-preview');
  if (preview) preview.style.display = 'none';
  const label = q('upload-label-inner');
  if (label) label.style.display = 'flex';
  resetSpecFields();
}

function setVal(id, val) {
  const el = q(id);
  if (el) el.value = val || '';
}

export function resetSpecFields() {
  const container = q('specs-fields');
  if (container) {
    container.innerHTML = `<div class="spec-row" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <input class="spec-key-input" type="text" placeholder="Campo (ex: Peso)" style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:9px 10px;color:var(--text);font-family:var(--font-mono);font-size:.75rem;outline:none">
      <input class="spec-val-input" type="text" placeholder="Valor (ex: 12g)" style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:9px 10px;color:var(--text);font-family:var(--font-mono);font-size:.75rem;outline:none">
    </div>`;
  }
}

export function addSpecField(k = '', v = '') {
  const row = document.createElement('div');
  row.className = 'spec-row';
  row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px';
  row.innerHTML = `<input class="spec-key-input" type="text" value="${escapeHTML(k)}" placeholder="Campo" style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:9px 10px;color:var(--text);font-family:var(--font-mono);font-size:.75rem;outline:none">
    <input class="spec-val-input" type="text" value="${escapeHTML(v)}" placeholder="Valor" style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:9px 10px;color:var(--text);font-family:var(--font-mono);font-size:.75rem;outline:none">`;
  q('specs-fields')?.appendChild(row);
}

export function previewPhoto(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      state.photoDataURL = e.target.result;
      const preview = q('photo-preview');
      if (preview) { preview.src = state.photoDataURL; preview.style.display = 'block'; }
      const label = q('upload-label-inner');
      if (label) label.style.display = 'none';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

export async function saveProduct() {
  const name = (q('f-name')?.value || '').trim();
  if (!name) { toast('Nome obrigatório', 'error'); return; }
  const sku = (q('f-sku')?.value || '').trim() || `SKU-${Date.now()}`;
  const category = (q('f-cat')?.value || '').trim();
  const description = (q('f-desc')?.value || '').trim();
  const techSpecs = [];
  document.querySelectorAll('#specs-fields .spec-row').forEach(row => {
    const k = row.querySelector('.spec-key-input')?.value.trim();
    const v = row.querySelector('.spec-val-input')?.value.trim();
    if (k && v) techSpecs.push({ key: k, val: v });
  });
  const id = state.editingId || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const qrData = `R2CSCAN:${id}`;
  const old = state.editingId ? await getById(STORES.PRODUCTS, id) : null;
  const prod = {
    id, name, sku, category, description, techSpecs,
    photo: state.photoDataURL || null, qrData,
    fav: old ? old.fav : false,
    createdAt: old?.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  const btn = q('save-btn');
  if (btn) btn.textContent = 'Salvando…';
  await save(STORES.PRODUCTS, prod);
  if (btn) btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>Salvar e Gerar QR Code`;
  closeAddModal();
  toast('Produto salvo!', 'success');
  safeCall('renderHome');
  if (state.currentPage === 'page-catalog') renderCatalog();
  if (state.currentPage === 'page-admin') safeCall('renderAdmin');
  setTimeout(() => openDetail(prod, false), 400);
}
