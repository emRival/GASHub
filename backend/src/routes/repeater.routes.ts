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

// Helper to emit log events via WebSocket (Disabled for Vercel/Serverless)
const emitLogEvent = async (logData: any) => {
    // Socket.IO is not supported in Vercel Serverless environment.
    // Frontend now uses Supabase Realtime subscriptions to 'logs' table.
    try {
        // console.log(`[WebSocket] Skipping emit for serverless: ${logData.response_status}`);
    } catch (error) {
        console.error('[WebSocket] Failed to emit log event:', error);
    }
};

/**
 * Dynamic Repeater Route
 * /r/:alias - Forward request to configured GAS endpoint
 */
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
        // 1. Fetch endpoint configuration from database
        const { data: endpoint, error: fetchError } = await supabase
            .from('endpoints')
            .select('*')
            .eq('alias', alias)
            .eq('is_active', true)
            .single();

        if (fetchError || !endpoint) {
            // Log failed lookup
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
            await supabase.from('logs').insert(logData);
            emitLogEvent(logData);

            return res.status(404).json({
                success: false,
                message: `Endpoint '${alias}' not found or inactive`,
            });
        }

        // Check Allowed Methods
        const allowedMethods = endpoint.allowed_methods || ['POST'];
        console.log(`[Repeater] ${alias} | Method: ${req.method} | Allowed: ${JSON.stringify(allowedMethods)}`);

        if (!allowedMethods.includes(req.method)) {
            // ... (logging and 405 return)
            console.log(`[Repeater] BLOCKING request method ${req.method}`);
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
            emitLogEvent(logData);
            return res.status(405).json({
                success: false,
                message: `Method ${req.method} not allowed. Allowed: ${allowedMethods.join(', ')}`
            });
        }

        // --- SECURITY CHECK: API KEY ---
        if (endpoint.require_api_key) {
            const apiKey = req.headers['x-api-key'] as string;

            if (!apiKey) {
                console.warn(`[Repeater] Blocked: Missing API Key for ${alias}`);
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
                emitLogEvent(logData);
                return res.status(401).json({ success: false, message: 'Unauthorized: API Key required' });
            }

            // Hash incoming key
            const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

            // Verify against DB (using Drizzle for direct access)
            // Need to import db and apiKeys at top of file, ensuring imports are present
            const { db } = await import('../db/index.js');
            const { apiKeys } = await import('../db/schema.js');
            const { eq, and } = await import('drizzle-orm');

            const [validKey] = await db.select()
                .from(apiKeys)
                .where(and(
                    eq(apiKeys.key_hash, hashedKey),
                    eq(apiKeys.user_id, endpoint.user_id),
                    eq(apiKeys.is_active, true)
                ))
                .limit(1);

            if (!validKey) {
                console.warn(`[Repeater] Blocked: Invalid API Key for ${alias}`);
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
                emitLogEvent(logData);
                return res.status(403).json({ success: false, message: 'Forbidden: Invalid API Key' });
            }

            // CHECK SCOPES
            const allowedEndpointIds = validKey.allowed_endpoint_ids as string[] | null;
            if (allowedEndpointIds && Array.isArray(allowedEndpointIds) && allowedEndpointIds.length > 0) {
                if (!allowedEndpointIds.includes(endpoint.id)) {
                    console.warn(`[Repeater] Blocked: Key not authorized for endpoint ${alias}`);
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
                    emitLogEvent(logData);
                    return res.status(403).json({ success: false, message: 'Forbidden: API Key not authorized for this endpoint' });
                }
            }

            // Update usage stats (fire and forget)
            db.update(apiKeys)
                .set({ last_used_at: new Date() })
                .where(eq(apiKeys.id, validKey.id))
                .then();
        }
        // -------------------------------

        // 2. Transform payload if mapping exists
        let transformedPayload = req.body;

        if (endpoint.payload_mapping && Object.keys(endpoint.payload_mapping).length > 0) {
            transformedPayload = transformPayload(req.body, endpoint.payload_mapping);
        }

        // 3. Forward to Google
        // Transform payload if mapping exists
        const mapping = endpoint.payload_mapping as Record<string, string> | null;
        let finalPayload = req.body; // Use req.body as the initial payload

        if (mapping && Object.keys(mapping).length > 0) {
            console.log(`[Repeater] Transforming payload for ${alias} with mapping:`, mapping);
            finalPayload = {};

            // Map known fields
            Object.entries(mapping).forEach(([sourceKey, targetKey]) => {
                if (req.body[sourceKey] !== undefined) {
                    finalPayload[targetKey] = req.body[sourceKey];
                }
            });

            // Pass through unmapped fields? 
            // Decision: For now, strict mapping (only mapped fields + unmapped original). 
            // Actually, usually users want to rename some and keep others.
            // Let's implement: Result = Mapped Fields + (Original Fields NOT in Source Keys)
            // But usually mappings are exclusive. Let's stick to:
            // Result = Only fields defined in output? No, that's too strict.
            // Let's go with: Start with empty, add mapped.
            // If they want to keep "id", they should map "id" -> "id" or we provide a "Spread remaining" option later.
            // For MVP: Mixed approach.
            // If mapping exists, we construct a NEW object.

            // Re-evaluating: Simplest predictive behavior is:
            // 1. Create new object
            // 2. Iterate source payload
            // 3. If key is in mapping, use target key. Else, use original key.

            finalPayload = {};
            Object.keys(req.body).forEach(key => {
                const targetKey = mapping[key];
                if (targetKey) {
                    finalPayload[targetKey] = req.body[key];
                } else {
                    finalPayload[key] = req.body[key];
                }
            });
            console.log('[Repeater] Transformed:', finalPayload);
        }

        // Send to GAS
        const gasResponse = await fetch(endpoint.gas_url, {
            method: 'POST', // GAS always expects POST
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...finalPayload, // Use finalPayload here
                _method: req.method, // Pass original method in payload for GAS to handle if needed
                _headers: req.headers
            }),
        });

        // Parse response (GAS might return text or JSON)
        const responseText = await gasResponse.text();
        let jsonResponse;

        try {
            jsonResponse = JSON.parse(responseText);
        } catch {
            // If not valid JSON, wrap in object
            jsonResponse = {
                result: responseText,
                status: gasResponse.ok ? 'success' : 'error'
            };
        }

        const responseTime = Date.now() - startTime;

        // 4. Log the request (async, non-blocking)
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

        supabase.from('logs').insert(logData).then(() => {
            // Emit to WebSocket clients for real-time dashboard updates
            emitLogEvent(logData);
        });

        // 5. Update last_used_at timestamp (async)
        supabase
            .from('endpoints')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', endpoint.id)
            .then();

        // 6. Return response to client
        return res.status(gasResponse.status).json(jsonResponse);

    } catch (error: any) {
        const responseTime = Date.now() - startTime;

        // Log error
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
        emitLogEvent(logData);

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
