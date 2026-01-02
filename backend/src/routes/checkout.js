import express from 'express';
import { createCheckoutSession, getCheckoutSession, completeCheckoutSession } from '../db/queries.js';

const router = express.Router();

// POST /api/checkout-sessions
router.post('/', async (req, res, next) => {
  try {
    const customerId = req.body.customerId || req.body.customer_id;
    const priceId = req.body.priceId || req.body.price_id;
    if (!customerId || !priceId) {
      return res.status(400).json({ error: 'Missing required fields: customerId, priceId' });
    }
    const session = await createCheckoutSession(customerId, priceId);
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

// GET /api/checkout-sessions/:id
router.get('/:id', async (req, res, next) => {
  try {
    const session = await getCheckoutSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Checkout session not found' });
    res.json(session);
  } catch (err) {
    next(err);
  }
});

// POST /api/checkout-sessions/:id/complete
router.post('/:id/complete', async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotency_key || null;
    const session = await completeCheckoutSession(req.params.id, idempotencyKey);
    res.json(session);
  } catch (err) {
    if (err.message === 'Checkout session not found' || err.message === 'Price not found') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === 'Price not linked to plan') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
