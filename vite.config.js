import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  define: {
    __SERVER_FORWARD_CONSOLE__: false
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    open: true
  }
});

