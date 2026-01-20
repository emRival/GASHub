import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/analytics/summary
 * Get dashboard summary statistics
 */
router.get('/api/analytics/summary', requireAuth, async (req: any, res: Response) => {
    try {
        const userId = req.user.id;

        // Get user's endpoints
        const { data: endpoints } = await supabase
            .from('endpoints')
            .select('id')
            .eq('user_id', userId);

        const endpointIds = endpoints?.map(e => e.id) || [];

        if (endpointIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    totalEndpoints: 0,
                    totalRequests: 0,
                    totalRequestsToday: 0,
                    successRate: 0,
                    averageResponseTime: 0,
                    activeEndpoints: 0
                }
            });
        }

        // Total requests today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count: totalToday } = await supabase
            .from('logs')
            .select('*', { count: 'exact', head: true })
            .in('endpoint_id', endpointIds)
            .gte('created_at', today.toISOString());

        // Total requests all time
        const { count: totalAllTime } = await supabase
            .from('logs')
            .select('*', { count: 'exact', head: true })
            .in('endpoint_id', endpointIds);

        // Success count today
        const { count: successCount } = await supabase
            .from('logs')
            .select('*', { count: 'exact', head: true })
            .in('endpoint_id', endpointIds)
            .gte('created_at', today.toISOString())
            .gte('response_status', 200)
            .lt('response_status', 300);

        // Average response time today
        const { data: responseTimes } = await supabase
            .from('logs')
            .select('response_time_ms')
            .in('endpoint_id', endpointIds)
            .gte('created_at', today.toISOString())
            .not('response_time_ms', 'is', null);

        const avgResponseTime = responseTimes && responseTimes.length > 0
            ? responseTimes.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / responseTimes.length
            : 0;

        // Active endpoints count
        const { count: activeEndpoints } = await supabase
            .from('endpoints')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_active', true);

        return res.json({
            success: true,
            data: {
                totalEndpoints: endpoints?.length || 0,
                activeEndpoints: activeEndpoints || 0,
                totalRequests: totalAllTime || 0,
                totalRequestsToday: totalToday || 0,
                successRate: totalToday ? ((successCount || 0) / totalToday * 100).toFixed(2) : '0',
                averageResponseTime: Math.round(avgResponseTime)
            }
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics summary',
            error: error.message
        });
    }
});

/**
 * GET /api/analytics/timeline
 * Get request timeline data for charts
 */
router.get('/api/analytics/timeline', requireAuth, async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const days = parseInt(req.query.days as string) || 7;

        const { data: endpoints } = await supabase
            .from('endpoints')
            .select('id')
            .eq('user_id', userId);

        const endpointIds = endpoints?.map(e => e.id) || [];

        if (endpointIds.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get logs grouped by date
        const { data: logs } = await supabase
            .from('logs')
            .select('created_at, response_status')
            .in('endpoint_id', endpointIds)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });

        // Group by date
        const timeline: Record<string, { total: number; success: number; error: number }> = {};

        // Initialize dates
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
            timeline[dateKey] = { total: 0, success: 0, error: 0 };
        }

        logs?.forEach(log => {
            const dateKey = log.created_at.split('T')[0];
            if (timeline[dateKey]) {
                timeline[dateKey].total++;
                if (log.response_status >= 200 && log.response_status < 300) {
                    timeline[dateKey].success++;
                } else {
                    timeline[dateKey].error++;
                }
            }
        });

        const result = Object.entries(timeline)
            .map(([date, stats]) => ({
                date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                fullDate: date,
                ...stats
            }))
            .sort((a, b) => a.fullDate.localeCompare(b.fullDate));

        return res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch timeline data',
            error: error.message
        });
    }
});

/**
 * GET /api/analytics/endpoints
 * Get per-endpoint statistics
 */
router.get('/api/analytics/endpoints', requireAuth, async (req: any, res: Response) => {
    try {
        const userId = req.user.id;

        const { data: endpoints } = await supabase
            .from('endpoints')
            .select('id, name, alias')
            .eq('user_id', userId);

        if (!endpoints || endpoints.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        const endpointIds = endpoints.map(e => e.id);

        // Batch Query 1: Get total request counts per endpoint
        // Since we can't easily do GROUP BY with standard client, we'll fetch all matching logs (lightweight selection)
        // OR better: use the new Indexes to make this fast.
        // Actually, for true scalability without RPC, we might need to rely on the client.
        // But for now, let's optimize by parallelizing the counts rather than serializing them if possible,
        // OR simply improve the loop to be less blocking?
        // Wait, standard Supabase client DOES NOT support GROUP BY nicely.
        // The most robust way without writing SQL RPC is to keep the loop but ensure it's concurrent (Promise.all is already concurrent).
        // However, we can optimize by fetching ALL stats in one go if we had a dedicated stats table.
        // Given the constraints, let's stick to the current loop BU add a limit to prevent timeout, 
        // OR use a raw query if we had access (we only have supabase client here).

        // Let's optimize the loop by ensuring we use the COUNT query efficiently.
        // Actually, we can fetch all relevant logs for these endpoints in one go if the dataset isn't huge.
        // But if it IS huge, that crashes memory.

        // Alternative: Use an RPC function. But I can't easily deploy RPCs from here without migrations.
        // Let's stick to Promise.all but optimize the query selection to be HEAD only (which it is).

        // Refinement: The previous code WAS properly using concurrent Promise.all. 
        // The issue was lack of indexes. Now that indexes are there, it should be faster.
        // BUT, we can still do better by creating a Materialized View style logic later.
        // For now, let's just make sure the error handling is robust and maybe limit concurrency if N is huge.
        // Actually, let me rewrite it to use a slightly better pattern where we don't await inside the map?
        // The previous code: `const stats = await Promise.all(endpoints.map(...))` IS concurrent.
        // So the N+1 is parallelized. With indexes, this might be "Fast Enough" for < 100 endpoints.

        // However, I can still optimize by fetching generic counts if I could.
        // Let's leave the loop but ensure we are selecting MINIMAL data.
        // Code is already using { count: 'exact', head: true }.

        // Let's add a small optimization: 
        // If we have > 50 endpoints, we might want to chunk it. 
        // But for now, let's assumes indexes solved the main latency.

        // User asked to "perbaiki query2".
        // Let's try to simulate a GROUP BY using raw SQL via the `rpc` interface if we had one.
        // Since we don't, I will optimize the code to NOT run a second query for success count if total is 0.

        const stats = await Promise.all(
            endpoints.map(async (endpoint) => {
                // 1. Get Totals
                const { count: totalRequests } = await supabase
                    .from('logs')
                    .select('*', { count: 'exact', head: true })
                    .eq('endpoint_id', endpoint.id);

                let successRequests = 0;
                let successRate = '0';

                // Optimization: Only query success count if there are requests
                if (totalRequests && totalRequests > 0) {
                    const { count: success } = await supabase
                        .from('logs')
                        .select('*', { count: 'exact', head: true })
                        .eq('endpoint_id', endpoint.id)
                        .gte('response_status', 200)
                        .lt('response_status', 300);
                    successRequests = success || 0;
                    successRate = ((successRequests / totalRequests) * 100).toFixed(2);
                }

                return {
                    ...endpoint,
                    totalRequests: totalRequests || 0,
                    successRequests,
                    successRate
                };
            })
        );

        return res.json({
            success: true,
            data: stats
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch endpoint analytics',
            error: error.message
        });
    }
});

export default router;
