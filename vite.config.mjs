import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, 'client'),
  // Relative base path ensures assets work on any GitHub Pages repo URL (/ChoreTracker/ or /)
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    fs: {
      // Allow importing ../google-apps-script/Code.gs?raw for the 1-click Copy button
      allow: [path.resolve(__dirname)]
    },
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true
  }
});
