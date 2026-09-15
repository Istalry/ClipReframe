import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const alias = {
  '@renderer': resolve(__dirname, 'src/renderer/src'),
  '@shared': resolve(__dirname, 'src/shared'),
};

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/shared/**', 'src/main/services/**'],
    },
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'node',
          globals: true,
          environment: 'node',
          include: ['src/{main,preload,shared}/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'renderer',
          globals: true,
          environment: 'jsdom',
          include: ['src/renderer/**/*.test.{ts,tsx}'],
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
  },
});
