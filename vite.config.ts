import path from "node:path";
import { defineConfig } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: "dist/static",
  },
  server: {
    host: "127.0.0.1",
    open: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ["@electric-sql/pglite"],
  },
  plugins: [
    tanstackRouter({ addExtensions: true, semicolons: true }),
    tsconfigPaths(),
    react(),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
        additionalData: `@use "${path
          .join(process.cwd(), "src/_mantine")
          .replace(/\\/g, "/")}" as mantine;`,
      },
    },
  },
});
