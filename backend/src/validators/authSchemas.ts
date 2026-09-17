import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(1, 'Password is required');

/**
 * Auth request-body schemas (zod).
 * Controllers keep their own manual checks as a second line of defense.
 */
export const registerSchema = z.object({
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(80, 'Name must be at most 80 characters'),
    email: emailSchema,
    password: z.string().min(8, 'Password must be at least 8 characters')
});

export const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema
});

export const googleAuthSchema = z
    .object({
        // AuthContext posts { token }; `credential` is accepted as an alias.
        token: z.string().min(1).optional(),
        credential: z.string().min(1).optional()
    })
    .refine((data) => Boolean(data.token ?? data.credential), {
        message: 'Google credential is required'
    });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;