import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import repeaterRoutes from './routes/repeater.routes';
import endpointsRoutes from './routes/endpoints.routes';
import logsRoutes from './routes/logs.routes';
import analyticsRoutes from './routes/analytics.routes';
import { auth } from './lib/auth';

const app = express();

// Trust proxy (required for Vercel/proxies to get real IP)
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for Vercel
}));
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
}));
app.use(express.json());

import { toNodeHandler } from 'better-auth/node';

// Better Auth routes
app.all('/api/auth/*path', toNodeHandler(auth));

import apiKeysRoutes from './routes/api-keys.routes';

// API Routes
// Rate Limiting for /api routes
import { apiLimiter, repeaterLimiter } from './middleware/rate-limit.middleware';
app.use('/api', apiLimiter); // Apply API limiter globally

app.use(endpointsRoutes);  // /api/endpoints
app.use(logsRoutes);        // /api/logs
app.use(analyticsRoutes);   // /api/analytics
app.use(apiKeysRoutes);   // /api/api-keys

// Repeater routes - THE CORE FEATURE!
app.use(repeaterLimiter); // Apply stricter limits to repeater
app.use(repeaterRoutes);    // /r/:alias

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'GAS Bridge Hub API',
        database: 'connected'
    });
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
