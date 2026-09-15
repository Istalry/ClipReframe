import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';

const shared = resolve(__dirname, 'src/shared');

export default defineConfig({
  main: {
    resolve: { alias: { '@shared': shared } },
  },
  preload: {
    resolve: { alias: { '@shared': shared } },
    // Sandboxed preload scripts run as plain scripts and cannot use ESM imports.
    build: { rollupOptions: { output: { format: 'cjs' } } },
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        '@shared': shared,
      },
    },
    plugins: [react(), tailwindcss()],
  },
});
