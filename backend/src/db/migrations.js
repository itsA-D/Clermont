import pool from './pool.js';

export async function runMigrations() {
  // Runs safe, idempotent migrations required for idempotency and audit logging
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure uuid extension exists (safe if already exists)
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Create audit_logs table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_type TEXT NOT NULL,
        request_idempotency_key TEXT,
        customer_id UUID,
        plan_id UUID,
        subscription_id UUID,
        message TEXT,
        metadata JSONB,
        error_code TEXT,
        status_code INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Base tables: Plans
    await client.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        duration_days INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Base tables: Customers
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Base tables: Subscriptions
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id UUID REFERENCES customers(id),
        plan_id UUID REFERENCES plans(id),
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Users table for auth
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);`);

    // Link customers to users
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'customers' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE customers ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers (user_id);`);

    // Add idempotency_key column to subscriptions if not exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'subscriptions' AND column_name = 'idempotency_key'
        ) THEN
          ALTER TABLE subscriptions ADD COLUMN idempotency_key TEXT;
        END IF;
      END $$;
    `);

    // Create unique index for idempotency_key when present
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_idempotency_key
      ON subscriptions (idempotency_key)
      WHERE idempotency_key IS NOT NULL;
    `);

    // Products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        description TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Prices table (Stripe-like). Stores amounts in minor units (cents)
    await client.query(`
      CREATE TABLE IF NOT EXISTS prices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        plan_id UUID REFERENCES plans(id),
        currency TEXT NOT NULL DEFAULT 'usd',
        unit_amount BIGINT NOT NULL CHECK (unit_amount >= 0),
        recurring_interval TEXT,
        interval_count INTEGER DEFAULT 1 CHECK (interval_count > 0),
        type TEXT NOT NULL DEFAULT 'recurring',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add plan_id column to prices if missing
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'prices' AND column_name = 'plan_id'
        ) THEN
          ALTER TABLE prices ADD COLUMN plan_id UUID REFERENCES plans(id);
        END IF;
      END $$;
    `);

    // Checkout sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS checkout_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        price_id UUID NOT NULL REFERENCES prices(id) ON DELETE RESTRICT,
        status TEXT NOT NULL CHECK (status IN ('open','complete','expired')),
        url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      );
    `);

    // Add subscription_id to checkout_sessions if missing
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'checkout_sessions' AND column_name = 'subscription_id'
        ) THEN
          ALTER TABLE checkout_sessions ADD COLUMN subscription_id UUID REFERENCES subscriptions(id);
        END IF;
      END $$;
    `);

    // Helpful indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_active ON products (active);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_prices_active ON prices (active);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_checkout_status ON checkout_sessions (status);`);

    // Seed: create a default product and prices for existing plans if none exist
    const prodCheck = await client.query('SELECT id FROM products LIMIT 1');
    if (prodCheck.rows.length === 0) {
      const prodRes = await client.query(
        `INSERT INTO products (name, description, active) VALUES ($1,$2,true) RETURNING id`,
        ['Subscription Plans', 'Auto-generated product for existing plans']
      );
      const productId = prodRes.rows[0].id;
      const plans = await client.query(`SELECT id, price, duration_days FROM plans WHERE is_active = true`);
      for (const p of plans.rows) {
        const unitAmount = Math.round(Number(p.price) * 100);
        await client.query(
          `INSERT INTO prices (product_id, plan_id, currency, unit_amount, recurring_interval, interval_count, type, active)
           VALUES ($1, $2, $3, $4, $5, $6, 'recurring', true)`,
          [productId, p.id, process.env.DEFAULT_CURRENCY || 'usd', unitAmount, 'day', p.duration_days]
        );
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
