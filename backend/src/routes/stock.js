/**
 * Stock API Routes
 * R2C-Scan v2.0
 */
import { Router } from 'express';
import { stock as stockService, movements as movService } from '../services/supabaseService.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const data = await stockService.getAll();
  res.json({ data, total: data.length });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const data = await stockService.getById(req.params.id);
  res.json({ data });
}));

router.post('/', verifyToken, asyncHandler(async (req, res) => {
  const data = await stockService.create(req.body);
  res.status(201).json({ data, message: 'Item de estoque criado com sucesso' });
}));

router.put('/:id', verifyToken, asyncHandler(async (req, res) => {
  const data = await stockService.update(req.params.id, req.body);
  res.json({ data, message: 'Item de estoque atualizado com sucesso' });
}));

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  await stockService.delete(req.params.id);
  res.json({ message: 'Item de estoque excluído com sucesso' });
}));

// Movements
router.get('/movements/list', asyncHandler(async (req, res) => {
  const data = await movService.getAll();
  res.json({ data, total: data.length });
}));

router.post('/movements', verifyToken, asyncHandler(async (req, res) => {
  const data = await movService.create(req.body);
  res.status(201).json({ data, message: 'Movimentação registrada com sucesso' });
}));

export default router;