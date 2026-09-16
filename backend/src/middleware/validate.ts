import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Generic request-validation middleware driven by a zod schema.
 *
 * On success: parses/casts/coerces req.body in place and calls next().
 * On failure: responds 400 with { message, errors } and short-circuits the chain.
 *
 * The controllers' own manual checks remain in place as a second line of defense.
 */
export const validate =
    (schema: ZodSchema) =>
    (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message
            }));

            res.status(400).json({
                message: 'Validation failed',
                errors
            });
            return;
        }

        // Replace body with the (coerced/transformed) parsed data
        (req as any).body = result.data;
        next();
    };