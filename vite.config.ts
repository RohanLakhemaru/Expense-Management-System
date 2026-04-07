import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/'
    }
  },
  server: {
    proxy: {
      '/pinnacle-expense-manager': {
        target: 'http://127.0.0.1',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})