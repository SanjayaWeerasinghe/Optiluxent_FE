import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Eager warmup of the most common chunks — keeps the first cold-browser
    // request to /login under a second instead of the ~6s Vite spends scanning
    // and prebundling deps on demand.
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/router/index.tsx',
        './src/pages/auth/LoginPage.tsx',
      ],
    },
  },
  optimizeDeps: {
    // Pre-bundle these at server start so the first request doesn't trigger
    // a stop-the-world esbuild scan.
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
    ],
  },
})
