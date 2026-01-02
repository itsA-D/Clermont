import express from 'express';
import { adminAuth, adminRateLimit } from '../middleware/adminAuth.js';
import { createProduct, listProducts, updateProduct } from '../db/queries.js';

const router = express.Router();

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const onlyActive = (req.query.active ?? 'true') !== 'false';
    const products = await listProducts(onlyActive);
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// POST /api/products (admin)
router.post('/', adminRateLimit, adminAuth, async (req, res, next) => {
  try {
    const { name, description, active } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing required field: name' });
    const product = await createProduct(name, description ?? null, active ?? true);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id (admin)
router.put('/:id', adminRateLimit, adminAuth, async (req, res, next) => {
  try {
    const product = await updateProduct(req.params.id, req.body || {});
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

export default router;
