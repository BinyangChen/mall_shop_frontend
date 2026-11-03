import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const isAdmin = mode === 'admin';

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: isAdmin ? 5174 : 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: isAdmin ? 4174 : 4173,
      strictPort: true,
    },
    build: {
      outDir: isAdmin ? 'dist-admin' : 'dist',
    },
    test: {
      environment: 'jsdom',
      globals: true,
    },
  };
});
