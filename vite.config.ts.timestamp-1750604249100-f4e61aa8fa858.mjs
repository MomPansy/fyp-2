// vite.config.ts
import { defineConfig } from "file:///C:/Users/jayde/Coding/school-projects/fyp2/node_modules/.pnpm/vite@5.4.18_@types+node@22.14.1_sugarss@4.0.1_postcss@8.5.3_/node_modules/vite/dist/node/index.js";
import { TanStackRouterVite } from "file:///C:/Users/jayde/Coding/school-projects/fyp2/node_modules/.pnpm/@tanstack+router-plugin@1.1_a2efa56aad7fff7b1712d40fab784397/node_modules/@tanstack/router-plugin/dist/esm/vite.js";
import tsconfigPaths from "file:///C:/Users/jayde/Coding/school-projects/fyp2/node_modules/.pnpm/vite-tsconfig-paths@5.1.4_t_6f6158c68bdaea67e28b184ce7774f04/node_modules/vite-tsconfig-paths/dist/index.js";
import react from "file:///C:/Users/jayde/Coding/school-projects/fyp2/node_modules/.pnpm/@vitejs+plugin-react-swc@3._f66d4ab3b5db50d694bfbc487f19f9c8/node_modules/@vitejs/plugin-react-swc/index.mjs";
var vite_config_default = defineConfig({
  build: {
    outDir: "dist/static"
  },
  server: {
    host: "127.0.0.1",
    open: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true
      }
    }
  },
  plugins: [
    TanStackRouterVite({ addExtensions: true, semicolons: true }),
    tsconfigPaths(),
    react()
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxqYXlkZVxcXFxDb2RpbmdcXFxcc2Nob29sLXByb2plY3RzXFxcXGZ5cDJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGpheWRlXFxcXENvZGluZ1xcXFxzY2hvb2wtcHJvamVjdHNcXFxcZnlwMlxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvamF5ZGUvQ29kaW5nL3NjaG9vbC1wcm9qZWN0cy9meXAyL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCB7IFRhblN0YWNrUm91dGVyVml0ZSB9IGZyb20gJ0B0YW5zdGFjay9yb3V0ZXItcGx1Z2luL3ZpdGUnO1xyXG5pbXBvcnQgdHNjb25maWdQYXRocyBmcm9tICd2aXRlLXRzY29uZmlnLXBhdGhzJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0LXN3Yyc7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIGJ1aWxkOiB7XHJcbiAgICBvdXREaXI6ICdkaXN0L3N0YXRpYycsXHJcbiAgfSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIGhvc3Q6ICcxMjcuMC4wLjEnLFxyXG4gICAgb3BlbjogdHJ1ZSxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgICcvYXBpJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly8xMjcuMC4wLjE6MzAwMCcsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIFRhblN0YWNrUm91dGVyVml0ZSh7IGFkZEV4dGVuc2lvbnM6IHRydWUsIHNlbWljb2xvbnM6IHRydWUgfSksXHJcbiAgICB0c2NvbmZpZ1BhdGhzKCksXHJcbiAgICByZWFjdCgpLFxyXG4gIF0sXHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTRULFNBQVMsb0JBQW9CO0FBQ3pWLFNBQVMsMEJBQTBCO0FBQ25DLE9BQU8sbUJBQW1CO0FBQzFCLE9BQU8sV0FBVztBQUdsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLG1CQUFtQixFQUFFLGVBQWUsTUFBTSxZQUFZLEtBQUssQ0FBQztBQUFBLElBQzVELGNBQWM7QUFBQSxJQUNkLE1BQU07QUFBQSxFQUNSO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
