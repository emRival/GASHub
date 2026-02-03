import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { apiKeys } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

// Helper to generate key
const generateKey = () => {
    const prefix = 'sk_live_';
    const random = crypto.randomBytes(24).toString('hex');
    return `${prefix}${random}`;
};

// Helper to hash key
const hashKey = (key: string) => {
    return crypto.createHash('sha256').update(key).digest('hex');
};

/**
 * GET /api/api-keys
 * List all API keys for the user
 */
router.get('/api/api-keys', requireAuth, async (req: any, res: Response) => {
    try {
        const userId = req.user.id;

        const keys = await db.select({
            id: apiKeys.id,
            name: apiKeys.name,
            key_prefix: apiKeys.key_prefix,
            is_active: apiKeys.is_active,
            created_at: apiKeys.created_at,
            last_used_at: apiKeys.last_used_at,
            expires_at: apiKeys.expires_at,
            allowed_endpoint_ids: apiKeys.allowed_endpoint_ids
        })
            .from(apiKeys)
            .where(eq(apiKeys.user_id, userId))
            .orderBy(apiKeys.created_at);

        return res.json({
            success: true,
            data: keys
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch API keys',
            error: error.message
        });
    }
});

/**
 * POST /api/api-keys
 * Create a new API key
 */
router.post('/api/api-keys', requireAuth, async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const { name, allowed_endpoint_ids } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }

        // Generate Key
        const rawKey = generateKey();
        const hashedKey = hashKey(rawKey);
        const keyPrefix = rawKey.substring(0, 12) + '...'; // e.g. "sk_live_a1b2..."

        // Save to DB
        const [newKey] = await db.insert(apiKeys).values({
            id: crypto.randomUUID(),
            user_id: userId,
            name,
            key_hash: hashedKey,
            key_prefix: keyPrefix,
            scopes: ['read', 'write'], // Default scopes for now
            allowed_endpoint_ids: allowed_endpoint_ids || null, // Capture from body
            is_active: true
        }).returning();

        // Return raw key ONLY ONCE
        return res.status(201).json({
            success: true,
            data: {
                ...newKey,
                apiKey: rawKey // This is the only time the user sees this!
            }
        });

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create API key',
            error: error.message
        });
    }
});

/**
 * DELETE /api/api-keys/:id
 * Delete (revoke) an API key
 */
router.delete('/api/api-keys/:id', requireAuth, async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Delete (ensure ownership)
        const result = await db.delete(apiKeys)
            .where(and(
                eq(apiKeys.id, id),
                eq(apiKeys.user_id, userId)
            ))
            .returning();

        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'API key not found or permission denied'
            });
        }

        return res.json({
            success: true,
            message: 'API key deleted successfully'
        });

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Failed to delete API key',
            error: error.message
        });
    }
});

export default router;
