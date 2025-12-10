import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: This must match your GitHub repository name exactly, with slashes.
  base: '/ChristmasTreeV2/', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Ensure we don't produce assets with underscores that GitHub Pages might ignore
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
});