/**
 * R2C-Scan — Utilitários de formatação e DOM
 * Módulo 0 da migração (ver MIGRATION-GUIDE.md)
 * Funções puras, sem estado. Nomes originais mantidos (money, dt, esc…)
 * porque os módulos 1-7 já os chamam por esses nomes.
 */

/** Formata número como moeda BRL: 1245 → "R$ 1.245,00" */
export function money(v) {
  return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Data+hora pt-BR a partir de timestamp; "—" quando vazio */
export function dt(ts) {
  return ts ? new Date(ts).toLocaleString('pt-BR') : '—';
}

/** Só a data pt-BR a partir de timestamp; "—" quando vazio */
export function dOnly(ts) {
  return ts ? new Date(ts).toLocaleDateString('pt-BR') : '—';
}

/** Escapa HTML para interpolação segura em template strings */
export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Alias — app.js usa este nome em ~20 chamadas */
export const escapeHTML = esc;

/** Atalho para document.getElementById */
export function q(id) {
  return document.getElementById(id);
}

/** Mostra/esconde elemento por id */
export function show(id, visible = true, display = 'block') {
  const el = q(id);
  if (el) el.style.display = visible ? display : 'none';
}
