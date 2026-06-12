/**
 * R2C-Scan — Módulo de Fornecedores
 * Módulo 3 da migração (ver MIGRATION-GUIDE.md)
 * Fonte da verdade: index.html (~linhas 2405-2459). index.html intocado.
 * Restaura paridade: tradeName/responsible/whatsapp (commit d6dbdbb) que a
 * versão antiga do app.js não tinha.
 */
import { getAll, getById, save, STORES } from '../utils/db.js';
import toast from '../utils/toast.js';
import { escapeHTML, q } from '../utils/format.js';

export async function openSupplierModal(data) {
  // Aceita o id (string) ou o objeto completo — resolve via banco quando for id
  if (typeof data === 'string') data = await getById(STORES.SUPPLIERS, data);
  const editId = q('supp-edit-id');
  if (editId) editId.value = data?.id || '';
  const title = q('modal-supplier-title');
  if (title) title.textContent = data ? '✏️ Editar Fornecedor' : '🏭 Novo Fornecedor';
  setVal('sup-name', data?.name);
  setVal('sup-trade', data?.tradeName);
  setVal('sup-cnpj', data?.cnpj);
  setVal('sup-ie', data?.ie);
  setVal('sup-contact', data?.contact);
  setVal('sup-resp', data?.responsible);
  setVal('sup-phone', data?.phone);
  setVal('sup-whats', data?.whatsapp);
  setVal('sup-email', data?.email);
  setVal('sup-addr', data?.address);
  setVal('sup-cat', data?.category);
  setVal('sup-obs', data?.obs);
  q('modal-supplier')?.classList.add('open');
}

export function closeSupplierModal() { q('modal-supplier')?.classList.remove('open'); }

export async function saveSupplier() {
  const name = (q('sup-name')?.value || '').trim();
  if (!name) { toast('Nome da empresa obrigatório', 'error'); return; }
  const editId = q('supp-edit-id')?.value || '';
  const id = editId || `supp_${Date.now()}`;
  const old = editId ? await getById(STORES.SUPPLIERS, id) : null;
  const supp = {
    id, name,
    tradeName: (q('sup-trade')?.value || '').trim(),
    cnpj: (q('sup-cnpj')?.value || '').trim(),
    ie: (q('sup-ie')?.value || '').trim(),
    contact: (q('sup-contact')?.value || '').trim(),
    responsible: (q('sup-resp')?.value || '').trim(),
    phone: (q('sup-phone')?.value || '').trim(),
    whatsapp: (q('sup-whats')?.value || '').trim(),
    email: (q('sup-email')?.value || '').trim(),
    address: (q('sup-addr')?.value || '').trim(),
    category: (q('sup-cat')?.value || '').trim(),
    obs: (q('sup-obs')?.value || '').trim(),
    createdAt: old?.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  await save(STORES.SUPPLIERS, supp);
  closeSupplierModal();
  toast('Fornecedor salvo!', 'success');
  renderSuppliers();
}

export async function renderSuppliers() {
  let all = await getAll(STORES.SUPPLIERS);
  const query = (q('supplier-search')?.value || '').toLowerCase();
  if (query) all = all.filter(s =>
    s.name.toLowerCase().includes(query) ||
    (s.tradeName || '').toLowerCase().includes(query) ||
    (s.category || '').toLowerCase().includes(query) ||
    (s.contact || '').toLowerCase().includes(query) ||
    (s.responsible || '').toLowerCase().includes(query));
  all.sort((a, b) => a.name.localeCompare(b.name));

  const list = q('supplier-list');
  if (!list) return;
  if (all.length === 0) {
    list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg><p>Nenhum fornecedor cadastrado</p></div>`;
    return;
  }
  list.innerHTML = all.map(s => `<div class="mini-card">
    <div class="mc-icon" style="background:rgba(168,85,247,.1)">🏭</div>
    <div class="mc-body">
      <div class="mc-title">${escapeHTML(s.name)}${s.tradeName ? ` <span style="font-weight:400;color:var(--text2);font-size:.75rem">(${escapeHTML(s.tradeName)})</span>` : ''}</div>
      <div class="mc-sub">${escapeHTML(s.responsible || s.contact || '—')}${s.phone ? ' · ' + escapeHTML(s.phone) : ''}${s.whatsapp ? ' · 💬 ' + escapeHTML(s.whatsapp) : ''}${s.category ? ' · ' + escapeHTML(s.category) : ''}</div>
    </div>
    <button onclick="event.stopPropagation();window.openSupplierModal('${s.id}')" style="background:none;border:1px solid var(--border);border-radius:7px;padding:5px;cursor:pointer">
      <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" style="width:14px;height:14px"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    </button>
  </div>`).join('');
}

// Helper local de formulário (mesmo padrão de products.js/stock.js)
function setVal(id, val) {
  const el = q(id);
  if (el) el.value = val ?? '';
}
