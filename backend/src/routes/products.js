/**
 * Products API Routes
 * R2C-Scan v2.0
 */
import { Router } from 'express';
import { products as productsService } from '../services/supabaseService.js';
import { verifyToken, requireAdmin, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/products - List all products
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { search, category } = req.query;
  let data;
  if (search) {
    data = await productsService.search(search);
  } else {
    data = await productsService.getAll();
  }
  if (category) {
    data = data.filter(p => p.category?.toLowerCase() === category.toLowerCase());
  }
  res.json({ data, total: data.length });
}));

// GET /api/products/:id - Get single product
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const data = await productsService.getById(req.params.id);
  res.json({ data });
}));

// POST /api/products - Create product
router.post('/', verifyToken, asyncHandler(async (req, res) => {
  const data = await productsService.create(req.body);
  res.status(201).json({ data, message: 'Produto criado com sucesso' });
}));

// PUT /api/products/:id - Update product
router.put('/:id', verifyToken, asyncHandler(async (req, res) => {
  const data = await productsService.update(req.params.id, req.body);
  res.json({ data, message: 'Produto atualizado com sucesso' });
}));

// DELETE /api/products/:id - Delete product
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  await productsService.delete(req.params.id);
  res.json({ message: 'Produto excluído com sucesso' });
}));

export default router;