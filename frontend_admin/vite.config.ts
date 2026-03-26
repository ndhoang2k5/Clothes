import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Thư mục gốc monorepo (Clothes/) — dùng chung `.env*` với shop */
const repoRoot = path.resolve(__dirname, '..');

// Vite config dành cho frontend_admin (CMS), dev port 8000.
export default defineConfig({
  root: __dirname,
  envDir: repoRoot,
  // Production deploy under https://unbee.vn/admin/
  // (Keeps shop assets and admin assets separated).
  base: '/admin/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8000,
    strictPort: true,
  },
  build: {
    outDir: path.join(__dirname, 'dist'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': '/',
    },
  },
});

