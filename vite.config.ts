import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { weekBoxHostPlugin } from './vite-plugins/host-bridge/index.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), weekBoxHostPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/')
          if (normalized.includes('/node_modules/')) {
            if (
              normalized.includes('/node_modules/react/') ||
              normalized.includes('/node_modules/react-dom/') ||
              normalized.includes('/node_modules/react-router/') ||
              normalized.includes('/node_modules/react-router-dom/')
            ) {
              return 'vendor-react'
            }
            if (normalized.includes('/node_modules/@m3e/')) {
              return 'vendor-m3e'
            }
            if (
              normalized.includes('/node_modules/gsap/') ||
              normalized.includes('/node_modules/@gsap/')
            ) {
              return 'vendor-gsap'
            }
            if (
              normalized.includes('/node_modules/@neutralinojs/') ||
              normalized.includes('/node_modules/@capacitor/')
            ) {
              return 'vendor-host'
            }
            return 'vendor-misc'
          }
        },
      },
    },
  },
})
