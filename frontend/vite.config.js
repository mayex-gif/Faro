import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const proxy = { '/api': { target: process.env.API_PROXY_TARGET || 'http://localhost:8080', changeOrigin: true } }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: { input: { principal: 'index.html', consulta: 'sin-conexion.html' } },
  },
  preview: { proxy },
  server: {
    // En Windows + Docker, Vite no siempre se entera solo de que guardaste un archivo.
    // Con "polling" revisa cada tanto si algo cambió, así la página se actualiza sola.
    watch: { usePolling: true },
    // Todo pedido que empiece con /api se reenvía al backend
    proxy,
  },
})
