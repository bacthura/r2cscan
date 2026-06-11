/**
 * Work Orders (Ordens de Serviço) API Routes
 * Módulo de Manutenção Industrial — R2C-Scan v2.1
 * Aditivo: não altera rotas existentes.
 */
import { Router } from 'express';
import { workOrders as woService, purchases as purchaseService, stock as stockService, movements as movementService } from '../services/supabaseService.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// ── Ordens de Serviço ──────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const data = await woService.getAll(req.query);
  res.json({ data, total: data.length });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const data = await woService.getById(req.params.id);
  res.json({ data });
}));

router.post('/', verifyToken, asyncHandler(async (req, res) => {
  const data = await woService.create(req.body);
  await woService.addHistory(data.id, {
    event: 'Ordem criada', note: `OS ${data.os_number} aberta`,
    username: req.body.createdBy || 'sistema'
  });
  res.status(201).json({ data, message: 'Ordem de serviço criada' });
}));

router.put('/:id', verifyToken, asyncHandler(async (req, res) => {
  const before = await woService.getById(req.params.id).catch(() => null);
  const data = await woService.update(req.params.id, req.body);
  // Registra mudança de status na timeline
  if (req.body.status && before && before.status !== req.body.status) {
    await woService.addHistory(req.params.id, {
      event: `Status: ${req.body.status}`, note: req.body.statusNote || '',
      username: req.body.updatedBy || 'sistema'
    });
  }
  res.json({ data, message: 'Ordem de serviço atualizada' });
}));

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  await woService.delete(req.params.id);
  res.json({ message: 'Ordem de serviço excluída' });
}));

// ── Timeline / Andamento ───────────────────────────────────────────
router.post('/:id/history', verifyToken, asyncHandler(async (req, res) => {
  const data = await woService.addHistory(req.params.id, req.body);
  res.status(201).json({ data });
}));

// ── Materiais (baixa automática de estoque) ────────────────────────
router.post('/:id/materials', verifyToken, asyncHandler(async (req, res) => {
  const m = req.body;
  const data = await woService.addMaterial(req.params.id, m);
  // Baixa de estoque + movimentação, se vinculado a um item
  if (m.stockId) {
    try {
      const item = await stockService.getById(m.stockId);
      if (item) {
        const newQty = Math.max(0, (item.quantity || 0) - (m.quantity || 0));
        await stockService.update(m.stockId, { ...item, qty: newQty, min: item.min_quantity, obs: item.notes });
        await movementService.create({
          id: `mov_${Date.now()}`, itemId: m.stockId, itemName: item.name,
          type: 'saida', qty: m.quantity, reason: `Consumo OS ${req.params.id}`
        });
      }
    } catch (_) { /* estoque opcional */ }
  }
  res.status(201).json({ data });
}));

router.delete('/:id/materials/:materialId', verifyToken, asyncHandler(async (req, res) => {
  await woService.removeMaterial(req.params.materialId);
  res.json({ message: 'Material removido' });
}));

// ── Fotos / Anexos ─────────────────────────────────────────────────
router.post('/:id/photos', verifyToken, asyncHandler(async (req, res) => {
  const data = await woService.addPhoto(req.params.id, req.body);
  res.status(201).json({ data });
}));

router.delete('/:id/photos/:photoId', verifyToken, asyncHandler(async (req, res) => {
  await woService.removePhoto(req.params.photoId);
  res.json({ message: 'Anexo removido' });
}));

// ── Lista de compras / requisições ─────────────────────────────────
router.get('/purchases/list', asyncHandler(async (req, res) => {
  const data = await purchaseService.getAll(req.query.status);
  res.json({ data, total: data.length });
}));

router.post('/purchases/list', verifyToken, asyncHandler(async (req, res) => {
  const data = await purchaseService.create(req.body);
  res.status(201).json({ data });
}));

router.put('/purchases/:id', verifyToken, asyncHandler(async (req, res) => {
  const data = await purchaseService.update(req.params.id, req.body);
  res.json({ data });
}));

router.delete('/purchases/:id', verifyToken, asyncHandler(async (req, res) => {
  await purchaseService.delete(req.params.id);
  res.json({ message: 'Requisição removida' });
}));

export default router;
