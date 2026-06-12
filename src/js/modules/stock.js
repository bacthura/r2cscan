/**
 * R2C-Scan — Módulo de Estoque / Movimentações
 * Módulo 2 da migração (ver MIGRATION-GUIDE.md)
 * Fonte da verdade: index.html (~linhas 2241-2400). index.html intocado.
 *
 * NOTA: movimentações vivem em localStorage('r2c_movements'). O módulo 6 (OS)
 * também registra movimentações — ao migrá-lo, REUSAR saveMovement daqui.
 * Avaliar mover para a store MOVEMENTS do IndexedDB numa limpeza futura.
 */
import { getAll, getById, save, STORES } from '../utils/db.js';
import toast from '../utils/toast.js';
import { escapeHTML, q } from '../utils/format.js';
import { state } from '../app.js';

// ═══════════════ ESTOQUE ═══════════════
export function setStockTab(el, tab) {
  document.querySelectorAll('#stock-tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  state.stockTab = tab;
  const items = q('stock-items');
  const movements = q('stock-movements');
  if (items) items.style.display = tab === 'items' ? 'block' : 'none';
  if (movements) movements.style.display = tab === 'movements' ? 'block' : 'none';
  if (tab === 'movements') renderMovements();
}

export async function openStockModal(data) {
  // Aceita o id (string) ou o objeto completo — resolve via banco quando for id
  if (typeof data === 'string') data = await getById(STORES.STOCK, data);
  const editId = q('stock-edit-id');
  if (editId) editId.value = data?.id || '';
  const title = q('modal-stock-title');
  if (title) title.textContent = data ? '✏️ Editar Item' : '📦 Novo Item de Estoque';
  setVal('s-name', data?.name);
  setVal('s-qty', data?.qty || 0);
  setVal('s-min', data?.min || 10);
  setVal('s-unit', data?.unit || 'un');
  setVal('s-local', data?.location);
  setVal('s-obs', data?.obs);
  q('modal-stock')?.classList.add('open');
}

export function closeStockModal() { q('modal-stock')?.classList.remove('open'); }

export async function saveStockItem() {
  const name = (q('s-name')?.value || '').trim();
  if (!name) { toast('Nome obrigatório', 'error'); return; }
  const editId = q('stock-edit-id')?.value || '';
  const id = editId || `stock_${Date.now()}`;
  const old = editId ? await getById(STORES.STOCK, id) : null;
  const item = {
    id, name,
    qty: parseInt(q('s-qty')?.value) || 0,
    min: parseInt(q('s-min')?.value) || 10,
    unit: q('s-unit')?.value || 'un',
    location: (q('s-local')?.value || '').trim(),
    obs: (q('s-obs')?.value || '').trim(),
    createdAt: old?.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  await save(STORES.STOCK, item);
  closeStockModal();
  toast('Item salvo!', 'success');
  renderStock();
}

export async function renderStock() {
  let all = await getAll(STORES.STOCK);
  const query = (q('stock-search')?.value || '').toLowerCase();
  if (query) all = all.filter(i => i.name.toLowerCase().includes(query) || (i.location || '').toLowerCase().includes(query));
  all.sort((a, b) => a.name.localeCompare(b.name));

  const list = q('stock-list');
  if (!list) return;
  if (all.length === 0) {
    list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg><p>Nenhum item no estoque</p></div>`;
    return;
  }
  list.innerHTML = all.map(i => {
    const alerta = i.qty <= i.min;
    return `<div class="mini-card">
      <div class="mc-icon" style="background:${alerta ? 'rgba(255,68,102,.1)' : 'rgba(0,245,160,.1)'}">${alerta ? '⚠️' : '📦'}</div>
      <div class="mc-body">
        <div class="mc-title">${escapeHTML(i.name)} <span style="font-weight:400;color:var(--text2)">(${i.qty} ${escapeHTML(i.unit)})</span></div>
        <div class="mc-sub">${escapeHTML(i.location || 'Sem localização')}${alerta ? ' · <span style="color:var(--danger)">Estoque baixo!</span>' : ''}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
        <span style="font-family:var(--font-head);font-weight:700;font-size:1.1rem;color:${alerta ? 'var(--danger)' : 'var(--accent)'}">${i.qty}</span>
        <div style="display:flex;gap:4px">
          <button onclick="event.stopPropagation();window.openMovementModalForItem('${i.id}','${escapeHTML(i.name)}')" style="background:none;border:1px solid var(--border);border-radius:5px;padding:3px 6px;font-size:.6rem;cursor:pointer;color:var(--accent2)">↕</button>
          <button onclick="event.stopPropagation();window.openStockModal('${i.id}')" style="background:none;border:1px solid var(--border);border-radius:5px;padding:3px 6px;font-size:.6rem;cursor:pointer;color:var(--text2)">✏️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ═══════════════ MOVIMENTAÇÕES ═══════════════
export function openMovementModal() {
  state.movItemId = null;
  setVal('mov-item', '');
  setVal('mov-qty', 1);
  setVal('mov-type', 'entrada');
  setVal('mov-reason', '');
  populateMovSelect();
  q('modal-movement')?.classList.add('open');
}

export function openMovementModalForItem(id, name) {
  state.movItemId = id;
  setVal('mov-item', id);
  setVal('mov-qty', 1);
  setVal('mov-type', 'entrada');
  setVal('mov-reason', '');
  populateMovSelect();
  q('modal-movement')?.classList.add('open');
}

export function closeMovementModal() { q('modal-movement')?.classList.remove('open'); }

async function populateMovSelect() {
  const all = await getAll(STORES.STOCK);
  const sel = q('mov-item');
  if (sel) {
    sel.innerHTML = all.map(i => `<option value="${i.id}" ${i.id === state.movItemId ? 'selected' : ''}>${escapeHTML(i.name)}</option>`).join('');
  }
}

export function toggleMovementFields() {
  const type = q('mov-type')?.value;
  const quemPegou = q('mov-quem-pegou-field');
  const quemDevolveu = q('mov-quem-devolveu-field');
  if (quemPegou) quemPegou.style.display = type === 'saida' ? 'block' : 'none';
  if (quemDevolveu) quemDevolveu.style.display = type === 'entrada' ? 'block' : 'none';
}

export async function saveMovement() {
  const itemId = q('mov-item')?.value;
  if (!itemId) { toast('Selecione um item', 'error'); return; }
  const type = q('mov-type')?.value;
  const qty = parseInt(q('mov-qty')?.value) || 1;
  const responsavel = (q('mov-responsavel')?.value || '').trim();
  const devolvidoPor = (q('mov-devolveu')?.value || '').trim();
  const reason = (q('mov-reason')?.value || '').trim() || (type === 'entrada' ? 'Entrada manual' : 'Saída manual');
  const item = await getById(STORES.STOCK, itemId);
  if (!item) { toast('Item não encontrado', 'error'); return; }
  if (type === 'saida') {
    if (!responsavel) { toast('Informe quem retirou o material', 'error'); return; }
    if (item.qty < qty) { toast('Quantidade insuficiente em estoque', 'error'); return; }
  }
  if (type === 'entrada' && !devolvidoPor) { toast('Informe quem devolveu o material', 'error'); return; }

  item.qty += type === 'entrada' ? qty : -qty;
  item.updatedAt = Date.now();
  await save(STORES.STOCK, item);

  const mov = { id: `mov_${Date.now()}`, itemId, itemName: item.name, type, qty, reason, responsavel, devolvidoPor, timestamp: Date.now() };
  const movs = JSON.parse(localStorage.getItem('r2c_movements') || '[]');
  movs.unshift(mov);
  localStorage.setItem('r2c_movements', JSON.stringify(movs.slice(0, 500)));

  closeMovementModal();
  toast('Movimentação registrada!', 'success');
  renderStock();
  if (state.stockTab === 'movements') renderMovements();
}

export async function renderMovements() {
  const movs = JSON.parse(localStorage.getItem('r2c_movements') || '[]');
  const list = q('movement-list');
  if (!list) return;
  if (movs.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>Nenhuma movimentação registrada</p></div>`;
    return;
  }
  list.innerHTML = movs.map(m => {
    let extraInfo = '';
    if (m.type === 'saida' && m.responsavel) extraInfo = ` · Retirado por: ${escapeHTML(m.responsavel)}`;
    if (m.type === 'entrada' && m.devolvidoPor) extraInfo = ` · Devolvido por: ${escapeHTML(m.devolvidoPor)}`;
    return `<div class="mini-card">
      <div class="mc-icon" style="background:${m.type === 'entrada' ? 'rgba(0,245,160,.1)' : 'rgba(255,68,102,.1)'}">${m.type === 'entrada' ? '📥' : '📤'}</div>
      <div class="mc-body">
        <div class="mc-title">${escapeHTML(m.itemName)} <span style="color:${m.type === 'entrada' ? 'var(--accent)' : 'var(--danger)'}">${m.type === 'entrada' ? '+' : '-'}${m.qty}</span></div>
        <div class="mc-sub">${escapeHTML(m.reason)}${extraInfo} · ${new Date(m.timestamp).toLocaleString('pt-BR')}</div>
      </div>
    </div>`;
  }).join('');
}

// Helper local de formulário (mesmo padrão do products.js)
function setVal(id, val) {
  const el = q(id);
  if (el) el.value = val ?? '';
}
