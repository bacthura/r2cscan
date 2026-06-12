/**
 * R2C-Scan — Módulo de Lista de Compras
 * Módulo 4 da migração (ver MIGRATION-GUIDE.md)
 * Fonte da verdade: index.html (~linhas 3608-3651 e 3675-3682). index.html intocado.
 * O botão × usava o dbDelete global do motor antigo — virou removePurchase(id).
 */
import { getAll, getById, save, remove, STORES } from '../utils/db.js';
import toast from '../utils/toast.js';
import { esc, money, q } from '../utils/format.js';
import { downloadCSV, printHTML } from '../utils/export.js';

export async function generatePurchaseList() {
  const stock = await getAll(STORES.STOCK);
  const suppliers = await getAll(STORES.SUPPLIERS);
  const existing = await getAll(STORES.PURCHASES);
  const low = stock.filter(i => (i.qty || 0) <= (i.min || 0));
  let added = 0;
  for (const i of low) {
    if (existing.some(p => p.stockId === i.id && p.status === 'pendente')) continue;
    // fornecedor sugerido: por correspondência de categoria/nome
    const sup = suppliers.find(s => (s.category || '').toLowerCase().split(/[,;]/).some(c => c.trim() && (i.name || '').toLowerCase().includes(c.trim()))) || suppliers[0];
    const need = Math.max((i.min || 0) * 2 - (i.qty || 0), 1);
    await save(STORES.PURCHASES, {
      id: `pur_${Date.now()}_${added}`, stockId: i.id, material: i.name, quantity: need, unit: i.unit || 'un',
      supplierId: sup?.id || '', supplierName: sup?.name || '', lastPrice: i.lastPrice || 0, status: 'pendente', createdAt: Date.now()
    });
    added++;
  }
  toast(added ? `${added} item(ns) adicionado(s)` : 'Estoque OK — nada a comprar');
  renderPurchases();
}

export async function renderPurchases() {
  const list = await getAll(STORES.PURCHASES);
  list.sort((a, b) => b.createdAt - a.createdAt);
  const el = q('purchase-list');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<div class="empty-state"><p>Lista vazia. Toque em "Gerar automático" para identificar itens abaixo do mínimo.</p></div>';
    return;
  }
  const stMap = { pendente: 'warn', cotado: 'info', comprado: 'ok', recebido: 'ok', cancelado: 'danger' };
  el.innerHTML = list.map(p => `<div class="mini-card">
    <div class="mc-icon" style="background:rgba(245,158,11,.12)">🛒</div>
    <div class="mc-body"><div class="mc-title">${esc(p.material)} <span style="color:var(--text2);font-weight:400">×${p.quantity} ${esc(p.unit || '')}</span></div>
    <div class="mc-sub">${esc(p.supplierName || 'Sem fornecedor')}${p.lastPrice ? ' · últ. ' + money(p.lastPrice) : ''}</div></div>
    <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
      <span class="status-badge ${stMap[p.status] || 'warn'}">${esc(p.status)}</span>
      <div style="display:flex;gap:4px">
        <button onclick="window.cyclePurchase('${p.id}')" style="background:none;border:1px solid var(--border);border-radius:5px;padding:3px 6px;font-size:.6rem;cursor:pointer;color:var(--accent2)">→</button>
        <button onclick="window.removePurchase('${p.id}')" style="background:none;border:1px solid var(--border);border-radius:5px;padding:3px 6px;font-size:.6rem;cursor:pointer;color:var(--danger)">×</button>
      </div>
    </div>
  </div>`).join('');
}

export async function cyclePurchase(id) {
  const seq = ['pendente', 'cotado', 'comprado', 'recebido'];
  const p = await getById(STORES.PURCHASES, id);
  if (!p) return;
  p.status = seq[(seq.indexOf(p.status) + 1) % seq.length];
  p.updatedAt = Date.now();
  await save(STORES.PURCHASES, p);
  renderPurchases();
}

export async function removePurchase(id) {
  await remove(STORES.PURCHASES, id);
  renderPurchases();
}

export async function exportPurchases(fmt) {
  const list = await getAll(STORES.PURCHASES);
  const header = ['Material', 'Quantidade', 'Unidade', 'Fornecedor', 'Último Preço', 'Status'];
  const rows = list.map(p => [p.material, p.quantity, p.unit, p.supplierName, p.lastPrice || 0, p.status]);
  if (fmt === 'csv') { downloadCSV('lista-compras.csv', [header, ...rows]); return; }
  const body = `<table><thead><tr>${header.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  printHTML('Lista de Compras', body);
}
