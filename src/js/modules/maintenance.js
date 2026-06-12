/**
 * R2C-Scan — Módulo de Manutenção (simples) + Calendário
 * Módulo 5 da migração (ver MIGRATION-GUIDE.md)
 * Fonte da verdade: index.html (~linhas 2059-2236). index.html intocado.
 * Cards passaram do JSON.stringify no onclick para o padrão id-string
 * (openMaintModal resolve via banco), igual aos módulos 2-4.
 */
import { getAll, getById, save, STORES } from '../utils/db.js';
import toast from '../utils/toast.js';
import { escapeHTML, q } from '../utils/format.js';
import { state } from '../app.js';

// ─── Ganchos para funções que ainda vivem no app.js (renderHome) ───
const hooks = {};
export function registerMaintHooks(map) { Object.assign(hooks, map); }
function safeCall(name, ...args) {
  if (typeof hooks[name] === 'function') return hooks[name](...args);
  if (typeof window[name] === 'function') return window[name](...args);
}

// ═══════════════ MODAL NOVA/EDITAR ═══════════════
export async function openMaintModal(data) {
  // Aceita o id (string) ou o objeto completo — resolve via banco quando for id
  if (typeof data === 'string') data = await getById(STORES.MAINTENANCE, data);
  const editId = q('maint-edit-id');
  if (editId) editId.value = data?.id || '';
  const title = q('modal-maint-title');
  if (title) title.textContent = data ? '✏️ Editar Manutenção' : '🔧 Nova Manutenção';
  setVal('m-name', data?.name);
  setVal('m-type', data?.type || 'Preventiva');
  setVal('m-priority', data?.priority || 'media');
  setVal('m-date', data?.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  setVal('m-time', data?.time || '08:00');
  setVal('m-desc', data?.desc);
  setVal('m-tech', data?.tech);
  setVal('m-recurrence', data?.recurrence || 'none');
  const checklist = q('maint-checklist');
  if (checklist) {
    checklist.innerHTML = '';
    if (data?.checklist) data.checklist.forEach(item => addCheckItem(item.text, item.done));
    else addCheckItem();
  }
  q('modal-maint')?.classList.add('open');
}

export function closeMaintModal() { q('modal-maint')?.classList.remove('open'); }

export function addCheckItem(text = '', done = false) {
  const div = document.createElement('div');
  div.className = 'maint-check-item';
  div.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center';
  div.innerHTML = `<input type="checkbox" ${done ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent);flex-shrink:0">
    <input type="text" value="${escapeHTML(text)}" placeholder="Item do checklist" class="m-check-input" style="flex:1;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-family:var(--font-mono);font-size:.72rem;outline:none">
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--danger);font-size:1.1rem;cursor:pointer;flex-shrink:0">×</button>`;
  q('maint-checklist')?.appendChild(div);
}

export async function saveMaint() {
  const name = (q('m-name')?.value || '').trim();
  if (!name) { toast('Nome do equipamento obrigatório', 'error'); return; }
  const editId = q('maint-edit-id')?.value || '';
  const id = editId || `maint_${Date.now()}`;
  const checklistItems = [];
  document.querySelectorAll('#maint-checklist .maint-check-item').forEach(div => {
    const text = div.querySelector('.m-check-input')?.value.trim();
    const done = div.querySelector('input[type="checkbox"]')?.checked || false;
    if (text) checklistItems.push({ text, done });
  });
  const dateStr = q('m-date')?.value || '';
  const timeStr = q('m-time')?.value || '08:00';
  const date = new Date(`${dateStr}T${timeStr}`).getTime();
  const old = editId ? await getById(STORES.MAINTENANCE, id) : null;
  const raw = {
    id, name,
    type: q('m-type')?.value || 'Preventiva',
    priority: q('m-priority')?.value || 'media',
    date, time: timeStr,
    desc: (q('m-desc')?.value || '').trim(),
    tech: (q('m-tech')?.value || '').trim(),
    recurrence: q('m-recurrence')?.value || 'none',
    checklist: checklistItems,
    status: old?.status || 'pending',
    createdAt: old?.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  await save(STORES.MAINTENANCE, raw);
  closeMaintModal();
  toast('Manutenção salva!', 'success');
  renderMaint();
  if (state.currentPage === 'page-home') safeCall('renderHome');

  if (!editId && raw.recurrence !== 'none') scheduleRecurrence(raw);
}

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

export async function updateMaintStatus(id, status) {
  const item = await getById(STORES.MAINTENANCE, id);
  if (!item) return;
  item.status = status;
  item.updatedAt = Date.now();
  await save(STORES.MAINTENANCE, item);
  toast(`Status alterado para: ${status}`, 'success');
  renderMaint();
  if (state.currentPage === 'page-home') safeCall('renderHome');
  if (state.currentPage === 'page-maint-calendar') renderMaintCalendar();
}

// ═══════════════ LISTA ═══════════════
export function setMaintTab(el, tab) {
  document.querySelectorAll('#maint-tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  state.maintTab = tab;
  renderMaint();
}

export async function renderMaint() {
  let all = await getAll(STORES.MAINTENANCE);
  all.sort((a, b) => b.date - a.date);
  if (state.maintTab !== 'all') all = all.filter(m => m.status === state.maintTab);

  const list = q('maint-list');
  if (!list) return;
  if (all.length === 0) {
    list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg><p>Nenhuma manutenção encontrada</p></div>`;
    return;
  }
  list.innerHTML = all.map(m => {
    const statusClass = { pending: 'warn', inprogress: 'info', done: 'ok' };
    const statusText = { pending: 'Pendente', inprogress: 'Em Andamento', done: 'Concluída' };
    const prioIcon = m.priority === 'critica' ? '🔴' : m.priority === 'alta' ? '🟠' : m.priority === 'media' ? '🟡' : '🟢';
    const doneCount = m.checklist ? m.checklist.filter(c => c.done).length : 0;
    const totalCount = m.checklist ? m.checklist.length : 0;
    return `<div class="mini-card">
      <div class="mc-icon" style="background:rgba(0,200,255,.1)">${prioIcon}</div>
      <div class="mc-body" onclick="window.openMaintModal('${m.id}')">
        <div class="mc-title">${escapeHTML(m.name)}</div>
        <div class="mc-sub">${escapeHTML(m.type)} — ${new Date(m.date).toLocaleString('pt-BR')}${m.tech ? ' · ' + escapeHTML(m.tech) : ''}</div>
        ${totalCount > 0 ? `<div class="mc-sub">Checklist: ${doneCount}/${totalCount}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
        <span class="status-badge ${statusClass[m.status] || 'warn'}">${statusText[m.status] || 'Pendente'}</span>
        <div style="display:flex;gap:4px">
          <button onclick="event.stopPropagation();window.updateMaintStatus('${m.id}','inprogress')" style="background:none;border:1px solid var(--border);border-radius:5px;padding:3px 6px;font-size:.6rem;cursor:pointer;color:var(--accent2)">▶</button>
          <button onclick="event.stopPropagation();window.updateMaintStatus('${m.id}','done')" style="background:none;border:1px solid var(--border);border-radius:5px;padding:3px 6px;font-size:.6rem;cursor:pointer;color:var(--accent)">✓</button>
          <button onclick="event.stopPropagation();window.openMaintModal('${m.id}')" style="background:none;border:1px solid var(--border);border-radius:5px;padding:3px 6px;font-size:.6rem;cursor:pointer;color:var(--text2)">✏️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

/** Card compacto usado pela Home (renderHome do app.js importa daqui) */
export function maintMiniCardHTML(m) {
  const statusText = { pending: 'Pendente', inprogress: 'Em Andamento', done: 'Concluída' };
  const statusClass = { pending: 'warn', inprogress: 'info', done: 'ok' };
  return `<div class="mini-card" onclick="goPage('page-maint')">
    <div class="mc-icon" style="background:${m.priority === 'critica' || m.priority === 'alta' ? 'rgba(255,68,102,.1)' : 'rgba(0,200,255,.1)'}">
      ${m.priority === 'critica' || m.priority === 'alta' ? '⚠️' : '🔧'}
    </div>
    <div class="mc-body">
      <div class="mc-title">${escapeHTML(m.name)}</div>
      <div class="mc-sub">${escapeHTML(m.type)} — ${new Date(m.date).toLocaleDateString('pt-BR')}</div>
    </div>
    <span class="status-badge ${statusClass[m.status] || 'warn'}">${statusText[m.status] || 'Pendente'}</span>
  </div>`;
}

// ═══════════════ CALENDÁRIO ═══════════════
export function prevMaintMonth() {
  state.maintCalendarDate.setMonth(state.maintCalendarDate.getMonth() - 1);
  renderMaintCalendar();
}

export function nextMaintMonth() {
  state.maintCalendarDate.setMonth(state.maintCalendarDate.getMonth() + 1);
  renderMaintCalendar();
}

export async function renderMaintCalendar() {
  const year = state.maintCalendarDate.getFullYear();
  const month = state.maintCalendarDate.getMonth();
  const label = q('maint-month-label');
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
  const gridEl = q('maint-calendar-grid');
  if (gridEl) gridEl.innerHTML = grid;
}

export async function showMaintDay(dateStr) {
  const all = await getAll(STORES.MAINTENANCE);
  const dayMaints = all.filter(m => new Date(m.date).toISOString().split('T')[0] === dateStr);
  const list = q('maint-day-list');
  if (!list) return;
  if (dayMaints.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>Nenhuma manutenção agendada para ${new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR')}</p></div>`;
    return;
  }
  list.innerHTML = dayMaints.map(m => `<div class="mini-card" onclick="window.openMaintModal('${m.id}')">
    <div class="mc-icon" style="background:rgba(0,200,255,.1)">🔧</div>
    <div class="mc-body">
      <div class="mc-title">${escapeHTML(m.name)}</div>
      <div class="mc-sub">${escapeHTML(m.type)} · ${escapeHTML(m.tech || 'Sem técnico')}</div>
    </div>
    <span class="status-badge ${m.status === 'done' ? 'ok' : m.status === 'inprogress' ? 'info' : 'warn'}">${m.status === 'done' ? 'Concluída' : m.status === 'inprogress' ? 'Em Andamento' : 'Pendente'}</span>
  </div>`).join('');
}

// Helper local de formulário (mesmo padrão dos módulos anteriores)
function setVal(id, val) {
  const el = q(id);
  if (el) el.value = val ?? '';
}
