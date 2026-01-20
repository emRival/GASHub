import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.middleware';
import crypto from 'crypto';

const router = Router();

/**
 * Validation Schemas with Zod
 */
const createEndpointSchema = z.object({
    name: z.string().min(1).max(100),
    alias: z.string().min(1).max(50).regex(new RegExp('^[a-z0-9-_]+$'), 'Alias must be lowercase alphanumeric with dashes/underscores'),
    target_url: z.string().url(),
    description: z.string().optional(),
    payload_mapping: z.any().optional(),
    project_id: z.string().uuid().optional(),
    is_active: z.boolean().optional().default(true),
    allowed_methods: z.array(z.string()).optional().default(['POST']),
    require_api_key: z.boolean().optional().default(false),
});

const updateEndpointSchema = createEndpointSchema.partial();

/**
 * GET /api/endpoints
 * List all endpoints for the authenticated user
 */
router.get('/api/endpoints', requireAuth, async (req: any, res: Response) => {
    try {
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('endpoints')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return res.json({
            success: true,
            data: data || [],
            count: data?.length || 0
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch endpoints',
            error: error.message
        });
    }
});

/**
 * GET /api/endpoints/:id
 * Get a single endpoint by ID
 */
router.get('/api/endpoints/:id', requireAuth, async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('endpoints')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            return res.status(404).json({
                success: false,
                message: 'Endpoint not found'
            });
        }

        return res.json({
            success: true,
            data
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch endpoint',
            error: error.message
        });
    }
});

/**
 * POST /api/endpoints
 * Create a new endpoint
 */
router.post('/api/endpoints', requireAuth, async (req: any, res: Response) => {
    try {
        // Validate input
        const validated = createEndpointSchema.parse(req.body);
        const userId = req.user.id;

        // Check if alias already exists
        const { data: existing } = await supabase
            .from('endpoints')
            .select('id')
            .eq('alias', validated.alias)
            .single();

        if (existing) {
            return res.status(409).json({
                success: false,
                message: `Alias '${validated.alias}' already exists. Please choose a different alias.`
            });
        }

        const insertPayload = {
            id: crypto.randomUUID(),
            ...validated,
            gas_url: validated.target_url,
            user_id: userId,
            allowed_methods: validated.allowed_methods || ['POST'],
            payload_mapping: validated.payload_mapping || {},
            require_api_key: validated.require_api_key || false,
        };
        // Remove target_url from insertPayload as column is gas_url
        delete (insertPayload as any).target_url;
        console.log('Inserting Endpoint:', insertPayload);

        // Insert new endpoint
        const { data, error } = await supabase
            .from('endpoints')
            .insert(insertPayload)
            .select()
            .single();

        if (error) throw error;

        return res.status(201).json({
            success: true,
            message: 'Endpoint created successfully',
            data
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.issues
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Failed to create endpoint',
            error: error.message
        });
    }
});

/**
 * PUT /api/endpoints/:id
 * Update an existing endpoint
 */
router.put('/api/endpoints/:id', requireAuth, async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const validated = updateEndpointSchema.parse(req.body);
        const userId = req.user.id;

        // Check if alias is being changed and if it conflicts
        if (validated.alias) {
            const { data: existing } = await supabase
                .from('endpoints')
                .select('id')
                .eq('alias', validated.alias)
                .neq('id', id)
                .single();

            if (existing) {
                return res.status(409).json({
                    success: false,
                    message: `Alias '${validated.alias}' already exists`
                });
            }
        }

        // Transform validated data for DB (target_url -> gas_url)
        const updateData: any = { ...validated };
        if (updateData.target_url) {
            updateData.gas_url = updateData.target_url;
            delete updateData.target_url;
        }

        // Update endpoint
        const { data, error } = await supabase
            .from('endpoints')
            .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error || !data) {
            return res.status(404).json({
                success: false,
                message: 'Endpoint not found or you do not have permission'
            });
        }

        return res.json({
            success: true,
            message: 'Endpoint updated successfully',
            data
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.issues
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Failed to update endpoint',
            error: error.message
        });
    }
});

/**
 * DELETE /api/endpoints/:id
 * Delete an endpoint
 */
router.delete('/api/endpoints/:id', requireAuth, async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { error } = await supabase
            .from('endpoints')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            return res.status(404).json({
                success: false,
                message: 'Endpoint not found or you do not have permission'
            });
        }

        return res.json({
            success: true,
            message: 'Endpoint deleted successfully'
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Failed to delete endpoint',
            error: error.message
        });
    }
});

/**
 * PATCH /api/endpoints/:id/toggle
 * Toggle endpoint active status
 */
router.patch('/api/endpoints/:id/toggle', requireAuth, async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Get current status
        const { data: current } = await supabase
            .from('endpoints')
            .select('is_active')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (!current) {
            return res.status(404).json({
                success: false,
                message: 'Endpoint not found'
            });
        }

        // Toggle status
        const { data, error } = await supabase
            .from('endpoints')
            .update({ is_active: !current.is_active })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        return res.json({
            success: true,
            message: `Endpoint ${data.is_active ? 'activated' : 'deactivated'}`,
            data
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Failed to toggle endpoint status',
            error: error.message
        });
    }
});

/**
 * POST /api/endpoints/:id/check
 * Check if the endpoint's configured GAS URL is reachable
 */
router.post('/api/endpoints/:id/check', requireAuth, async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user.id; // Corrected: user.id from session

        // 1. Fetch endpoint to get the URL
        const { data: endpoint, error } = await supabase
            .from('endpoints')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error || !endpoint) {
            return res.status(404).json({
                success: false,
                message: 'Endpoint not found or permission denied'
            });
        }

        // 2. Perform Health Check
        const startTime = Date.now();
        let status = 'error';
        let message = '';
        let statusCode = 0;

        try {
            // Send a "dry run" request
            const response = await fetch(endpoint.gas_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ _health_check: true, _timestamp: Date.now() })
            });

            statusCode = response.status;

            if (response.ok) {
                status = 'healthy';
                message = 'Endpoint is reachable and responding correctly.';
            } else {
                status = 'unhealthy';
                message = `Endpoint responded with status ${response.status} ${response.statusText}`;
            }

        } catch (fetchError: any) {
            status = 'unreachable';
            message = `Failed to connect: ${fetchError.message}`;
            statusCode = 0;
        }

        const duration = Date.now() - startTime;

        return res.json({
            success: true,
            data: {
                status,
                message,
                statusCode,
                duration
            }
        });

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error during health check',
            error: error.message
        });
    }
});

export default router;
