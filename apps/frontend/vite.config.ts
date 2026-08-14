/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  optimizeDeps: {
    include: ['@shared/utils/dist/academicConfig']
  },
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  server: {
    proxy: {
      '/api/auth': {
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
      '/api/users': {
        target: 'http://localhost:4002',
        changeOrigin: true,
      },
      '/api/notifications': {
        target: 'http://localhost:4002',
        changeOrigin: true,
      },
      '/api/ai': {
        target: 'http://localhost:4003',
        changeOrigin: true,
      },
      '/api/courses': {
        target: 'http://localhost:4004',
        changeOrigin: true,
      },
      '/api/homework': {
        target: 'http://localhost:4004',
        changeOrigin: true,
      },
      '/api/exams': {
        target: 'http://localhost:4004',
        changeOrigin: true,
      },
      '/api/questions': {
        target: 'http://localhost:4004',
        changeOrigin: true,
      },
      '/api/analytics': {
        target: 'http://localhost:4005',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
