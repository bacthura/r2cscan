/**
 * R2C-Scan — Módulo de Relatórios + extras
 * Módulo 7 da migração (ver MIGRATION-GUIDE.md). Diferente dos anteriores:
 * NÃO é um port do index.html — é a extração do que já vivia no app.js.
 * computeKPIs/exportOS/printOS (workorders.js) e downloadCSV/printHTML
 * (export.js) já foram migrados; aqui ficam os relatórios de
 * produtos/manutenção/estoque, export/import de dados e os extras de UI.
 */
import { getAll, save, STORES } from '../utils/db.js';
import toast from '../utils/toast.js';
import { escapeHTML } from '../utils/format.js';
import { state } from '../app.js';
import { renderCatalog } from './products.js';

// ─── Gancho: renderHome ainda vive no app.js ───
const hooks = {};
export function registerReportsHooks(map) { Object.assign(hooks, map); }
function safeCall(name, ...args) {
  if (typeof hooks[name] === 'function') return hooks[name](...args);
  if (typeof window[name] === 'function') return window[name](...args);
}

// ═══════════════ TEMA ═══════════════
export function toggleTheme() {
  state.isLight = !state.isLight;
  document.body.classList.toggle('light-theme', state.isLight);
  localStorage.setItem('r2c-theme', state.isLight ? 'light' : 'dark');
}

// ═══════════════ BUSCA POR VOZ ═══════════════
export function startVoiceSearch() {
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
}

// ═══════════════ RELATÓRIOS ═══════════════
export function setReportsTab(el, tab) {
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
}

export async function renderReports() {
  if (!state.chartsInitialized) { state.chartsInitialized = true; renderProdReports(); }
  renderMaintReports();
  renderStockReports();
}

async function renderProdReports() {
  if (typeof Chart === 'undefined') return;
  const all = await getAll(STORES.PRODUCTS);
  const cats = {};
  all.forEach(p => { const c = p.category || 'Geral'; cats[c] = (cats[c] || 0) + 1; });

  const catCtx = document.getElementById('chart-categories')?.getContext('2d');
  if (catCtx) {
    if (state.myCharts.catChart) state.myCharts.catChart.destroy();
    state.myCharts.catChart = new Chart(catCtx, {
      type: 'doughnut',
      data: { labels: Object.keys(cats), datasets: [{ data: Object.values(cats), backgroundColor: ['#00F5A0', '#00C8FF', '#FF6B35', '#A855F7', '#F59E0B', '#FF4466', '#34D399', '#60A5FA'] }] },
      options: { plugins: { legend: { display: false } }, responsive: true }
    });
  }

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

// ═══════════════ EXPORT / IMPORT DE DADOS ═══════════════
export async function exportData(format) {
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
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(input) {
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
      safeCall('renderHome');
      if (state.currentPage === 'page-catalog') renderCatalog();
    } catch (err) {
      toast('Erro ao importar: formato inválido', 'error');
    }
    input.value = '';
  };
  reader.readAsText(input.files[0]);
}
