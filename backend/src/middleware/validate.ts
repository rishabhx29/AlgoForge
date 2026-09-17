import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

/**
 * Generic request-body validation middleware driven by a zod schema.
 *
 * On success: parses/casts/coerces req.body in place and calls next().
 * On failure: responds 400 with { message, errors } and short-circuits the chain.
 *
 * Callers may restrict validation to whitelisted fields; unexpected properties
 * are stripped before the controller sees the parsed body.
 */
export const validate =
    (schema: ZodType, fields?: readonly string[]) =>
    (req: Request, res: Response, next: NextFunction) => {
        const source = fields
            ? Object.fromEntries(fields.filter((field) => field in req.body).map((field) => [field, req.body[field]]))
            : req.body;
        const result = (schema as { safeParse: (value: unknown) => any }).safeParse(source);

        if (!result.success) {
            const errors = result.error.issues.map((issue: { path: Array<string | number>; message: string }) => ({
                path: issue.path.join('.'),
                message: issue.message
            }));

            res.status(400).json({
                message: 'Validation failed',
                errors
            });
            return;
        }

        req.body = result.data;
        next();
    };