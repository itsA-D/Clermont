import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import plansRouter from './routes/plans.js';
import subscriptionsRouter from './routes/subscriptions.js';
import customersRouter from './routes/customers.js';
import productsRouter from './routes/products.js';
import pricesRouter from './routes/prices.js';
import checkoutRouter from './routes/checkout.js';
import authRouter from './routes/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { runMigrations } from './db/migrations.js';
import { expireExpiredSubscriptions } from './db/queries.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const corsOrigin = process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN } : undefined;
app.use(cors(corsOrigin));
// Ensure preflight (OPTIONS) is handled for all routes
app.options('*', cors(corsOrigin));
app.use(helmet());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/plans', plansRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/products', productsRouter);
app.use('/api/prices', pricesRouter);
app.use('/api/checkout-sessions', checkoutRouter);
app.use('/api/auth', authRouter);
// Alias without /api prefix for environments where the frontend points to /auth/* directly
app.use('/auth', authRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Bootstrap: run migrations, start server, and schedule background job
async function start() {
    try {
        await runMigrations();
        console.log('Migrations completed');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
        });

        // Background job: expire subscriptions
        const intervalMs = parseInt(process.env.BACKGROUND_EXPIRE_INTERVAL_MS || '60000');
        let jobRunning = false;
        setInterval(async () => {
            if (jobRunning) return;
            jobRunning = true;
            try {
                const { processed } = await expireExpiredSubscriptions(200);
                if (processed > 0) {
                    console.log(`Expired ${processed} subscriptions and restored capacity`);
                }
            } catch (err) {
                console.error('Error running expiration job:', err.message || err);
            } finally {
                jobRunning = false;
            }
        }, intervalMs);
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

start();
