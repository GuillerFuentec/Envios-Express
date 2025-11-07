import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    root: __dirname,
    envPrefix: 'VITE_',
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: isDev,
      assetsDir: 'assets',
      assetsInlineLimit: 0,
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
      },
    },
  };
});
