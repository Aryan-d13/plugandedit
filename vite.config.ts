import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    fs: {
      strict: false,
      allow: ['..']
    },
    // Proxy /api-data/* → backend at localhost:8000
    // This is a SAME-ORIGIN request from the browser's perspective,
    // so COEP (require-corp) doesn't block it.
    // Uses http-proxy under the hood — handles large binary streaming correctly.
    proxy: {
      '/api-data': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-data/, ''),
      }
    }
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
  }
})
