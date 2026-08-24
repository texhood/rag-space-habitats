import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    {
      name: 'js-as-jsx',
      async transform(code, id) {
        if (!id.includes('/src/') || !id.endsWith('.js')) {
          return null;
        }
        return transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic',
        });
      },
    },
    react(),
  ],
  envPrefix: 'REACT_APP_',
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'build',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
});
