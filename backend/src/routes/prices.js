import express from 'express';
import { adminAuth, adminRateLimit } from '../middleware/adminAuth.js';
import { createPrice, listPrices, updatePrice } from '../db/queries.js';

const router = express.Router();

// GET /api/prices
router.get('/', async (req, res, next) => {
  try {
    const productId = req.query.productId || req.query.product_id || null;
    const prices = await listPrices(productId);
    res.json(prices);
  } catch (err) {
    next(err);
  }
});

// POST /api/prices (admin)
router.post('/', adminRateLimit, adminAuth, async (req, res, next) => {
  try {
    const { product_id, currency = 'usd', unit_amount, recurring_interval = 'month', interval_count = 1, type = 'recurring', active = true, plan_id = null } = req.body || {};
    if (!product_id) return res.status(400).json({ error: 'Missing required field: product_id' });
    if (unit_amount === undefined) return res.status(400).json({ error: 'Missing required field: unit_amount' });
    const price = await createPrice({ product_id, currency, unit_amount, recurring_interval, interval_count, type, active, plan_id });
    res.status(201).json(price);
  } catch (err) {
    next(err);
  }
});

// PUT /api/prices/:id (admin)
router.put('/:id', adminRateLimit, adminAuth, async (req, res, next) => {
  try {
    const updated = await updatePrice(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ error: 'Price not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
