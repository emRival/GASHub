import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/auth';

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const session = await auth.api.getSession({
            headers: req.headers as any,
        });

        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Please login',
            });
        }

        // Attach user to request
        (req as any).user = session.user;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid session',
        });
    }
}
