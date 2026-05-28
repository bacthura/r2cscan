/**
 * Maintenance API Routes
 * R2C-Scan v2.0
 */
import { Router } from 'express';
import { maintenance as maintService } from '../services/supabaseService.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { status } = req.query;
  let data = await maintService.getAll();
  if (status && status !== 'all') {
    data = data.filter(m => m.status === status);
  }
  res.json({ data, total: data.length });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const data = await maintService.getById(req.params.id);
  res.json({ data });
}));

router.post('/', verifyToken, asyncHandler(async (req, res) => {
  const data = await maintService.create(req.body);
  res.status(201).json({ data, message: 'Manutenção criada com sucesso' });
}));

router.put('/:id', verifyToken, asyncHandler(async (req, res) => {
  const data = await maintService.update(req.params.id, req.body);
  res.json({ data, message: 'Manutenção atualizada com sucesso' });
}));

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  await maintService.delete(req.params.id);
  res.json({ message: 'Manutenção excluída com sucesso' });
}));

export default router;