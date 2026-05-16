import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve('src/extension/content-script.ts'),
      formats: ['iife'],
      name: 'KeeneticContentScript',
      fileName: () => 'content-script.js',
    },
    outDir: 'dist/assets',
    emptyOutDir: false,
  },
});
