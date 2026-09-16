import { z } from 'zod';

/**
 * Auth request-body schemas (zod).
 * Controllers keep their own manual checks as a second line of defense.
 */
export const registerSchema = z.object({
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(80, 'Name must be at most 80 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters')
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
});

export const googleAuthSchema = z
    .object({
        // The live frontend (app/src/contexts/AuthContext.tsx) posts { token }.
        // Accept `credential` as an alias, but require a non-empty string either way.
        token: z.string().optional(),
        credential: z.string().optional()
    })
    .refine((data) => (data.token ?? data.credential) !== undefined, {
        message: 'Google credential is required'
    })
    .refine((data) => typeof (data.token ?? data.credential) === 'string' && (data.token ?? data.credential)!.length > 0, {
        message: 'Google credential must be a non-empty string'
    });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;