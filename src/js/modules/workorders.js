/**
 * R2C-Scan — Módulo de Ordens de Serviço (manutenção industrial)
 * Módulo 6 da migração (ver MIGRATION-GUIDE.md) — o maior (~30 funções)
 * Fonte da verdade: index.html (bloco "MÓDULO DE MANUTENÇÃO INDUSTRIAL",
 * ~linhas 3159-3704). index.html intocado.
 *
 * Reusa: recordMovement de stock.js (movimentações) e downloadCSV/printHTML
 * de utils/export.js — conforme notas técnicas do guia.
 */
import { getAll, getById, save, remove, STORES } from '../utils/db.js';
import toast from '../utils/toast.js';
import { money, dt, dOnly, esc, q } from '../utils/format.js';
import { downloadCSV, printHTML } from '../utils/export.js';
import { recordMovement } from './stock.js';

// ─── Estado do módulo (privado; currentOSId espelhado em window p/ os
//     onclick inline do HTML congelado, ex.: printOS(currentOSId)) ───
let osTab = 'all';
let currentOSId = null;
let osDetailTab = 'info';
let osPhotoStaged = null;       // { url, mime } da mídia em upload
const osCharts = {};

function setCurrentOS(id) {
  currentOSId = id;
  window.currentOSId = id; // compat com handlers inline do HTML
}

// ─── Rótulos ───
export const OS_STATUS = {
  aberta: { t: 'Aberta', c: 'warn' }, analise: { t: 'Em análise', c: 'info' },
  aguardando_material: { t: 'Aguardando material', c: 'warn' }, execucao: { t: 'Em execução', c: 'info' },
  aguardando_aprovacao: { t: 'Aguardando aprovação', c: 'warn' }, concluida: { t: 'Concluída', c: 'ok' },
  cancelada: { t: 'Cancelada', c: 'danger' }
};
export const OS_PRIO = { baixa: { t: 'Baixa', i: '🟢' }, media: { t: 'Média', i: '🟡' }, alta: { t: 'Alta', i: '🟠' }, critica: { t: 'Crítica', i: '🔴' } };
export const OS_TYPE = { corretiva: 'Corretiva', preventiva: 'Preventiva', preditiva: 'Preditiva', inspecao: 'Inspeção' };

// ─── Permissões (integra com o controle de acesso quando existir) ───
// Papéis: ADMIN / SUPERVISOR / TÉCNICO / VISUALIZADOR.
// Offline (sem perfil carregado) o app permanece utilizável.
export function osCan(action) {
  const profile = window.userProfile;
  if (profile == null) return true;
  if (typeof window.isAdminUser === 'function' && window.isAdminUser()) return true;
  const role = (profile.role || '').toLowerCase();
  if (role === 'visualizador') return action === 'view';
  if (role === 'tecnico') return ['view', 'edit', 'conclude'].includes(action);
  if (role === 'supervisor') return action !== 'delete'; // exclusão definitiva: só admin
  if (typeof window.can === 'function') {
    if (action === 'view') return window.can('maintenance', 'view');
    if (action === 'delete') return window.can('maintenance', 'delete');
    return window.can('maintenance', 'edit');
  }
  return true;
}

// ─── Utilitários ───
export function osTotal(o) { return (Number(o.laborCost) || 0) + (Number(o.thirdpartyCost) || 0) + (Number(o.additionalCost) || 0) + osMaterialsTotal(o); }
export function osMaterialsTotal(o) { return (o.materials || []).reduce((s, m) => s + (Number(m.qty) || 0) * (Number(m.unitPrice) || 0), 0); }

async function nextOSNumber() {
  const all = await getAll(STORES.WORK_ORDERS);
  const year = new Date().getFullYear();
  const seq = all.filter(o => (o.osNumber || '').includes(`OS-${year}-`)).length + 1;
  return `OS-${year}-${String(seq).padStart(4, '0')}`;
}

function osCurrentUser() {
  try { if (window.userProfile?.email) return window.userProfile.email; } catch (_) {}
  try { if (window.firebaseUser?.email) return window.firebaseUser.email; } catch (_) {}
  return 'Local';
}

function addTimeline(o, event, note) {
  o.history = o.history || [];
  o.history.push({ event, note: note || '', user: osCurrentUser(), ts: Date.now() });
}

// ═══════════════ LISTA DE OS ═══════════════
export function setOSTab(el, tab) {
  document.querySelectorAll('#os-tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  osTab = tab;
  renderOS();
}

export async function seedOSIfEmpty() {
  const all = await getAll(STORES.WORK_ORDERS);
  if (all.length) return;
  const now = Date.now();
  const demo = [
    { id: `os_${now}`, osNumber: 'OS-' + new Date().getFullYear() + '-0001', openedAt: now - 86400000 * 2, dueAt: now + 86400000, closedAt: null,
      requester: 'Operador Linha A', technician: 'Carlos Silva', priority: 'alta', type: 'corretiva',
      assetId: 'demo1', equipment: 'Prensa Hidráulica 50T', patrimony: 'PAT-0091', sector: 'Estamparia', location: 'Galpão 2',
      failureDesc: 'Vazamento de óleo na unidade hidráulica', diagnosis: 'Vedação do cilindro principal danificada',
      rootCause: 'Desgaste natural do retentor', solution: '', notes: '', status: 'execucao',
      laborCost: 120, thirdpartyCost: 0, additionalCost: 0,
      materials: [{ id: 'm1', code: 'HID-001', name: 'Kit de Vedação', category: 'Hidráulica', qty: 1, unit: 'kit', unitPrice: 85 }],
      photos: [], history: [{ event: 'Ordem criada', note: 'OS aberta', user: 'Local', ts: now - 86400000 * 2 }, { event: 'Técnico designado', note: 'Carlos Silva', user: 'Local', ts: now - 86400000 * 2 + 900000 }],
      createdAt: now - 86400000 * 2, updatedAt: now },
    { id: `os_${now + 1}`, osNumber: 'OS-' + new Date().getFullYear() + '-0002', openedAt: now - 86400000 * 6, dueAt: now - 86400000, closedAt: now - 86400000 * 4,
      requester: 'Supervisor', technician: 'Maria Oliveira', priority: 'media', type: 'preventiva',
      assetId: '', equipment: 'Esteira Transportadora', patrimony: 'PAT-0042', sector: 'Expedição', location: 'Doca 1',
      failureDesc: 'Manutenção preventiva programada', diagnosis: 'Rolamentos com folga',
      rootCause: 'Ciclo preventivo', solution: 'Substituição de rolamentos e lubrificação', notes: 'Concluída no prazo', status: 'concluida',
      laborCost: 90, thirdpartyCost: 0, additionalCost: 0,
      materials: [{ id: 'm2', code: 'MEC-204', name: 'Rolamento 6204', category: 'Mecânica', qty: 2, unit: 'un', unitPrice: 32 }],
      photos: [], history: [{ event: 'Ordem criada', note: '', user: 'Local', ts: now - 86400000 * 6 }, { event: 'Status: concluida', note: '', user: 'Local', ts: now - 86400000 * 4 }],
      createdAt: now - 86400000 * 6, updatedAt: now - 86400000 * 4 }
  ];
  for (const o of demo) await save(STORES.WORK_ORDERS, o);
}

export async function renderOS() {
  await seedOSIfEmpty();
  let all = await getAll(STORES.WORK_ORDERS);
  all.sort((a, b) => b.openedAt - a.openedAt);
  const query = (q('os-search')?.value || '').toLowerCase();
  if (osTab !== 'all') all = all.filter(o => o.status === osTab);
  if (query) all = all.filter(o => [o.osNumber, o.equipment, o.sector, o.technician, o.requester, o.failureDesc].some(f => (f || '').toLowerCase().includes(query)));
  const list = q('os-list');
  if (!list) return;
  if (!all.length) { list.innerHTML = `<div class="empty-state"><p>Nenhuma ordem de serviço encontrada</p></div>`; return; }
  const now = Date.now();
  list.innerHTML = all.map(o => {
    const st = OS_STATUS[o.status] || OS_STATUS.aberta;
    const pr = OS_PRIO[o.priority] || OS_PRIO.media;
    const late = o.dueAt && o.status !== 'concluida' && o.status !== 'cancelada' && o.dueAt < now;
    return `<div class="mini-card" onclick="window.openOSDetail('${o.id}')">
      <div class="mc-icon" style="background:rgba(168,85,247,.12)">${pr.i}</div>
      <div class="mc-body">
        <div class="mc-title">${esc(o.osNumber)} — ${esc(o.equipment || 'Sem equipamento')}</div>
        <div class="mc-sub">${OS_TYPE[o.type] || esc(o.type)} · ${esc(o.sector || '—')} · ${dOnly(o.openedAt)}</div>
        <div class="mc-sub">${money(osTotal(o))}${late ? ' · <span style="color:var(--danger)">ATRASADA</span>' : ''}</div>
      </div>
      <span class="status-badge ${st.c}">${st.t}</span>
    </div>`;
  }).join('');
}

// ═══════════════ MODAL NOVA/EDITAR OS ═══════════════
export async function openOSModal(data) {
  if (!osCan('edit')) { toast('Sem permissão para editar OS'); return; }
  // Aceita o id (string), o objeto completo ou nada (nova OS)
  if (typeof data === 'string') data = await getById(STORES.WORK_ORDERS, data);
  data = data || null;
  q('os-edit-id').value = data?.id || '';
  q('modal-os-title').textContent = data ? '✏️ Editar OS' : '📋 Nova Ordem de Serviço';
  // popular ativos a partir dos produtos cadastrados
  const prods = await getAll(STORES.PRODUCTS);
  const sel = q('os-asset');
  sel.innerHTML = '<option value="">— Selecionar ativo cadastrado —</option>' +
    prods.map(p => `<option value="${p.id}" ${data?.assetId === p.id ? 'selected' : ''}>${esc(p.name)}${p.sku ? ' (' + esc(p.sku) + ')' : ''}</option>`).join('');
  const set = (id, v) => { const el = q(id); if (el) el.value = v; };
  set('os-type', data?.type || 'corretiva'); set('os-priority', data?.priority || 'media');
  set('os-patrimony', data?.patrimony || ''); set('os-sector', data?.sector || '');
  set('os-location', data?.location || ''); set('os-requester', data?.requester || '');
  set('os-tech', data?.technician || ''); set('os-status', data?.status || 'aberta');
  set('os-due', data?.dueAt ? new Date(data.dueAt).toISOString().split('T')[0] : '');
  set('os-failure', data?.failureDesc || ''); set('os-diagnosis', data?.diagnosis || '');
  set('os-rootcause', data?.rootCause || ''); set('os-solution', data?.solution || '');
  set('os-notes', data?.notes || ''); set('os-labor', data?.laborCost || 0);
  set('os-thirdparty', data?.thirdpartyCost || 0); set('os-additional', data?.additionalCost || 0);
  q('modal-os').classList.add('open');
}
export function closeOSModal() { q('modal-os')?.classList.remove('open'); }

export async function saveOS() {
  const editId = q('os-edit-id').value;
  const g = id => q(id)?.value ?? '';
  const assetSel = q('os-asset');
  const equipment = assetSel.value ? assetSel.options[assetSel.selectedIndex].text.replace(/\s*\(.*\)$/, '') : '';
  const dueStr = g('os-due');
  let o;
  if (editId) {
    o = await getById(STORES.WORK_ORDERS, editId);
    if (!o) { toast('OS não encontrada'); return; }
  } else {
    o = { id: `os_${Date.now()}`, osNumber: await nextOSNumber(), openedAt: Date.now(), closedAt: null, history: [], photos: [], materials: [], createdAt: Date.now() };
  }
  const prevStatus = o.status;
  Object.assign(o, {
    assetId: assetSel.value, equipment: equipment || o.equipment || '',
    type: g('os-type'), priority: g('os-priority'), patrimony: g('os-patrimony').trim(),
    sector: g('os-sector').trim(), location: g('os-location').trim(),
    requester: g('os-requester').trim(), technician: g('os-tech').trim(),
    dueAt: dueStr ? new Date(dueStr + 'T23:59').getTime() : null, status: g('os-status'),
    failureDesc: g('os-failure').trim(), diagnosis: g('os-diagnosis').trim(),
    rootCause: g('os-rootcause').trim(), solution: g('os-solution').trim(), notes: g('os-notes').trim(),
    laborCost: parseFloat(g('os-labor')) || 0, thirdpartyCost: parseFloat(g('os-thirdparty')) || 0,
    additionalCost: parseFloat(g('os-additional')) || 0, updatedAt: Date.now()
  });
  if (!editId) addTimeline(o, 'Ordem criada', 'OS ' + o.osNumber + ' aberta');
  if (editId && prevStatus !== o.status) {
    if (o.status === 'concluida') { if (!osCan('conclude')) { toast('Sem permissão para concluir OS'); return; } o.closedAt = Date.now(); }
    if (o.status === 'aguardando_aprovacao' && !osCan('edit')) { toast('Sem permissão'); return; }
    addTimeline(o, 'Status: ' + (OS_STATUS[o.status]?.t || o.status), '');
  }
  await save(STORES.WORK_ORDERS, o);
  closeOSModal(); toast('OS salva!'); renderOS();
  if (currentOSId === o.id) renderOSDetail();
}

// ═══════════════ DETALHE DA OS ═══════════════
export async function openOSDetail(id) {
  setCurrentOS(id); osDetailTab = 'info';
  document.querySelectorAll('#os-detail-tabs .tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  await renderOSDetail();
  q('os-detail-page').classList.add('open');
}
export function closeOSDetail() { q('os-detail-page')?.classList.remove('open'); setCurrentOS(null); renderOS(); }
export function setOSDetailTab(el, tab) {
  document.querySelectorAll('#os-detail-tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active'); osDetailTab = tab;
  ['info', 'timeline', 'photos', 'materials', 'costs'].forEach(t => {
    q('os-dtab-' + t).style.display = t === tab ? 'block' : 'none';
  });
}

export async function renderOSDetail() {
  const o = await getById(STORES.WORK_ORDERS, currentOSId);
  if (!o) return;
  const st = OS_STATUS[o.status] || OS_STATUS.aberta;
  q('os-detail-number').textContent = `${o.osNumber} · ${st.t}`;

  // INFO
  const f = (l, v) => `<div class="os-field"><label>${l}</label><span>${esc(v || '—')}</span></div>`;
  let assetHistHtml = '';
  if (o.assetId) {
    const others = (await getAll(STORES.WORK_ORDERS)).filter(x => x.assetId === o.assetId && x.id !== o.id);
    const acc = others.reduce((s, x) => s + osTotal(x), 0);
    assetHistHtml = `<div class="section-label" style="margin-top:10px">Histórico do Ativo</div>
      <div class="os-field" style="margin-bottom:8px"><label>Manutenções anteriores</label><span>${others.length} · Custo acumulado ${money(acc)}</span></div>
      ${others.slice(0, 5).map(x => `<div class="mini-card" onclick="window.openOSDetail('${x.id}')"><div class="mc-body"><div class="mc-title">${esc(x.osNumber)}</div><div class="mc-sub">${OS_TYPE[x.type]} · ${dOnly(x.openedAt)} · ${money(osTotal(x))}</div></div></div>`).join('')}`;
  }
  q('os-dtab-info').innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      <button class="btn btn-secondary" style="flex:1;padding:9px;font-size:.74rem" onclick="window.editCurrentOS()">✏️ Editar</button>
      <select onchange="window.changeOSStatus(this.value)" style="flex:1;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:9px;color:var(--text);font-family:var(--font-mono);font-size:.72rem">
        ${Object.entries(OS_STATUS).map(([k, v]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${v.t}</option>`).join('')}
      </select>
      ${osCan('delete') ? `<button class="btn btn-danger" style="padding:9px 12px;font-size:.74rem" onclick="window.deleteOS('${o.id}')">🗑️</button>` : ''}
    </div>
    <div class="os-field-grid">
      ${f('Tipo', OS_TYPE[o.type])}${f('Prioridade', (OS_PRIO[o.priority] || {}).t)}
      ${f('Abertura', dt(o.openedAt))}${f('Prevista', dOnly(o.dueAt))}
      ${f('Conclusão', dt(o.closedAt))}${f('Solicitante', o.requester)}
      ${f('Resp. Técnico', o.technician)}${f('Setor', o.sector)}
      ${f('Equipamento', o.equipment)}${f('Patrimônio', o.patrimony)}
      ${f('Localização', o.location)}${f('Custo Total', money(osTotal(o)))}
    </div>
    ${['failureDesc:Descrição da Falha', 'diagnosis:Diagnóstico', 'rootCause:Causa Raiz', 'solution:Solução Aplicada', 'notes:Observações']
      .map(p => { const [k, l] = p.split(':'); return o[k] ? `<div class="os-field" style="margin-bottom:8px"><label>${l}</label><span style="white-space:pre-wrap">${esc(o[k])}</span></div>` : ''; }).join('')}
    ${assetHistHtml}`;

  // TIMELINE
  const hist = (o.history || []).slice().sort((a, b) => a.ts - b.ts);
  q('os-dtab-timeline').innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <input id="os-tl-note" placeholder="Registrar andamento…" style="flex:1;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:9px;color:var(--text);font-family:var(--font-mono);font-size:.74rem">
      <button class="btn btn-primary" style="padding:9px 14px" onclick="window.addOSTimelineNote()">+</button>
    </div>
    ${hist.length ? hist.map(h => `<div class="os-tl-item"><div><div style="font-size:.78rem;font-weight:600">${esc(h.event)}</div>
      ${h.note ? `<div style="font-size:.72rem;color:var(--text2)">${esc(h.note)}</div>` : ''}
      <div style="font-size:.62rem;color:var(--text2)">${dt(h.ts)} · ${esc(h.user)}</div></div></div>`).join('') : '<div class="empty-state"><p>Sem eventos</p></div>'}`;

  // PHOTOS
  const ph = o.photos || [];
  const byPhase = p => ph.filter(x => x.phase === p);
  const galHtml = arr => arr.length ? `<div class="os-gallery">${arr.map(p => osMediaThumb(p)).join('')}</div>` : '<div style="font-size:.7rem;color:var(--text2);margin-bottom:8px">Nenhum item</div>';
  const before = byPhase('antes'), after = byPhase('depois');
  q('os-dtab-photos').innerHTML = `
    <button class="btn btn-primary" style="margin-bottom:12px;padding:9px;font-size:.76rem" onclick="window.openOSPhotoModal()">📷 Anexar Mídia</button>
    ${(before.length || after.length) ? `<div class="section-label">Comparação Antes × Depois</div>
      <div class="os-compare"><figure><img src="${before[0] ? before[0].url : ''}" onerror="this.style.opacity=.2"><figcaption>Antes</figcaption></figure>
      <figure><img src="${after[0] ? after[0].url : ''}" onerror="this.style.opacity=.2"><figcaption>Depois</figcaption></figure></div>` : ''}
    <div class="section-label">Antes</div>${galHtml(before)}
    <div class="section-label">Durante</div>${galHtml(byPhase('durante'))}
    <div class="section-label">Depois</div>${galHtml(after)}
    <div class="section-label">Vídeos / Documentos / Manuais</div>${galHtml([...byPhase('video'), ...byPhase('documento'), ...byPhase('manual')])}`;

  // MATERIALS
  const mats = o.materials || [];
  q('os-dtab-materials').innerHTML = `
    <button class="btn btn-primary" style="margin-bottom:12px;padding:9px;font-size:.76rem" onclick="window.openOSMaterialModal()">+ Adicionar Material</button>
    ${mats.length ? mats.map(m => `<div class="mini-card">
      <div class="mc-icon" style="background:rgba(0,200,255,.1)">🧰</div>
      <div class="mc-body"><div class="mc-title">${esc(m.name)} <span style="color:var(--text2);font-weight:400">×${m.qty} ${esc(m.unit || '')}</span></div>
      <div class="mc-sub">${esc(m.code || '')}${m.category ? ' · ' + esc(m.category) : ''} · ${money((Number(m.qty) || 0) * (Number(m.unitPrice) || 0))}</div></div>
      <button class="btn btn-danger" style="padding:4px 8px;font-size:.62rem" onclick="window.removeOSMaterial('${m.id}')">×</button>
    </div>`).join('') : '<div class="empty-state"><p>Nenhum material lançado</p></div>'}
    <div class="os-field" style="margin-top:8px"><label>Total de materiais</label><span>${money(osMaterialsTotal(o))}</span></div>`;

  // COSTS
  q('os-dtab-costs').innerHTML = `
    <div class="os-field-grid">
      ${f('Mão de obra', money(o.laborCost))}${f('Materiais', money(osMaterialsTotal(o)))}
      ${f('Terceiros', money(o.thirdpartyCost))}${f('Adicionais', money(o.additionalCost))}
    </div>
    <div class="stat-card" style="background:linear-gradient(135deg,rgba(168,85,247,.15),rgba(0,200,255,.12));border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
      <div style="font-size:.7rem;color:var(--text2);text-transform:uppercase">Custo Total da OS</div>
      <div style="font-family:var(--font-head);font-weight:800;font-size:1.8rem;color:var(--accent)">${money(osTotal(o))}</div>
    </div>`;
}

function osMediaThumb(p) {
  if ((p.mime || '').startsWith('video')) return `<video src="${p.url}" muted onclick="window.open('${p.url}','_blank')"></video>`;
  if ((p.mime || '').includes('pdf')) return `<div onclick="window.open('${p.url}','_blank')" style="aspect-ratio:1;background:var(--bg3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;cursor:pointer">📄</div>`;
  return `<img src="${p.url}" onclick="window.open('${p.url}','_blank')">`;
}

export async function editCurrentOS() { const o = await getById(STORES.WORK_ORDERS, currentOSId); openOSModal(o); }

export async function changeOSStatus(status) {
  const o = await getById(STORES.WORK_ORDERS, currentOSId); if (!o) return;
  if (status === 'concluida' && !osCan('conclude')) { toast('Sem permissão para concluir'); renderOSDetail(); return; }
  if (o.status === status) return;
  o.status = status; if (status === 'concluida') o.closedAt = Date.now(); o.updatedAt = Date.now();
  addTimeline(o, 'Status: ' + (OS_STATUS[status]?.t || status), '');
  await save(STORES.WORK_ORDERS, o); toast('Status atualizado'); renderOSDetail();
}

export async function addOSTimelineNote() {
  const inp = q('os-tl-note'); const note = inp.value.trim(); if (!note) return;
  const o = await getById(STORES.WORK_ORDERS, currentOSId); addTimeline(o, 'Andamento', note); o.updatedAt = Date.now();
  await save(STORES.WORK_ORDERS, o); renderOSDetail();
}

export async function deleteOS(id) {
  if (!osCan('delete')) { toast('Sem permissão para excluir'); return; }
  if (!confirm('Excluir esta ordem de serviço?')) return;
  await remove(STORES.WORK_ORDERS, id); closeOSDetail(); toast('OS excluída'); renderOS();
}

// ═══════════════ MATERIAIS (integração estoque) ═══════════════
export async function openOSMaterialModal() {
  const items = await getAll(STORES.STOCK);
  q('osmat-stock').innerHTML = '<option value="">— Material avulso —</option>' +
    items.map(i => `<option value="${i.id}" data-name="${esc(i.name)}" data-unit="${esc(i.unit || 'un')}">${esc(i.name)} (${i.qty} ${esc(i.unit || '')})</option>`).join('');
  ['osmat-code', 'osmat-cat', 'osmat-name'].forEach(id => { q(id).value = ''; });
  q('osmat-qty').value = 1; q('osmat-unit').value = 'un'; q('osmat-price').value = 0;
  q('modal-os-material').classList.add('open');
}
export function closeOSMaterialModal() { q('modal-os-material')?.classList.remove('open'); }
export function onOSMatStockChange() {
  const sel = q('osmat-stock'); const opt = sel.options[sel.selectedIndex];
  if (sel.value) { q('osmat-name').value = opt.dataset.name || ''; q('osmat-unit').value = opt.dataset.unit || 'un'; }
}

export async function saveOSMaterial() {
  const name = q('osmat-name').value.trim();
  if (!name) { toast('Nome obrigatório'); return; }
  const qty = parseFloat(q('osmat-qty').value) || 0;
  const stockId = q('osmat-stock').value;
  const o = await getById(STORES.WORK_ORDERS, currentOSId);
  const mat = {
    id: `mat_${Date.now()}`, stockId, code: q('osmat-code').value.trim(),
    category: q('osmat-cat').value.trim(), name,
    qty, unit: q('osmat-unit').value.trim() || 'un',
    unitPrice: parseFloat(q('osmat-price').value) || 0
  };
  // Baixa de estoque (movimentação registrada via recordMovement de stock.js)
  if (stockId) {
    const item = await getById(STORES.STOCK, stockId);
    if (item) {
      if ((item.qty || 0) < qty) { toast('Estoque insuficiente (' + item.qty + ' disp.)'); return; }
      item.qty = (item.qty || 0) - qty; item.updatedAt = Date.now(); await save(STORES.STOCK, item);
      recordMovement({ id: `mov_${Date.now()}`, itemId: stockId, itemName: item.name, type: 'saida', qty, reason: `Consumo OS ${o.osNumber}`, responsavel: o.technician || '', timestamp: Date.now() });
    }
  }
  o.materials = o.materials || []; o.materials.push(mat);
  addTimeline(o, 'Material adicionado', `${name} ×${qty}`); o.updatedAt = Date.now();
  await save(STORES.WORK_ORDERS, o);
  closeOSMaterialModal(); toast('Material adicionado'); renderOSDetail();
}

export async function removeOSMaterial(matId) {
  const o = await getById(STORES.WORK_ORDERS, currentOSId);
  const mat = (o.materials || []).find(m => m.id === matId); if (!mat) return;
  // devolve ao estoque
  if (mat.stockId) {
    const item = await getById(STORES.STOCK, mat.stockId);
    if (item) { item.qty = (item.qty || 0) + (Number(mat.qty) || 0); item.updatedAt = Date.now(); await save(STORES.STOCK, item); }
  }
  o.materials = o.materials.filter(m => m.id !== matId); o.updatedAt = Date.now();
  await save(STORES.WORK_ORDERS, o); toast('Material removido'); renderOSDetail();
}

// ═══════════════ FOTOS / ANEXOS ═══════════════
export function openOSPhotoModal() {
  osPhotoStaged = null; q('osphoto-file').value = '';
  q('osphoto-caption').value = ''; q('osphoto-preview').innerHTML = '';
  q('modal-os-photo').classList.add('open');
}
export function closeOSPhotoModal() { q('modal-os-photo')?.classList.remove('open'); }
export function onOSPhotoFile(input) {
  const file = input.files[0]; if (!file) return;
  if (file.size > 8 * 1024 * 1024) { toast('Arquivo muito grande (máx 8MB)'); input.value = ''; return; }
  const reader = new FileReader();
  reader.onload = e => {
    osPhotoStaged = { url: e.target.result, mime: file.type };
    const pv = q('osphoto-preview');
    if (file.type.startsWith('image')) pv.innerHTML = `<img src="${e.target.result}" style="width:100%;max-height:160px;object-fit:contain;border-radius:8px">`;
    else if (file.type.startsWith('video')) pv.innerHTML = `<video src="${e.target.result}" controls style="width:100%;max-height:160px;border-radius:8px"></video>`;
    else pv.innerHTML = `<div style="padding:14px;background:var(--bg3);border-radius:8px;font-size:.74rem">📄 ${esc(file.name)}</div>`;
  };
  reader.readAsDataURL(file);
}
export async function saveOSPhoto() {
  if (!osPhotoStaged) { toast('Selecione um arquivo'); return; }
  const o = await getById(STORES.WORK_ORDERS, currentOSId);
  o.photos = o.photos || [];
  o.photos.push({
    id: `ph_${Date.now()}`, phase: q('osphoto-phase').value,
    url: osPhotoStaged.url, mime: osPhotoStaged.mime, caption: q('osphoto-caption').value.trim(), ts: Date.now()
  });
  addTimeline(o, 'Mídia anexada', q('osphoto-phase').value); o.updatedAt = Date.now();
  await save(STORES.WORK_ORDERS, o); closeOSPhotoModal(); toast('Mídia anexada'); renderOSDetail();
}

// ═══════════════ DASHBOARD / KPIs ═══════════════
export async function computeKPIs() {
  const all = await getAll(STORES.WORK_ORDERS); const now = Date.now();
  const open = all.filter(o => o.status !== 'concluida' && o.status !== 'cancelada');
  const done = all.filter(o => o.status === 'concluida');
  const late = open.filter(o => o.dueAt && o.dueAt < now);
  // MTTR em horas
  const reparos = done.filter(o => o.closedAt && o.openedAt).map(o => (o.closedAt - o.openedAt) / 3600000);
  const mttr = reparos.length ? reparos.reduce((a, b) => a + b, 0) / reparos.length : 0;
  // MTBF: tempo médio entre falhas corretivas por equipamento
  const corr = {};
  all.filter(o => o.type === 'corretiva').forEach(o => { (corr[o.equipment || o.assetId || 'geral'] ??= []).push(o.openedAt); });
  let gaps = [];
  Object.values(corr).forEach(times => { times.sort((a, b) => a - b); for (let i = 1; i < times.length; i++) gaps.push((times[i] - times[i - 1]) / 3600000); });
  const mtbf = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  const disp = (mtbf + mttr) > 0 ? (mtbf / (mtbf + mttr)) * 100 : 100;
  return { total: all.length, open: open.length, done: done.length, late: late.length, mttr, mtbf, disp, all };
}

export async function renderOSDashboard() {
  const k = await computeKPIs();
  const card = (v, l, c) => `<div class="stat-card"><div class="stat-val ${c || ''}">${v}</div><div class="stat-label">${l}</div></div>`;
  const kpis = q('os-kpis');
  if (kpis) kpis.innerHTML =
    card(k.open, 'OS Abertas', 'warn') + card(k.done, 'Concluídas', '') + card(k.late, 'Atrasadas', 'danger') +
    card(k.mttr.toFixed(1) + 'h', 'MTTR', 'info') + card(k.mtbf.toFixed(0) + 'h', 'MTBF', 'purple') + card(k.disp.toFixed(0) + '%', 'Disponib.', '');
  if (typeof Chart === 'undefined') return;
  const css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  const palette = [css('--accent'), css('--accent2'), css('--accent3'), css('--accent4'), css('--accent5'), '#FF4466'];
  const mk = (id, type, labels, data, label) => {
    const ctx = q(id); if (!ctx) return;
    if (osCharts[id]) osCharts[id].destroy();
    osCharts[id] = new Chart(ctx, {
      type, data: { labels, datasets: [{ label, data, backgroundColor: type === 'line' ? 'transparent' : palette, borderColor: palette[1], borderWidth: 2, fill: false, tension: .3 }] },
      options: { responsive: true, plugins: { legend: { display: type === 'doughnut', labels: { color: css('--text2'), font: { size: 10 } } } }, scales: type === 'doughnut' ? {} : { x: { ticks: { color: css('--text2'), font: { size: 9 } } }, y: { ticks: { color: css('--text2'), font: { size: 9 } } } } }
    });
  };
  // Custos por mês
  const months = {}; k.all.forEach(o => { const d = new Date(o.openedAt); const key = `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`; months[key] = (months[key] || 0) + osTotal(o); });
  mk('os-chart-costs', 'line', Object.keys(months), Object.values(months), 'Custo (R$)');
  // Falhas por tipo
  const types = {}; k.all.forEach(o => types[OS_TYPE[o.type] || o.type] = (types[OS_TYPE[o.type] || o.type] || 0) + 1);
  mk('os-chart-type', 'doughnut', Object.keys(types), Object.values(types), 'OS');
  // Falhas por setor
  const sectors = {}; k.all.forEach(o => { const s = o.sector || 'Sem setor'; sectors[s] = (sectors[s] || 0) + 1; });
  mk('os-chart-sector', 'bar', Object.keys(sectors), Object.values(sectors), 'OS');
  // Custo por equipamento
  const equips = {}; k.all.forEach(o => { const e = o.equipment || 'Sem equip.'; equips[e] = (equips[e] || 0) + osTotal(o); });
  mk('os-chart-equip', 'bar', Object.keys(equips), Object.values(equips), 'Custo (R$)');
  // Consumo de materiais
  const matc = {}; k.all.forEach(o => (o.materials || []).forEach(m => matc[m.name] = (matc[m.name] || 0) + (Number(m.qty) || 0)));
  mk('os-chart-mat', 'bar', Object.keys(matc), Object.values(matc), 'Qtd');
}

// ═══════════════ EXPORTAÇÃO (CSV / PDF) ═══════════════
export async function exportOS(fmt) {
  const all = (await getAll(STORES.WORK_ORDERS)).sort((a, b) => b.openedAt - a.openedAt);
  const header = ['OS', 'Tipo', 'Prioridade', 'Status', 'Equipamento', 'Setor', 'Solicitante', 'Técnico', 'Abertura', 'Prevista', 'Conclusão', 'Custo Total'];
  const rows = all.map(o => [o.osNumber, OS_TYPE[o.type] || o.type, (OS_PRIO[o.priority] || {}).t, (OS_STATUS[o.status] || {}).t, o.equipment, o.sector, o.requester, o.technician, dt(o.openedAt), dOnly(o.dueAt), dt(o.closedAt), osTotal(o).toFixed(2)]);
  if (fmt === 'csv') { downloadCSV('ordens-servico.csv', [header, ...rows]); return; }
  const body = `<table><thead><tr>${header.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  printHTML('Relatório de Ordens de Serviço', body);
}

export async function printOS(id) {
  const o = await getById(STORES.WORK_ORDERS, id || currentOSId); if (!o) return;
  const row = (l, v) => `<tr><th style="width:30%">${l}</th><td>${esc(v || '—')}</td></tr>`;
  const mats = (o.materials || []).map(m => `<tr><td>${esc(m.name)}</td><td>${m.qty} ${esc(m.unit || '')}</td><td>${money(m.unitPrice)}</td><td>${money((m.qty || 0) * (m.unitPrice || 0))}</td></tr>`).join('');
  const tl = (o.history || []).map(h => `<tr><td>${dt(h.ts)}</td><td>${esc(h.event)}</td><td>${esc(h.note || '')}</td><td>${esc(h.user)}</td></tr>`).join('');
  printHTML('Ordem de Serviço ' + o.osNumber, `
    <table>${row('OS', o.osNumber)}${row('Tipo', OS_TYPE[o.type])}${row('Prioridade', (OS_PRIO[o.priority] || {}).t)}${row('Status', (OS_STATUS[o.status] || {}).t)}
    ${row('Equipamento', o.equipment)}${row('Patrimônio', o.patrimony)}${row('Setor', o.sector)}${row('Localização', o.location)}
    ${row('Solicitante', o.requester)}${row('Técnico', o.technician)}${row('Abertura', dt(o.openedAt))}${row('Prevista', dOnly(o.dueAt))}${row('Conclusão', dt(o.closedAt))}
    ${row('Descrição da Falha', o.failureDesc)}${row('Diagnóstico', o.diagnosis)}${row('Causa Raiz', o.rootCause)}${row('Solução', o.solution)}${row('Observações', o.notes)}</table>
    <h1 style="font-size:14px;margin-top:16px">Materiais</h1><table><tr><th>Material</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr>${mats || '<tr><td colspan=4>—</td></tr>'}</table>
    <h1 style="font-size:14px;margin-top:16px">Custos</h1><table>${row('Mão de obra', money(o.laborCost))}${row('Materiais', money(osMaterialsTotal(o)))}${row('Terceiros', money(o.thirdpartyCost))}${row('Adicionais', money(o.additionalCost))}${row('TOTAL', money(osTotal(o)))}</table>
    <h1 style="font-size:14px;margin-top:16px">Andamento</h1><table><tr><th>Data</th><th>Evento</th><th>Obs.</th><th>Usuário</th></tr>${tl || '<tr><td colspan=4>—</td></tr>'}</table>`);
}
