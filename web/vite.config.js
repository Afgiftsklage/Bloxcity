import { defineConfig } from 'vite';
import path from 'node:path';
// The episodes/ folder lives outside the vite root; expose it at /episodes/* (timeline json, shots).
export default defineConfig({
  root: path.resolve(import.meta.dirname),
  publicDir: 'public',
  server: { fs: { allow: [path.resolve(import.meta.dirname, '..')] }, hmr: false },
  resolve: { alias: { '@episodes': path.resolve(import.meta.dirname, '../episodes') } },
  optimizeDeps: { include: ['three'] },
});
