import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['t.peiapp.tech']
  },
  preview: {
    allowedHosts: ['t.peiapp.tech']
  }
})
