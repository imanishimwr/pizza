import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // Load env from both the frontend root AND Pizza-Backend so we can read PORT
  const frontendEnv = loadEnv(mode, process.cwd(), '');
  // Prefer BACKEND_PORT env var, then PORT from .env, then fallback 5002
  const backendPort = frontendEnv.BACKEND_PORT || frontendEnv.PORT || '5002';
  const backendUrl = `http://localhost:${backendPort}`;

  return {
    define: {
      __SERVER_FORWARD_CONSOLE__: false
    },
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      open: true,
      proxy: {
        // All /api/* requests are forwarded to the backend
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false
        },
        // Socket.io websocket traffic forwarded to the backend
        '/socket.io': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          ws: true
        }
      }
    }
  };
});

