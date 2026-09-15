import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/

/**
 * CSP shared by the dev server and `vite preview`.
 *
 * Note the deliberate absence of `'unsafe-inline'` in `script-src`. The production
 * deployment sets its CSP at the edge (Vercel headers), and inlining scripts there would
 * defeat the policy, so it is not added here either.
 *
 * The dev server is the one exception — see `DEV_CSP` below.
 */
const BASE_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' https://accounts.google.com https://cdn.jsdelivr.net https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "connect-src 'self' ws: wss: https://algoforge-2-0.onrender.com http://localhost:5000 http://127.0.0.1:5000 https://accounts.google.com https://www.googleapis.com https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com https://va.vercel-scripts.com https://*.vercel-insights.com",
  /* `data:` is required here: Monaco bundles its codicon icon font as an inline
   * base64 data URI, and without it the editor's icon glyphs are blocked. A
   * data URI font is part of the bundle — it cannot fetch third-party code or
   * exfiltrate anything — so this does not weaken the policy. `img-src` already
   * permits `data:` on the same reasoning. Keep in sync with app/vercel.json. */
  "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.googleusercontent.com https://cdn.jsdelivr.net",
  "frame-src 'self' https://accounts.google.com",
  "child-src 'self' blob: https://accounts.google.com",
  "worker-src 'self' blob: https://cdn.jsdelivr.net",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ') + ';'

/**
 * Dev-only CSP. `@vitejs/plugin-react` injects its React Refresh preamble as an INLINE
 * `<script type="module">`, which the `BASE_CSP` above blocks — producing the classic
 * "@vitejs/plugin-react can't detect preamble" error and a blank page.
 *
 * `'unsafe-inline'` is therefore added for the dev server ONLY. This never reaches a
 * production build: `vite build` emits no CSP at all, and the deployed headers come from
 * the edge. Keeping the relaxation scoped here means we get a working dev server without
 * weakening the policy that actually ships.
 *
 * Also note: do NOT set `server.host` to '127.0.0.1'. Vite's default `localhost` binding
 * resolves to `::1` on Windows, and the backend's CORS allowlist (backend/src/server.ts)
 * matches the literal string `http://localhost:5173`. Browsing via `127.0.0.1:5173` sends
 * an `Origin` of `http://127.0.0.1:5173`, which is NOT allowlisted, so every API call
 * fails CORS with a misleading "Network Error". Always use `http://localhost:5173`.
 */
const DEV_CSP = BASE_CSP.replace(
  "script-src 'self' 'unsafe-eval'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
)

const SECURITY_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
}

export default defineConfig(() => ({
  base: '/',
  server: {
    headers: {
      'Content-Security-Policy': DEV_CSP,
      ...SECURITY_HEADERS,
    }
  },
  preview: {
    headers: {
      'Content-Security-Policy': BASE_CSP,
      ...SECURITY_HEADERS,
    }
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      process.env.VITE_API_BASE_URL || (process.env.VERCEL ? 'https://algoforge-2-0.onrender.com' : '')
    ),
  },
  build: {
    // Target modern browsers for smaller, faster output
    target: 'esnext',
    // Use esbuild for minification (much faster than terser)
    minify: 'esbuild',
    // Raise the warning threshold slightly — we're code splitting
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Heavy animation library
          if (id.includes('framer-motion')) return 'vendor-framer-motion';
          // Code editor (very heavy ~2MB, only used in ProblemWorkspace)
          if (id.includes('@monaco-editor') || id.includes('monaco-editor')) return 'vendor-monaco';
          // Charts (only used in Dashboard)
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-recharts';
          // React Query
          if (id.includes('@tanstack')) return 'vendor-tanstack';
          // Radix UI primitives
          if (id.includes('@radix-ui')) return 'vendor-radix';
          // GSAP animation library
          if (id.includes('gsap')) return 'vendor-gsap';
          // React markdown rendering
          if (id.includes('react-markdown') || id.includes('remark') || id.includes('micromark')) return 'vendor-markdown';
          // Remaining node_modules go into a general vendor chunk
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
}));
