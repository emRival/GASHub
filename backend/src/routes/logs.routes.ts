import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/logs
 * Get request logs with pagination and filtering
 */
router.get('/api/logs', requireAuth, async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        console.log(`[Logs] Fetching for User: ${userId}`);

        // Pagination
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = (page - 1) * limit;

        // Filters
        const endpointId = req.query.endpoint_id as string;
        const status = req.query.status as string; // 'success' or 'error'

        // Build query
        let query = supabase
            .from('logs')
            .select('*, endpoints!inner(id, name, alias, user_id)', { count: 'exact' });

        // Filter by user's endpoints only
        query = query.eq('endpoints.user_id', userId);

        // Optional filters
        if (endpointId) {
            query = query.eq('endpoint_id', endpointId);
        }

        if (status === 'success') {
            query = query.gte('response_status', 200).lt('response_status', 300);
        } else if (status === 'error') {
            query = query.or('response_status.gte.400,response_status.is.null');
        }

        // Pagination and ordering
        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('[Logs] Error:', error);
            throw error;
        }

        console.log(`[Logs] Found ${data?.length} logs for user ${userId}`);

        return res.json({
            success: true,
            data: data || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch logs',
            error: error.message
        });
    }
});

/**
 * GET /api/logs/:id
 * Get a single log entry
 */
router.get('/api/logs/:id', requireAuth, async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('logs')
            .select('*, endpoints!inner(id, name, alias, user_id)')
            .eq('id', id)
            .eq('endpoints.user_id', userId)
            .single();

        if (error || !data) {
            return res.status(404).json({
                success: false,
                message: 'Log not found'
            });
        }

        return res.json({
            success: true,
            data
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch log',
            error: error.message
        });
    }
});

/**
 * DELETE /api/logs/:id
 * Delete a single log (for cleanup)
 */
router.delete('/api/logs/:id', requireAuth, async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verify ownership through endpoint
        const { data: log } = await supabase
            .from('logs')
            .select('endpoint_id, endpoints!inner(user_id)')
            .eq('id', id)
            .eq('endpoints.user_id', userId)
            .single();

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Log not found or you do not have permission'
            });
        }

        const { error } = await supabase
            .from('logs')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return res.json({
            success: true,
            message: 'Log deleted successfully'
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Failed to delete log',
            error: error.message
        });
    }
});

/**
 * DELETE /api/logs/bulk
 * Bulk delete logs (cleanup old logs)
 */
router.delete('/api/logs/bulk', requireAuth, async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const { older_than_days } = req.body;

        if (!older_than_days || older_than_days < 1) {
            return res.status(400).json({
                success: false,
                message: 'Please specify older_than_days (minimum 1)'
            });
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - older_than_days);

        // Get user's endpoint IDs
        const { data: endpoints } = await supabase
            .from('endpoints')
            .select('id')
            .eq('user_id', userId);

        const endpointIds = endpoints?.map(e => e.id) || [];

        if (endpointIds.length === 0) {
            return res.json({
                success: true,
                message: 'No logs to delete',
                deleted: 0
            });
        }

        // Delete old logs
        const { error, count } = await supabase
            .from('logs')
            .delete({ count: 'exact' })
            .in('endpoint_id', endpointIds)
            .lt('created_at', cutoffDate.toISOString());

        if (error) throw error;

        return res.json({
            success: true,
            message: `Deleted ${count || 0} old logs`,
            deleted: count || 0
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Failed to delete logs',
            error: error.message
        });
    }
});

export default router;
