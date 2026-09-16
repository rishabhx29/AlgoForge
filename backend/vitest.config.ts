import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        env: {
            // Test-only dummy values — every variable enforced by
            // src/config/env.ts must be present or the import chain throws.
            // Never real production secrets.
            PORT: '5000',
            MONGO_URI: 'mongodb://127.0.0.1:27017/algoforge-test',
            JWT_SECRET: 'test-only-secret-key-0123456789abcdef',
            GOOGLE_CLIENT_ID: 'test-only-google-client-id.apps.googleusercontent.com',
            CLIENT_URL: 'http://localhost:5173',
            GEMINI_API_KEY: 'test-only-gemini-key',
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