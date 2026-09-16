import { rateLimit, ipKeyGenerator, Options } from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Shared factory for rate-limit middleware.
 *
 * - Keys by authenticated user ID when available, falling back to the client IP
 *   (ipKeyGenerator correctly handles IPv6 addresses per express-rate-limit v8).
 * - Emits standard `RateLimit-*` headers (standardHeaders: true).
 * - On limit exceeded, sets `Retry-After` and returns a 429 JSON response.
 */
const createLimiter = (
    windowMs: number,
    max: number,
    message: string,
    keyByUser: boolean = true
) =>
    rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,

        keyGenerator: (req: Request, res: Response) => {
            if (keyByUser && req.user?.id) {
                return req.user.id;
            }
            // ipKeyGenerator (express-rate-limit v8) takes the IP string, not req/res —
            // it returns a CIDR-subnet key for IPv6 so /64s aren't each unique buckets.
            return ipKeyGenerator(req.ip ?? '');
        },

        handler: (req: Request, res: Response) => {
            const resetTime = (req as any).rateLimit?.resetTime;
            const retryAfter = resetTime
                ? Math.ceil((resetTime.getTime() - Date.now()) / 1000)
                : Math.ceil(windowMs / 1000);

            res.setHeader('Retry-After', String(retryAfter));

            res.status(429).json({ message });
        }
    });

/**
 * Limits each user/IP to 20 code-execution requests per 60-second window.
 * Applied to the code-execution endpoint (authenticated routes only).
 */
export const executionRateLimiter = createLimiter(
    60 * 1000,
    20,
    'Too many requests, please try again later.'
);

/**
 * Limits each IP to 10 login attempts per 15 minutes (brute-force mitigation).
 * Applied to POST /api/users/login (unauthenticated — IP-keyed).
 */
export const loginLimiter = createLimiter(
    15 * 60 * 1000,
    10,
    'Too many login attempts, please try again later.',
    false // always IP-keyed: attacker may not have a valid user id yet
);

/**
 * Limits each IP to 5 registrations per hour (spam account mitigation).
 * Applied to POST /api/users (unauthenticated — IP-keyed).
 */
export const registerLimiter = createLimiter(
    60 * 60 * 1000,
    5,
    'Too many accounts created from this network, please try again later.',
    false // always IP-keyed: no user exists at registration time
);

/**
 * Limits each IP to 10 Google sign-in attempts per 15 minutes.
 * Applied to POST /api/users/google (unauthenticated — IP-keyed).
 */
export const googleAuthLimiter = createLimiter(
    15 * 60 * 1000,
    10,
    'Too many Google sign-in attempts, please try again later.',
    false // IP-keyed: verification happens before a user session exists
);

/**
 * Limits each authenticated user (falling back to IP) to 30 chat requests per day.
 * Applied to POST /api/chat AFTER the protect middleware.
 */
export const chatLimiter = createLimiter(
    24 * 60 * 60 * 1000,
    30,
    'Daily chat limit reached. Please try again tomorrow.'
);