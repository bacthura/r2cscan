/**
 * R2C-Scan — Utilitários de exportação (CSV / impressão-PDF)
 * Criado no módulo 4 da migração; compartilhado por Compras (4), OS (6)
 * e Relatórios (7) — NÃO duplicar esta lógica nos módulos.
 * Fonte da verdade: index.html (~linhas 3654-3664).
 */

/** Baixa um CSV (separador ';', BOM UTF-8 p/ Excel). rows = array de arrays. */
export function downloadCSV(filename, rows) {
  const csv = '﻿' + rows.map(r => r.map(c => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Abre janela de impressão (caminho do "exportar PDF") com o HTML informado. */
export function printHTML(title, bodyHtml) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#eee}</style></head><body><h1>${title}</h1>${bodyHtml}<script>onload=()=>{print()}<\/script></body></html>`);
  w.document.close();
}
