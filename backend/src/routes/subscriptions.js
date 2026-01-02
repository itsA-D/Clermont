import express from 'express';
import {
    purchaseSubscription,
    cancelSubscription,
    getCustomerById,
    listSubscriptions,
    changeSubscriptionPlan
} from '../db/queries.js';
import { adminAuth, adminRateLimit } from '../middleware/adminAuth.js';

const router = express.Router();

/**
 * GET /api/subscriptions
 * Optional query: ?customerId=<uuid>
 * Admin-only when ADMIN_AUTH_ENABLED=true
 */
router.get('/', adminRateLimit, adminAuth, async (req, res, next) => {
    try {
        const customerId = req.query.customerId || req.query.customer_id || null;
        const subs = await listSubscriptions(customerId || null);
        res.json(subs);
    } catch (error) {
        next(error);
    }
});

/**
 * Purchase handler used by multiple routes
 */
const purchaseHandler = async (req, res, next) => {
    try {
        // Support both camelCase and snake_case keys
        const customerId = req.body.customerId || req.body.customer_id;
        const planId = req.body.planId || req.body.plan_id;
        const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotency_key || null;

        // Validation
        if (!customerId || !planId) {
            return res.status(400).json({
                error: 'Missing required fields: customerId, planId'
            });
        }

        // Verify customer exists
        const customer = await getCustomerById(customerId);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const subscription = await purchaseSubscription(customerId, planId, idempotencyKey);
        res.status(201).json(subscription);

    } catch (error) {
        if (error.message === 'Plan not found or inactive') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Plan is at capacity') {
            return res.status(409).json({ error: error.message });
        }
        if (error.message === 'Customer already has an active subscription to this plan') {
            return res.status(400).json({ error: error.message });
        }
        if (error.message === 'Idempotency key conflict') {
            return res.status(409).json({ error: error.message });
        }
        next(error);
    }
};

/**
 * POST /api/subscriptions
 */
router.post('/', purchaseHandler);

/**
 * POST /api/subscriptions/purchase
 */
router.post('/purchase', purchaseHandler);

/**
 * POST /api/subscriptions/:id/change-plan
 * Body: { targetPlanId }
 * Admin-only when ADMIN_AUTH_ENABLED=true
 */
router.post('/:id/change-plan', adminRateLimit, adminAuth, async (req, res, next) => {
    try {
        const subscriptionId = req.params.id;
        const targetPlanId = req.body.targetPlanId || req.body.target_plan_id;
        const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotency_key || null;

        if (!targetPlanId) {
            return res.status(400).json({ error: 'Missing required field: targetPlanId' });
        }

        const result = await changeSubscriptionPlan(subscriptionId, targetPlanId, idempotencyKey);
        res.json(result);
    } catch (error) {
        if (error.message === 'Subscription not found') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Subscription not active' || error.message === 'Subscription already on target plan') {
            return res.status(400).json({ error: error.message });
        }
        if (error.message === 'Plan not found or inactive') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Plan is at capacity') {
            return res.status(409).json({ error: error.message });
        }
        if (error.message === 'Idempotency key conflict') {
            return res.status(409).json({ error: error.message });
        }
        next(error);
    }
});

/**
 * DELETE /api/subscriptions/:id
 * Cancel a subscription
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const subscription = await cancelSubscription(req.params.id);
        res.json(subscription);
    } catch (error) {
        if (error.message === 'Subscription not found') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Subscription is already cancelled') {
            return res.status(400).json({ error: error.message });
        }
        next(error);
    }
});

export default router;
