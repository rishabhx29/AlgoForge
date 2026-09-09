import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(() => ({
  base: '/',
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' https://accounts.google.com https://cdn.jsdelivr.net https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; connect-src 'self' ws: wss: https://algoforge-2-0.onrender.com http://localhost:5000 https://accounts.google.com https://www.googleapis.com https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com https://va.vercel-scripts.com https://*.vercel-insights.com; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.googleusercontent.com https://cdn.jsdelivr.net; frame-src 'self' https://accounts.google.com; child-src 'self' blob: https://accounts.google.com; worker-src 'self' blob: https://cdn.jsdelivr.net; form-action 'self'; frame-ancestors 'self';",
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    }
  },
  preview: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' https://accounts.google.com https://cdn.jsdelivr.net https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; connect-src 'self' ws: wss: https://algoforge-2-0.onrender.com http://localhost:5000 https://accounts.google.com https://www.googleapis.com https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com https://va.vercel-scripts.com https://*.vercel-insights.com; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.googleusercontent.com https://cdn.jsdelivr.net; frame-src 'self' https://accounts.google.com; child-src 'self' blob: https://accounts.google.com; worker-src 'self' blob: https://cdn.jsdelivr.net; form-action 'self'; frame-ancestors 'self';",
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
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
