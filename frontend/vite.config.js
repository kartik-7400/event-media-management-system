import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
      '/socket.io': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
    },
  },
});
