/**
 * Suppliers API Routes
 * R2C-Scan v2.0
 */
import { Router } from 'express';
import { suppliers as suppService } from '../services/supabaseService.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const data = await suppService.getAll();
  res.json({ data, total: data.length });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const data = await suppService.getById(req.params.id);
  res.json({ data });
}));

router.post('/', verifyToken, asyncHandler(async (req, res) => {
  const data = await suppService.create(req.body);
  res.status(201).json({ data, message: 'Fornecedor criado com sucesso' });
}));

router.put('/:id', verifyToken, asyncHandler(async (req, res) => {
  const data = await suppService.update(req.params.id, req.body);
  res.json({ data, message: 'Fornecedor atualizado com sucesso' });
}));

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  await suppService.delete(req.params.id);
  res.json({ message: 'Fornecedor excluído com sucesso' });
}));

export default router;