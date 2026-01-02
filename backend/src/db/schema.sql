-- Subscription Management System Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Plans table
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    total_capacity INTEGER NOT NULL CHECK (total_capacity > 0),
    remaining_capacity INTEGER NOT NULL CHECK (remaining_capacity >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT capacity_check CHECK (remaining_capacity <= total_capacity)
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'cancelled')),
    purchased_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    idempotency_key TEXT
);

-- Unique constraint: one active subscription per customer per plan
CREATE UNIQUE INDEX idx_unique_active_subscription 
ON subscriptions (customer_id, plan_id) 
WHERE status = 'active';

-- Index for efficient queries
CREATE INDEX idx_subscriptions_customer_plan ON subscriptions (customer_id, plan_id, status);
CREATE INDEX idx_plans_active ON plans (is_active) WHERE is_active = true;
CREATE INDEX idx_subscriptions_status ON subscriptions (status);

-- Idempotency key uniqueness when present
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_idempotency_key
ON subscriptions (idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Audit logs table
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at for plans
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO plans (name, description, price, duration_days, total_capacity, remaining_capacity) VALUES
('Basic Monthly', 'Basic plan with 30 days access', 9.99, 30, 100, 100),
('Pro Monthly', 'Professional plan with 30 days access', 29.99, 30, 50, 50),
('Enterprise Yearly', 'Enterprise plan with 365 days access', 299.99, 365, 10, 10);

INSERT INTO customers (email, name) VALUES
('alice@example.com', 'Alice Johnson'),
('bob@example.com', 'Bob Smith'),
('charlie@example.com', 'Charlie Brown');
