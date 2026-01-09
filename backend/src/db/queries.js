import pool from './pool.js';
import { v4 as uuidv4 } from 'uuid';

async function logAudit(eventType, {
    idempotencyKey = null,
    customerId = null,
    planId = null,
    subscriptionId = null,
    message = null,
    metadata = null,
    errorCode = null,
    statusCode = null
} = {}, executor = pool) {
    const query = `
      INSERT INTO audit_logs (
        event_type, request_idempotency_key, customer_id, plan_id, subscription_id,
        message, metadata, error_code, status_code
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `;
    await executor.query(query, [
        eventType,
        idempotencyKey,
        customerId,
        planId,
        subscriptionId,
        message,
        metadata ? JSON.stringify(metadata) : null,
        errorCode,
        statusCode
    ]);
}

// ===================== AUTH HELPERS =====================
export async function getUserByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    return rows[0] || null;
}

export async function getUserById(id) {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
}

export async function createUser({ email, passwordHash, name = null }) {
    const q = `INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING *`;
    const { rows } = await pool.query(q, [email.toLowerCase(), passwordHash, name]);
    return rows[0];
}

export async function linkCustomerToUser(userId, email, name = null) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Try find existing customer by email
        const { rows: custRows } = await client.query('SELECT * FROM customers WHERE email = $1 FOR UPDATE', [email.toLowerCase()]);
        let customer;
        if (custRows.length > 0) {
            customer = custRows[0];
            if (!customer.user_id) {
                await client.query('UPDATE customers SET user_id = $1 WHERE id = $2', [userId, customer.id]);
                customer.user_id = userId;
            }
        } else {
            const insert = await client.query('INSERT INTO customers (email, name, user_id) VALUES ($1,$2,$3) RETURNING *', [email.toLowerCase(), name || email.split('@')[0], userId]);
            customer = insert.rows[0];
        }
        await client.query('COMMIT');
        return customer;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function getCustomerByUserId(userId) {
    const { rows } = await pool.query('SELECT * FROM customers WHERE user_id = $1', [userId]);
    return rows[0] || null;
}

export async function createProduct(name, description = null, active = true) {
    const q = `INSERT INTO products (name, description, active) VALUES ($1,$2,$3) RETURNING *`;
    const { rows } = await pool.query(q, [name, description, active]);
    return rows[0];
}

export async function listProducts(onlyActive = true) {
    const q = onlyActive ? `SELECT * FROM products WHERE active = true ORDER BY created_at DESC` : `SELECT * FROM products ORDER BY created_at DESC`;
    const { rows } = await pool.query(q);
    return rows;
}

export async function updateProduct(id, data) {
    const { name, description, active } = data;
    const q = `
      UPDATE products
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          active = COALESCE($3, active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    const { rows } = await pool.query(q, [name, description, active, id]);
    return rows[0];
}

export async function createPrice(data) {
    const { product_id, currency = 'usd', unit_amount, recurring_interval = 'month', interval_count = 1, type = 'recurring', active = true, plan_id = null } = data;
    const q = `
      INSERT INTO prices (product_id, plan_id, currency, unit_amount, recurring_interval, interval_count, type, active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `;
    const { rows } = await pool.query(q, [product_id, plan_id, currency, unit_amount, recurring_interval, interval_count, type, active]);
    return rows[0];
}

export async function listPrices(productId = null) {
    if (productId) {
        const { rows } = await pool.query(`SELECT * FROM prices WHERE product_id = $1 AND active = true ORDER BY created_at DESC`, [productId]);
        return rows;
    }
    const { rows } = await pool.query(`SELECT * FROM prices WHERE active = true ORDER BY created_at DESC`);
    return rows;
}

export async function updatePrice(id, data) {
    const { currency, unit_amount, recurring_interval, interval_count, type, active, plan_id } = data;
    const q = `
      UPDATE prices
      SET currency = COALESCE($1, currency),
          unit_amount = COALESCE($2, unit_amount),
          recurring_interval = COALESCE($3, recurring_interval),
          interval_count = COALESCE($4, interval_count),
          type = COALESCE($5, type),
          active = COALESCE($6, active),
          plan_id = COALESCE($7, plan_id)
      WHERE id = $8
      RETURNING *
    `;
    const { rows } = await pool.query(q, [currency, unit_amount, recurring_interval, interval_count, type, active, plan_id, id]);
    return rows[0];
}

export async function createCheckoutSession(customerId, priceId) {
    const q = `
      INSERT INTO checkout_sessions (customer_id, price_id, status, url)
      VALUES ($1, $2, 'open', $3)
      RETURNING *
    `;
    const url = `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/#/checkout/`;
    const { rows } = await pool.query(q, [customerId, priceId, url]);
    return rows[0];
}

export async function getCheckoutSession(id) {
    const { rows } = await pool.query(`SELECT * FROM checkout_sessions WHERE id = $1`, [id]);
    return rows[0];
}

export async function completeCheckoutSession(sessionId, idempotencyKey = null) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { rows: sessRows } = await client.query(`SELECT * FROM checkout_sessions WHERE id = $1 FOR UPDATE`, [sessionId]);
        if (sessRows.length === 0) {
            throw new Error('Checkout session not found');
        }
        const session = sessRows[0];
        if (session.status === 'complete') {
            return session;
        }
        const { rows: priceRows } = await client.query(`SELECT * FROM prices WHERE id = $1`, [session.price_id]);
        if (priceRows.length === 0) {
            throw new Error('Price not found');
        }
        const price = priceRows[0];
        if (!price.plan_id) {
            throw new Error('Price not linked to plan');
        }

        const sub = await purchaseSubscription(session.customer_id, price.plan_id, idempotencyKey || sessionId);

        await client.query(`
          UPDATE checkout_sessions
          SET status = 'complete', url = NULL, completed_at = NOW(), subscription_id = $2
          WHERE id = $1
        `, [sessionId, sub.id]);

        await client.query('COMMIT');
        await logAudit('checkout_session_completed', { subscriptionId: sub.id });
        const refreshed = await getCheckoutSession(sessionId);
        return refreshed;
    } catch (err) {
        await client.query('ROLLBACK');
        await logAudit('checkout_session_failed', { message: err.message });
        throw err;
    } finally {
        client.release();
    }
}
/**
 * List subscriptions, optionally filtered by customer
 */
export async function listSubscriptions(customerId = null) {
    const base = `
      SELECT 
        s.id,
        s.customer_id,
        s.plan_id,
        s.status,
        s.purchased_at,
        s.cancelled_at,
        s.expires_at,
        c.name AS customer_name,
        c.email AS customer_email,
        p.name AS plan_name,
        p.price AS plan_price,
        p.duration_days
      FROM subscriptions s
      JOIN customers c ON c.id = s.customer_id
      JOIN plans p ON p.id = s.plan_id
    `;
    const order = ' ORDER BY s.purchased_at DESC';
    if (customerId) {
        const { rows } = await pool.query(base + ' WHERE s.customer_id = $1' + order, [customerId]);
        return rows;
    }
    const { rows } = await pool.query(base + order);
    return rows;
}

/**
 * Change a subscription's plan (upgrade/downgrade)
 * Cancels the current active subscription and creates a new active one on target plan.
 * Adjusts capacities atomically. Supports optional idempotency key returning existing result.
 */
export async function changeSubscriptionPlan(subscriptionId, targetPlanId, idempotencyKey = null) {
    // If idempotency key provided, return existing result if present
    if (idempotencyKey) {
        const existing = await pool.query(`
          SELECT s.*, p.name AS plan_name, p.price AS plan_price, p.duration_days
          FROM subscriptions s
          JOIN plans p ON p.id = s.plan_id
          WHERE s.idempotency_key = $1
        `, [idempotencyKey]);
        if (existing.rows.length > 0) {
            const row = existing.rows[0];
            if (row.plan_id !== targetPlanId) {
                const err = new Error('Idempotency key conflict');
                err.statusCode = 409;
                throw err;
            }
            return row;
        }
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await logAudit('change_plan_started', {
            idempotencyKey,
            subscriptionId,
            planId: targetPlanId
        });

        // Lock subscription row
        const subRes = await client.query(`
          SELECT id, customer_id, plan_id, status
          FROM subscriptions
          WHERE id = $1
          FOR UPDATE
        `, [subscriptionId]);
        if (subRes.rows.length === 0) {
            throw new Error('Subscription not found');
        }
        const sub = subRes.rows[0];
        if (sub.status !== 'active') {
            throw new Error('Subscription not active');
        }
        if (sub.plan_id === targetPlanId) {
            throw new Error('Subscription already on target plan');
        }

        // Lock plans in deterministic order to avoid deadlocks
        const ordered = [sub.plan_id, targetPlanId].sort();
        const plans = new Map();
        for (const pid of ordered) {
            const q = `
              SELECT id, name, price, duration_days, remaining_capacity, is_active
              FROM plans
              WHERE id = $1
              FOR UPDATE
            `;
            const { rows } = await client.query(q, [pid]);
            if (rows.length === 0) {
                throw new Error('Plan not found or inactive');
            }
            plans.set(pid, rows[0]);
        }
        const currentPlan = plans.get(sub.plan_id);
        const targetPlan = plans.get(targetPlanId);
        if (!targetPlan.is_active) {
            throw new Error('Plan not found or inactive');
        }
        if (targetPlan.remaining_capacity <= 0) {
            throw new Error('Plan is at capacity');
        }

        // Cancel current subscription and restore capacity
        await client.query(`
          UPDATE subscriptions
          SET status = 'cancelled', cancelled_at = NOW()
          WHERE id = $1
        `, [subscriptionId]);
        await client.query(`
          UPDATE plans
          SET remaining_capacity = remaining_capacity + 1
          WHERE id = $1
        `, [sub.plan_id]);

        // Create new subscription on target plan
        const newId = uuidv4();
        const purchasedAt = new Date();
        const expiresAt = new Date(purchasedAt.getTime() + targetPlan.duration_days * 24 * 60 * 60 * 1000);
        const newSubRes = await client.query(`
          INSERT INTO subscriptions (id, customer_id, plan_id, status, purchased_at, expires_at, idempotency_key)
          VALUES ($1, $2, $3, 'active', $4, $5, $6)
          RETURNING *
        `, [newId, sub.customer_id, targetPlanId, purchasedAt, expiresAt, idempotencyKey]);

        // Decrement capacity on target plan
        await client.query(`
          UPDATE plans
          SET remaining_capacity = remaining_capacity - 1
          WHERE id = $1
        `, [targetPlanId]);

        await client.query('COMMIT');

        await logAudit('change_plan_succeeded', {
            idempotencyKey,
            planId: targetPlanId,
            subscriptionId: newId
        });

        return {
            ...newSubRes.rows[0],
            plan_name: targetPlan.name,
            plan_price: targetPlan.price
        };

    } catch (error) {
        await client.query('ROLLBACK');
        // If duplicate idempotency key in concurrent calls
        if (error.code === '23505' && idempotencyKey) {
            const { rows } = await pool.query(`
              SELECT s.*, p.name AS plan_name, p.price AS plan_price, p.duration_days
              FROM subscriptions s
              JOIN plans p ON p.id = s.plan_id
              WHERE s.idempotency_key = $1
            `, [idempotencyKey]);
            if (rows.length > 0) {
                const row = rows[0];
                if (row.plan_id !== targetPlanId) {
                    const err = new Error('Idempotency key conflict');
                    err.statusCode = 409;
                    await logAudit('change_plan_failed', {
                        idempotencyKey,
                        subscriptionId,
                        planId: targetPlanId,
                        message: err.message,
                        errorCode: error.code || null,
                        statusCode: err.statusCode
                    });
                    throw err;
                }
                await logAudit('change_plan_succeeded', {
                    idempotencyKey,
                    subscriptionId: row.id,
                    planId: row.plan_id
                });
                return row;
            }
        }

        await logAudit('change_plan_failed', {
            idempotencyKey,
            subscriptionId,
            planId: targetPlanId,
            message: error.message,
            errorCode: error.code || null,
            statusCode: error.statusCode || null
        });
        throw error;
    } finally {
        client.release();
    }
}
/**
 * Get all active plans with their details
 */
export async function getActivePlans() {
    const query = `
    SELECT id, name, description, price, duration_days, 
           total_capacity, remaining_capacity, is_active, created_at
    FROM plans
    WHERE is_active = true
    ORDER BY price ASC
  `;

    const result = await pool.query(query);
    return result.rows;
}

// List plans with optional inclusion of inactive ones (for admin views)
export async function listPlans(onlyActive = true) {
    const query = onlyActive
        ? `SELECT id, name, description, price, duration_days,
                  total_capacity, remaining_capacity, is_active, created_at
           FROM plans
           WHERE is_active = true
           ORDER BY price ASC`
        : `SELECT id, name, description, price, duration_days,
                  total_capacity, remaining_capacity, is_active, created_at
           FROM plans
           ORDER BY price ASC`;
    const result = await pool.query(query);
    return result.rows;
}

/**
 * Get a single plan by ID
 */
export async function getPlanById(planId) {
    const query = `
    SELECT id, name, description, price, duration_days, 
           total_capacity, remaining_capacity, is_active
    FROM plans
    WHERE id = $1
  `;

    const result = await pool.query(query, [planId]);
    return result.rows[0];
}

/**
 * Purchase a subscription with atomic capacity update
 * Uses row-level locking to prevent race conditions
 */
export async function purchaseSubscription(customerId, planId, idempotencyKey = null) {
    if (idempotencyKey) {
        const existingQuery = `
          SELECT s.*, p.name as plan_name, p.price as plan_price
          FROM subscriptions s
          JOIN plans p ON p.id = s.plan_id
          WHERE s.idempotency_key = $1
        `;
        const existing = await pool.query(existingQuery, [idempotencyKey]);
        if (existing.rows.length > 0) {
            const row = existing.rows[0];
            if (row.customer_id !== customerId || row.plan_id !== planId) {
                const err = new Error('Idempotency key conflict');
                err.statusCode = 409;
                throw err;
            }
            return row;
        }
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await logAudit('purchase_started', {
            idempotencyKey,
            customerId,
            planId
        });

        // Lock the plan row and check capacity
        const planQuery = `
      SELECT id, name, price, duration_days, remaining_capacity, is_active
      FROM plans
      WHERE id = $1 AND is_active = true
      FOR UPDATE
    `;
        const planResult = await client.query(planQuery, [planId]);

        if (planResult.rows.length === 0) {
            throw new Error('Plan not found or inactive');
        }

        const plan = planResult.rows[0];

        if (plan.remaining_capacity <= 0) {
            throw new Error('Plan is at capacity');
        }

        // Check if customer already has an active subscription to this plan
        const existingSubQuery = `
      SELECT id FROM subscriptions
      WHERE customer_id = $1 AND plan_id = $2 AND status = 'active'
    `;
        const existingSubResult = await client.query(existingSubQuery, [customerId, planId]);

        if (existingSubResult.rows.length > 0) {
            const err = new Error('You have already subscribed to this plan.');
            err.statusCode = 409;
            throw err;
        }

        // Create subscription
        const subscriptionId = uuidv4();
        const purchasedAt = new Date();
        const expiresAt = new Date(purchasedAt.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);

        const insertSubQuery = `
      INSERT INTO subscriptions (id, customer_id, plan_id, status, purchased_at, expires_at, idempotency_key)
      VALUES ($1, $2, $3, 'active', $4, $5, $6)
      RETURNING *
    `;
        const subResult = await client.query(insertSubQuery, [
            subscriptionId,
            customerId,
            planId,
            purchasedAt,
            expiresAt,
            idempotencyKey
        ]);

        // Decrement plan capacity
        const updatePlanQuery = `
      UPDATE plans
      SET remaining_capacity = remaining_capacity - 1
      WHERE id = $1
      RETURNING remaining_capacity
    `;
        await client.query(updatePlanQuery, [planId]);

        await client.query('COMMIT');

        await logAudit('purchase_succeeded', {
            idempotencyKey,
            customerId,
            planId,
            subscriptionId: subscriptionId
        });

        return {
            ...subResult.rows[0],
            plan_name: plan.name,
            plan_price: plan.price
        };

    } catch (error) {
        await client.query('ROLLBACK');
        // If a duplicate key happened due to concurrent idempotent requests, fetch and return existing
        if (error.code === '23505' && idempotencyKey) {
            const retryQuery = `
              SELECT s.*, p.name as plan_name, p.price as plan_price
              FROM subscriptions s
              JOIN plans p ON p.id = s.plan_id
              WHERE s.idempotency_key = $1
            `;
            const { rows } = await pool.query(retryQuery, [idempotencyKey]);
            if (rows.length > 0) {
                const row = rows[0];
                if (row.customer_id !== customerId || row.plan_id !== planId) {
                    const err = new Error('Idempotency key conflict');
                    err.statusCode = 409;
                    await logAudit('purchase_failed', {
                        idempotencyKey,
                        customerId,
                        planId,
                        message: err.message,
                        errorCode: error.code || null,
                        statusCode: err.statusCode
                    });
                    throw err;
                }
                await logAudit('purchase_succeeded', {
                    idempotencyKey,
                    customerId,
                    planId,
                    subscriptionId: row.id
                });
                return row;
            }
        }
        await logAudit('purchase_failed', {
            idempotencyKey,
            customerId,
            planId,
            message: error.message,
            errorCode: error.code || null,
            statusCode: error.statusCode || null
        });
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Cancel a subscription and restore plan capacity
 */
export async function cancelSubscription(subscriptionId) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get subscription details
        const subQuery = `
      SELECT id, plan_id, status
      FROM subscriptions
      WHERE id = $1
      FOR UPDATE
    `;
        const subResult = await client.query(subQuery, [subscriptionId]);

        if (subResult.rows.length === 0) {
            throw new Error('Subscription not found');
        }

        const subscription = subResult.rows[0];

        if (subscription.status === 'cancelled') {
            throw new Error('Subscription is already cancelled');
        }

        // Update subscription status
        const updateSubQuery = `
      UPDATE subscriptions
      SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
        const result = await client.query(updateSubQuery, [subscriptionId]);

        // Restore plan capacity
        const updatePlanQuery = `
      UPDATE plans
      SET remaining_capacity = remaining_capacity + 1
      WHERE id = $1
    `;
        await client.query(updatePlanQuery, [subscription.plan_id]);

        await client.query('COMMIT');

        await logAudit('cancel_succeeded', {
            subscriptionId,
            planId: subscription.plan_id
        });

        return result.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        await logAudit('cancel_failed', {
            subscriptionId,
            message: error.message,
            errorCode: error.code || null
        });
        throw error;
    } finally {
        client.release();
    }
}

export async function expireExpiredSubscriptions(batchSize = 100) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const selectQuery = `
          SELECT id, plan_id
          FROM subscriptions
          WHERE status = 'active' AND expires_at <= NOW()
          FOR UPDATE SKIP LOCKED
          LIMIT $1
        `;
        const { rows } = await client.query(selectQuery, [batchSize]);

        for (const row of rows) {
            const updateSub = `
              UPDATE subscriptions
              SET status = 'cancelled', cancelled_at = NOW()
              WHERE id = $1
            `;
            await client.query(updateSub, [row.id]);

            const updatePlan = `
              UPDATE plans
              SET remaining_capacity = remaining_capacity + 1
              WHERE id = $1
            `;
            await client.query(updatePlan, [row.plan_id]);

            await logAudit('expire_succeeded', {
                subscriptionId: row.id,
                planId: row.plan_id
            }, client);
        }

        await client.query('COMMIT');
        return { processed: rows.length };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Get all customers with their subscriptions
 */
export async function getCustomersWithSubscriptions() {
    const query = `
    SELECT 
      c.id as customer_id,
      c.name as customer_name,
      c.email as customer_email,
      c.created_at as customer_created_at,
      s.id as subscription_id,
      s.status as subscription_status,
      s.purchased_at,
      s.cancelled_at,
      s.expires_at,
      p.name as plan_name,
      p.price as plan_price,
      p.duration_days
    FROM customers c
    LEFT JOIN subscriptions s ON c.id = s.customer_id
    LEFT JOIN plans p ON s.plan_id = p.id
    ORDER BY c.created_at DESC, s.purchased_at DESC
  `;

    const result = await pool.query(query);

    // Group subscriptions by customer
    const customersMap = new Map();

    result.rows.forEach(row => {
        if (!customersMap.has(row.customer_id)) {
            customersMap.set(row.customer_id, {
                id: row.customer_id,
                name: row.customer_name,
                email: row.customer_email,
                created_at: row.customer_created_at,
                subscriptions: []
            });
        }

        if (row.subscription_id) {
            customersMap.get(row.customer_id).subscriptions.push({
                id: row.subscription_id,
                status: row.subscription_status,
                purchased_at: row.purchased_at,
                cancelled_at: row.cancelled_at,
                expires_at: row.expires_at,
                plan_name: row.plan_name,
                plan_price: row.plan_price,
                duration_days: row.duration_days
            });
        }
    });

    return Array.from(customersMap.values());
}

/**
 * Create a new plan (admin function)
 */
export async function createPlan(planData) {
    const { name, description, price, duration_days, total_capacity } = planData;

    const query = `
    INSERT INTO plans (name, description, price, duration_days, total_capacity, remaining_capacity)
    VALUES ($1, $2, $3, $4, $5, $5)
    RETURNING *
  `;

    const result = await pool.query(query, [
        name,
        description,
        price,
        duration_days,
        total_capacity
    ]);

    return result.rows[0];
}

/**
 * Update a plan (admin function)
 */
export async function updatePlan(planId, planData) {
    const { name, description, price, duration_days, total_capacity, is_active } = planData;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get current plan
        const currentPlanQuery = 'SELECT * FROM plans WHERE id = $1 FOR UPDATE';
        const currentPlanResult = await client.query(currentPlanQuery, [planId]);

        if (currentPlanResult.rows.length === 0) {
            throw new Error('Plan not found');
        }

        const currentPlan = currentPlanResult.rows[0];

        // Calculate new remaining capacity if total capacity changed
        let newRemainingCapacity = currentPlan.remaining_capacity;
        if (total_capacity !== undefined && total_capacity !== currentPlan.total_capacity) {
            const usedCapacity = currentPlan.total_capacity - currentPlan.remaining_capacity;
            newRemainingCapacity = total_capacity - usedCapacity;

            if (newRemainingCapacity < 0) {
                throw new Error('Cannot reduce capacity below current subscriptions');
            }
        }

        const query = `
      UPDATE plans
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        duration_days = COALESCE($4, duration_days),
        total_capacity = COALESCE($5, total_capacity),
        remaining_capacity = $6,
        is_active = COALESCE($7, is_active)
      WHERE id = $8
      RETURNING *
    `;

        const result = await client.query(query, [
            name,
            description,
            price,
            duration_days,
            total_capacity,
            newRemainingCapacity,
            is_active,
            planId
        ]);

        await client.query('COMMIT');

        return result.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Create a new customer
 */
export async function createCustomer(email, name) {
    const query = `
    INSERT INTO customers (email, name)
    VALUES ($1, $2)
    RETURNING *
  `;

    const result = await pool.query(query, [email, name]);
    return result.rows[0];
}

/**
 * Get customer by ID
 */
export async function getCustomerById(customerId) {
    const query = 'SELECT * FROM customers WHERE id = $1';
    const result = await pool.query(query, [customerId]);
    return result.rows[0];
}
