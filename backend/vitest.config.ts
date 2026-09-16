import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        env: {
            // Test-only JWT secret — must satisfy the >= 32 char rule enforced
            // by src/config/env.ts. Never a real production secret.
            JWT_SECRET: 'test-only-secret-key-0123456789abcdef',
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: [
                'src/controllers/authController.ts',
                'src/controllers/userActionController.ts',
            ],
        },
    },
});