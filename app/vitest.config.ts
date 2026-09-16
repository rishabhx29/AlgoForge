import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for the frontend.
 *
 * Kept separate from vite.config.ts (which exports a *function* config for the
 * app build) so test concerns never leak into production builds. Vitest gives
 * this file precedence when present.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/utils/**'],
      exclude: ['**/*.test.*', 'src/test/**'],
    },
  },
});
