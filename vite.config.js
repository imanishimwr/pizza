import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    // The menu bundle, the receipt/PDF code and the map are three genuinely
    // separate concerns. Shipping them as one 1.2 MB chunk meant the menu could
    // not paint until jsPDF had parsed.
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'map', test: /node_modules[\\/]leaflet[\\/]/ },
            { name: 'pdf', test: /node_modules[\\/](jspdf|jspdf-autotable)[\\/]/ }
          ]
        }
      }
    },
    chunkSizeWarningLimit: 700
  }
});
