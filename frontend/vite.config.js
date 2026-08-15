import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  base: '/',

  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:80',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:80',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
