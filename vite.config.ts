import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Dev-proxy to the NestJS backend: the frontend calls /api/v1/... and
    // /uploads/... on its own origin, so no backend CORS setup is needed.
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
      // Socket.IO handshake + websocket upgrade (game protocol, tasks 0051+).
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
})
