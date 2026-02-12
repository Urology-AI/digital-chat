import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Allow external connections
    hmr: {
      // Enable Hot Module Replacement
      overlay: true, // Show errors in browser overlay
    },
    watch: {
      // Watch for file changes
      usePolling: false, // Use native file system events (faster)
      interval: 100, // Polling interval if usePolling is true
    },
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/media": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Enable source maps for better debugging
    sourcemap: true,
    // Watch mode for production builds (useful for testing)
    watch: null, // Set to {} to enable watch mode
  },
});
