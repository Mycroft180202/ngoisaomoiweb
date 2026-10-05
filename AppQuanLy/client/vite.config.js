import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.BUILD_TARGET === 'desktop' ? './' : '/quanly/',
  build: {
    outDir: 'dist',
  }
});
