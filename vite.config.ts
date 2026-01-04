import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    // Use 8001 for fresh start
    port: 8001,
    host: '0.0.0.0',
  },
  plugins: [react()],
  // No need for define block - Vite auto-exposes VITE_* variables via import.meta.env
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
