/**
 * R2C-Scan — Captura por IA (módulo 8b da migração)
 * Porte do captureAndAnalyze/aiAnalyzeImage que viviam inline no index.html,
 * adaptado ao scanner novo (html5-qrcode). aiAnalyzeImage hoje é um STUB local
 * (sem IA real) — é o ponto de plug para uma IA futura.
 */
import toast from '../utils/toast.js';
import { getAll, STORES } from '../utils/db.js';
import { captureFrame } from '../scanner.js';
import { openDetail, openAddModal } from './products.js';
import { state } from '../app.js';

// Análise local (placeholder, privacy-first — sem chave de API exposta).
function analyzeImageLocally(_imageBase64) {
  return {
    nome: 'Produto detectado', categoria: 'Geral',
    descricao: 'Produto capturado pela câmera', confianca: 'media',
    sugestao_sku: `SKU-${Date.now().toString(36).toUpperCase()}`
  };
}

// Hook de análise. Trocar por chamada a backend/serviço quando houver IA real.
async function aiAnalyzeImage(imageBase64) {
  return analyzeImageLocally(imageBase64);
}

export async function captureAndAnalyze() {
  const imageBase64 = captureFrame();
  if (!imageBase64) { toast('Câmera não ativa'); return; }

  const status = document.getElementById('ai-status');
  const statusTitle = document.getElementById('ai-status-title');
  const statusDesc = document.getElementById('ai-status-desc');
  status.classList.add('show');
  statusTitle.textContent = 'Analisando imagem…';
  statusDesc.textContent = 'Identificando o objeto capturado';

  try {
    const parsed = await aiAnalyzeImage(imageBase64);
    if (parsed && parsed.confianca !== 'baixa') {
      statusTitle.textContent = '✓ Objeto identificado!';
      statusDesc.textContent = `${parsed.nome} — ${parsed.confianca === 'alta' ? 'Alta confiança' : 'Confiança média'}`;
      const all = await getAll(STORES.PRODUCTS);
      const found = all.find(p =>
        p.name.toLowerCase().includes(parsed.nome.toLowerCase()) ||
        parsed.nome.toLowerCase().includes(p.name.toLowerCase()) ||
        (p.category && p.category.toLowerCase() === parsed.categoria.toLowerCase())
      );
      if (found) {
        setTimeout(() => openDetail(found, true), 800);
      } else {
        statusDesc.textContent += ' — Não encontrado no catálogo';
        if (state.isAdmin) {
          setTimeout(() => {
            document.getElementById('f-name').value = parsed.nome;
            document.getElementById('f-cat').value = parsed.categoria;
            document.getElementById('f-desc').value = parsed.descricao;
            document.getElementById('f-sku').value = parsed.sugestao_sku || '';
            openAddModal();
          }, 1200);
        }
      }
    } else {
      statusTitle.textContent = 'Não foi possível identificar';
      statusDesc.textContent = 'Tente uma foto mais nítida';
    }
  } catch (e) {
    status.classList.remove('show');
    toast('Erro na análise');
  }
}
