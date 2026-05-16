// vite.config.js
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

function copyManifest() {
  return {
    name: 'copy-manifest',
    closeBundle() {
      copyFileSync(
        resolve('manifest.json'),
        resolve('dist', 'manifest.json'),
      );
    },
  };
}

export default defineConfig({
  plugins: [vue(), copyManifest()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve('popup.html'),
        background: resolve('src/extension/background.ts'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
