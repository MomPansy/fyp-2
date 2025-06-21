import { defineConfig } from 'vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: 'dist/static',
  },
  server: {
    host: '127.0.0.1',
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    TanStackRouterVite({ addExtensions: true, semicolons: true }),
    tsconfigPaths(),
    react(),
  ],
});
