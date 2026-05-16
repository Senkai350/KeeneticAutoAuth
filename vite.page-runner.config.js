import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve('src/extension/page-runner.ts'),
      formats: ['iife'],
      name: 'KeeneticPageRunner',
      fileName: () => 'page-runner.js',
    },
    outDir: 'dist/assets',
    emptyOutDir: false,
  },
});
