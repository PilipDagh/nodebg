import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000
  },
  server: {
    port: 3000,
    open: true
  }
});
