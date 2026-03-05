import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config dành riêng cho frontend_admin (CMS),
// chạy độc lập trên port 8000.
export default defineConfig({
  root: 'frontend_admin',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8000,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': '/',
    },
  },
});

