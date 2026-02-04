import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import repeaterRoutes from './routes/repeater.routes.js';
import endpointsRoutes from './routes/endpoints.routes.js';
import logsRoutes from './routes/logs.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import { auth } from './lib/auth.js';
import { sql } from 'drizzle-orm';
import { db } from './db/index.js';

const app = express();

// Trust proxy (required for Vercel/proxies to get real IP)
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for Vercel
}));
// 1. Permissive CORS for Repeater Routes (Webhook/Public API)
app.use('/r/*', cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    credentials: false // '*' requires credentials to be false
}));

// 2. Restricted CORS for Dashboard API
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
}));
app.use(express.json());

import { toNodeHandler } from 'better-auth/node';

// Better Auth routes
// Explicitly handle OPTIONS for auth routes
app.options('/api/auth/*', cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
}));

// Add verbose logging for debugging Vercel
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
});

app.all('/api/auth/*', toNodeHandler(auth));

import apiKeysRoutes from './routes/api-keys.routes.js';

// API Routes
// Rate Limiting for /api routes
import { apiLimiter, repeaterLimiter } from './middleware/rate-limit.middleware.js';
app.use('/api', apiLimiter); // Apply API limiter globally

app.use(endpointsRoutes);  // /api/endpoints
app.use(logsRoutes);        // /api/logs
app.use(analyticsRoutes);   // /api/analytics
app.use(apiKeysRoutes);   // /api/api-keys

// Repeater routes - THE CORE FEATURE!
app.use(repeaterLimiter); // Apply stricter limits to repeater
app.use(repeaterRoutes);    // /r/:alias

// Health check
app.get('/health', async (req, res) => {
    try {
        const start = Date.now();
        // Force a real query
        await db.execute(sql`SELECT 1`);
        const duration = Date.now() - start;

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'GAS Bridge Hub API',
            database: 'connected',
            latency: `${duration}ms`
        });
    } catch (error: any) {
        console.error('[Health] DB Check Failed:', error);
        res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            error: error.message
        });
    }
});

// API info
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'GAS Bridge Hub API',
        version: '1.0.0',
        endpoints: {
            health: 'GET /health',
            api: 'GET /api',
            // Endpoints Management
            endpoints: 'GET /api/endpoints',
            endpoint: 'GET /api/endpoints/:id',
            createEndpoint: 'POST /api/endpoints',
            updateEndpoint: 'PUT /api/endpoints/:id',
            deleteEndpoint: 'DELETE /api/endpoints/:id',
            toggleEndpoint: 'PATCH /api/endpoints/:id/toggle',
            // Logs
            logs: 'GET /api/logs',
            log: 'GET /api/logs/:id',
            deleteLogs: 'DELETE /api/logs/bulk',
            // Analytics
            analyticsSummary: 'GET /api/analytics/summary',
            analyticsTimeline: 'GET /api/analytics/timeline',
            analyticsEndpoints: 'GET /api/analytics/endpoints',
            // Repeater
            repeater: 'POST /r/:alias - Forward to GAS',
            repeaterInfo: 'GET /r/:alias - Get endpoint info',
        }
    });
});

export default app;
