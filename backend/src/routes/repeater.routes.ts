
import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { db } from '../db/index.js';
import { endpoints, logs, apiKeys } from '../db/schema.js';
import { eq, sql, and } from 'drizzle-orm';
import * as cheerio from 'cheerio';
import { io } from '../server.js';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import crypto from 'crypto'; // Retained as it's a Node.js built-in module and used later

const router = Router();

// Helper to emit log events via WebSocket (Disabled for Serverless)
const emitLogEvent = async (logData: any) => {
    // Socket.IO disabled for serverless scalability.
    // Frontend uses Supabase Realtime.
};

const getClientIp = (req: Request) => {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
        const ips = (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor).split(',');
        return ips[0].trim();
    }
    return req.ip;
};

router.all('/r/:alias', async (req: Request, res: Response) => {
    const { alias } = req.params;
    const startTime = Date.now();

    try {
        // 1. Fetch endpoint configuration
        const { data: endpoint, error: fetchError } = await supabase
            .from('endpoints')
            .select('*')
            .eq('alias', alias)
            .eq('is_active', true)
            .single();

        if (fetchError || !endpoint) {
            // Log failed lookup (fire and forget to not block 404 response too much, 
            // but await is safer in serverless to ensure execution, so we keep it fast)
            const logData = {
                id: crypto.randomUUID(),
                endpoint_id: null,
                request_method: req.method,
                request_payload: req.body,
                response_status: 404,
                response_time_ms: Date.now() - startTime,
                error_message: `Endpoint alias '${alias}' not found or inactive`,
                ip_address: getClientIp(req),
                user_agent: req.get('user-agent'),
            };
            // Use low-level insert to be slightly faster? Standard insert is fine.
            await supabase.from('logs').insert(logData);

            return res.status(404).json({
                success: false,
                message: `Endpoint '${alias}' not found or inactive`,
            });
        }

        // Check Allowed Methods
        const allowedMethods = endpoint.allowed_methods || ['POST'];
        if (!allowedMethods.includes(req.method)) {
            const logData = {
                id: crypto.randomUUID(),
                endpoint_id: endpoint.id,
                request_method: req.method,
                request_payload: req.body,
                response_status: 405,
                response_time_ms: Date.now() - startTime,
                error_message: `Method ${req.method} not allowed`,
                ip_address: getClientIp(req),
                user_agent: req.get('user-agent'),
            };
            await supabase.from('logs').insert(logData);
            return res.status(405).json({
                success: false,
                message: `Method ${req.method} not allowed. Allowed: ${allowedMethods.join(', ')}`
            });
        }

        // --- SECURITY CHECK: API KEY ---
        if (endpoint.require_api_key) {
            const apiKey = req.headers['x-api-key'] as string;

            if (!apiKey) {
                const logData = {
                    id: crypto.randomUUID(),
                    endpoint_id: endpoint.id,
                    request_method: req.method,
                    request_payload: req.body,
                    response_status: 401,
                    response_time_ms: Date.now() - startTime,
                    error_message: 'Missing API Key',
                    ip_address: getClientIp(req),
                    user_agent: req.get('user-agent'),
                };
                await supabase.from('logs').insert(logData);
                return res.status(401).json({ success: false, message: 'Unauthorized: API Key required' });
            }

            const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

            // Optimizing: Select only necessary fields
            const [validKey] = await db.select({ id: apiKeys.id, allowed_endpoint_ids: apiKeys.allowed_endpoint_ids })
                .from(apiKeys)
                .where(and(
                    eq(apiKeys.key_hash, hashedKey),
                    eq(apiKeys.user_id, endpoint.user_id),
                    eq(apiKeys.is_active, true)
                ))
                .limit(1);

            if (!validKey) {
                const logData = {
                    id: crypto.randomUUID(),
                    endpoint_id: endpoint.id,
                    request_method: req.method,
                    request_payload: req.body,
                    response_status: 403,
                    response_time_ms: Date.now() - startTime,
                    error_message: 'Invalid API Key',
                    ip_address: getClientIp(req),
                    user_agent: req.get('user-agent'),
                };
                await supabase.from('logs').insert(logData);
                return res.status(403).json({ success: false, message: 'Forbidden: Invalid API Key' });
            }

            const allowedEndpointIds = validKey.allowed_endpoint_ids as string[] | null;
            if (allowedEndpointIds && Array.isArray(allowedEndpointIds) && allowedEndpointIds.length > 0) {
                if (!allowedEndpointIds.includes(endpoint.id)) {
                    const logData = {
                        id: crypto.randomUUID(),
                        endpoint_id: endpoint.id,
                        request_method: req.method,
                        request_payload: req.body,
                        response_status: 403,
                        response_time_ms: Date.now() - startTime,
                        error_message: 'API Key not authorized for this endpoint',
                        ip_address: getClientIp(req),
                        user_agent: req.get('user-agent'),
                    };
                    await supabase.from('logs').insert(logData);
                    return res.status(403).json({ success: false, message: 'Forbidden: API Key not authorized for this endpoint' });
                }
            }

            // Update usage stats (Fire and forget, but in array of promises later if possible. 
            // For now, let's keep it here but don't await blocking valid flow heavily.
            // Actually, we can defer this to the end parallel block).
        }
        // -------------------------------

        // 2. Transform payload
        let finalPayload = req.body;
        if (endpoint.payload_mapping && Object.keys(endpoint.payload_mapping).length > 0) {
            finalPayload = transformPayload(req.body, endpoint.payload_mapping);
        }

        // 3. Forward to GAS
        const gasResponse = await fetch(endpoint.gas_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...finalPayload,
                _method: req.method,
                _headers: req.headers
            }),
        });

        // Parse response
        const responseText = await gasResponse.text();
        let jsonResponse;
        try {
            jsonResponse = JSON.parse(responseText);
        } catch {
            jsonResponse = { result: responseText, status: gasResponse.ok ? 'success' : 'error' };
        }

        const responseTime = Date.now() - startTime;

        // 4. Parallelize Logging and Updates
        // Prepare Log Data
        const logData = {
            id: crypto.randomUUID(),
            endpoint_id: endpoint.id,
            request_method: req.method,
            request_payload: req.body,
            request_headers: {
                'user-agent': req.get('user-agent'),
                'content-type': req.get('content-type'),
            },
            response_body: jsonResponse,
            response_status: gasResponse.status,
            response_time_ms: responseTime,
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
        };

        const promises = [];

        // Task A: Insert Log
        promises.push(supabase.from('logs').insert(logData));

        // Task B: Update Endpoint Last Used
        promises.push(
            supabase.from('endpoints')
                .update({ last_used_at: new Date().toISOString() })
                .eq('id', endpoint.id)
        );

        // Await all background tasks
        await Promise.all(promises);

        // 5. Return response
        return res.status(gasResponse.status).json(jsonResponse);

    } catch (error: any) {
        const responseTime = Date.now() - startTime;
        // Error logging
        const logData = {
            id: crypto.randomUUID(),
            endpoint_id: null,
            request_method: req.method,
            request_payload: req.body,
            response_status: 500,
            response_time_ms: responseTime,
            error_message: error.message,
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
        };
        await supabase.from('logs').insert(logData);

        return res.status(500).json({
            success: false,
            message: 'Internal server error while forwarding to GAS',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
});

/**
 * Helper function to transform payload based on mapping configuration
 * @param payload - Original request payload
 * @param mapping - Key mapping configuration (from -> to)
 * @returns Transformed payload
 */
function transformPayload(payload: any, mapping: Record<string, string>): any {
    const result: any = {};

    // Apply mappings
    for (const [sourceKey, targetKey] of Object.entries(mapping)) {
        if (payload.hasOwnProperty(sourceKey)) {
            result[targetKey] = payload[sourceKey];
        }
    }

    // Include unmapped keys (passthrough)
    for (const key in payload) {
        if (!mapping.hasOwnProperty(key)) {
            result[key] = payload[key];
        }
    }

    return result;
}

/**
 * GET /r/:alias - Get endpoint info (for debugging)
 */
router.get('/r/:alias', async (req: Request, res: Response) => {
    const { alias } = req.params;

    try {
        const { data: endpoint, error } = await supabase
            .from('endpoints')
            .select('*')
            .eq('alias', alias)
            .single();

        if (error || !endpoint) {
            return res.status(404).json({
                success: false,
                message: `Endpoint '${alias}' not found`,
            });
        }

        return res.json({
            success: true,
            endpoint: {
                ...endpoint,
                url: `/r/${alias}`,
            },
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching endpoint info',
        });
    }
});

export default router;
