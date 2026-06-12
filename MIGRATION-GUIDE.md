# GUIA DE MIGRAÇÃO — R2C-Scan

> **LEIA ESTE ARQUIVO INTEIRO ANTES DE QUALQUER MUDANÇA.**
> Este documento é a fonte da verdade. Se algo que eu pedir contradisser
> este guia, PARE e me avise antes de continuar.

---

## 1. CONTEXTO

O app tem HOJE dois frontends:

- `index.html` (≈3700 linhas, ~2360 de JS inline) → **é o que está NO AR e funciona.**
- `src/js/` (módulos ES organizados) → **é o DESTINO. Está incompleto (~20-30%).**

Decisão tomada: **terminar a migração para `src/js/` e aposentar o `index.html` só no FINAL.**

A base em `src/js/` já está pronta e é boa — NÃO reescrever:
- `src/js/utils/db.js` (IndexedDB)
- `src/js/utils/toast.js`
- `src/js/utils/api.js`
- `src/js/utils/firebaseAuth.js`
- `src/js/scanner.js` (já usa html5-qrcode — moderno, NÃO trocar por jsQR)
- `src/js/app.js` e `src/js/main.js` (estrutura inicial — expandir, não recriar)

---

## 2. REGRAS INVIOLÁVEIS

1. **NUNCA** adicionar lógica nova dentro do `index.html`. Ele está congelado.
2. **NUNCA** migrar mais de UM módulo por vez. Um módulo = uma sessão = uma entrega.
3. O app DEVE continuar funcionando ao fim de cada módulo. Se quebrar, reverter.
4. **NÃO** reescrever os arquivos da base listados acima.
5. **NÃO** trocar bibliotecas (manter html5-qrcode, manter Supabase no backend).
6. **NÃO** apagar o `index.html` até o último módulo estar migrado e testado.
7. Sempre mostrar o diff e esperar minha aprovação antes de salvar.
8. Código novo em português OU inglês — escolher UM padrão e manter. (Sugestão: nomes de função em inglês, textos de tela em português.)
9. Toda função migrada deve ser `export`ada do seu módulo e importada onde for usada — nada de variáveis globais soltas.

---

## 3. ORDEM DE MIGRAÇÃO (do mais simples ao mais entrelaçado)

Migrar nesta ordem. NÃO pular etapas.

- [x] **0. Utilitários** → `src/js/utils/format.js` ✅ 2026-06-12
      (money, dt, dOnly, esc/escapeHTML, q, show — funções puras pequenas;
       corrigiu de quebra o escapeHTML defeituoso do app.js)
- [ ] **1. Produtos** → `src/js/modules/products.js`
      (openAddModal, saveProduct, editProduct, deleteCurrentProduct,
       duplicateProduct, openDetailById, renderCatalog, setFilter, setSort)
- [ ] **2. Estoque** → `src/js/modules/stock.js`
      (openStockModal, saveStockItem, openMovementModal, saveMovement,
       setStockTab, toggleMovementFields)
- [ ] **3. Fornecedores** → `src/js/modules/suppliers.js`
      (openSupplierModal, saveSupplier, closeSupplierModal)
- [ ] **4. Compras** → `src/js/modules/purchases.js`
      (generatePurchaseList, cyclePurchase, renderPurchases, exportPurchases)
- [ ] **5. Manutenção** → `src/js/modules/maintenance.js`
      (openMaintModal, saveMaint, setMaintTab, showMaintDay, nextMaintMonth,
       prevMaintMonth, updateMaintStatus, nextMaintMonth)
- [ ] **6. Ordens de Serviço (MAIOR — ~30 funções)** → `src/js/modules/workorders.js`
      (tudo que começa com OS / os: openOSModal, saveOS, renderOS,
       renderOSDashboard, renderOSDetail, changeOSStatus, addOSTimelineNote,
       openOSMaterialModal, saveOSMaterial, removeOSMaterial, osTotal, etc.)
- [ ] **7. Relatórios + extras** → `src/js/modules/reports.js`
      (computeKPIs, renderReports, setReportsTab, downloadCSV, exportData,
       importData, exportOS, printOS, printHTML, startVoiceSearch, toggleTheme)
- [ ] **8. FINAL** → trocar o `<script>` inline do index.html por
      `<script type="module" src="/src/js/main.js"></script>`,
      testar tudo, e SÓ ENTÃO apagar o JS antigo do index.html.

---

## 4. PROCEDIMENTO PARA CADA MÓDULO (sempre o mesmo)

1. Ler as funções do módulo dentro do `index.html` (não alterar lá).
2. Criar o arquivo novo em `src/js/modules/<nome>.js`.
3. Copiar as funções para lá, ajustando:
   - trocar acesso a IndexedDB direto pelos helpers de `utils/db.js`
   - trocar `toast(...)` solto pelo import de `utils/toast.js`
   - exportar todas as funções públicas
4. Importar o módulo em `src/js/app.js` e ligar aos eventos da tela.
5. Mostrar o diff. Esperar aprovação.
6. Eu testo manualmente a tela correspondente.
7. Marcar o checkbox aqui no MIGRATION-GUIDE.md.

---

## 5. LIMPEZAS SEPARADAS (NÃO misturar com a migração)

Fazer só DEPOIS, em sessões próprias:
- Remover `index.html.bak`, pasta `backups/`.
- Garantir que `node_modules/` está no `.gitignore` (não versionar).
- Remover dependências não usadas do `package.json` raiz
  (firebase / react-router-dom / react-hot-toast NÃO são usadas pelo app atual — confirmar antes).
- Decidir destino da pasta `invite-codes/` (app React separado).
- Decidir hospedagem final (hoje: backend no Render + frontend mirando Vercel).
