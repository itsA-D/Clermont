import express from 'express';
import {
    getActivePlans,
    createPlan,
    updatePlan,
    getPlanById,
    listPlans,
    createPrice,
    listProducts,
    createProduct
} from '../db/queries.js';

const router = express.Router();

/**
 * GET /api/plans
 * List plans. Defaults to active-only, supports including inactive via query:
 *   - ?includeInactive=true  -> return all plans (active + inactive)
 *   - ?active=false          -> return all plans (active + inactive)
 */
router.get('/', async (req, res, next) => {
    try {
        const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
        const activeParam = req.query.active;
        const onlyActive = includeInactive ? false : (typeof activeParam !== 'undefined' ? String(activeParam).toLowerCase() !== 'false' : true);

        const plans = onlyActive ? await getActivePlans() : await listPlans(false);
        res.json(plans);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/plans/:id
 * Get a single plan by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const plan = await getPlanById(req.params.id);

        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        res.json(plan);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/plans
 * Create a new plan (admin)
 */
router.post('/', async (req, res, next) => {
    try {
        const { name, description, price, duration_days, total_capacity } = req.body;

        // Validation
        if (!name || !price || !duration_days || !total_capacity) {
            return res.status(400).json({
                error: 'Missing required fields: name, description, price, duration_days, total_capacity'
            });
        }

        if (price < 0) {
            return res.status(400).json({ error: 'Price must be non-negative' });
        }

        if (duration_days <= 0) {
            return res.status(400).json({ error: 'Duration must be positive' });
        }

        if (total_capacity <= 0) {
            return res.status(400).json({ error: 'Total capacity must be positive' });
        }

        const plan = await createPlan({ name, description, price, duration_days, total_capacity });

        // Auto-create a corresponding price for this plan
        try {
            // Get or create a default product for plan prices
            let products = await listProducts();
            let defaultProduct = products.find(p => p.name === 'Subscription Plans');

            if (!defaultProduct) {
                defaultProduct = await createProduct({
                    name: 'Subscription Plans',
                    description: 'Auto-generated product for subscription plans',
                    active: true
                });
            }

            await createPrice({
                product_id: defaultProduct.id,
                plan_id: plan.id,
                currency: 'usd',
                unit_amount: Math.round(price * 100), // Convert to cents
                recurring_interval: 'month',
                interval_count: 1,
                type: 'recurring',
                active: true
            });
        } catch (priceError) {
            console.error('Failed to create price for plan:', priceError);
            // Don't fail the plan creation if price creation fails
        }

        res.status(201).json(plan);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/plans/:id
 * Update a plan (admin)
 */
router.put('/:id', async (req, res, next) => {
    try {
        const { name, description, price, duration_days, total_capacity, is_active } = req.body;

        // Validation
        if (price !== undefined && price < 0) {
            return res.status(400).json({ error: 'Price must be non-negative' });
        }

        if (duration_days !== undefined && duration_days <= 0) {
            return res.status(400).json({ error: 'Duration must be positive' });
        }

        if (total_capacity !== undefined && total_capacity <= 0) {
            return res.status(400).json({ error: 'Total capacity must be positive' });
        }

        const plan = await updatePlan(req.params.id, {
            name,
            description,
            price,
            duration_days,
            total_capacity,
            is_active
        });

        res.json(plan);
    } catch (error) {
        if (error.message === 'Plan not found') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Cannot reduce capacity below current subscriptions') {
            return res.status(400).json({ error: error.message });
        }
        next(error);
    }
});

export default router;
