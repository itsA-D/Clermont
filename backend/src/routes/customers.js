import express from 'express';
import {
    getCustomersWithSubscriptions,
    createCustomer
} from '../db/queries.js';

const router = express.Router();

/**
 * GET /api/customers
 * List all customers with their subscriptions
 */
router.get('/', async (req, res, next) => {
    try {
        const customers = await getCustomersWithSubscriptions();
        res.json(customers);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/customers
 * Create a new customer (for testing)
 */
router.post('/', async (req, res, next) => {
    try {
        const { email, name } = req.body;

        // Validation
        if (!email || !name) {
            return res.status(400).json({
                error: 'Missing required fields: email, name'
            });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const customer = await createCustomer(email, name);
        res.status(201).json(customer);
    } catch (error) {
        // Handle unique constraint violation for email
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        next(error);
    }
});

export default router;
