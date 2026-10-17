import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Public website dev server. Proxies API + media to the Django backend so the
// SPA and API share an origin (no CORS in dev). Runs on a distinct port from the
// staff panel (5173) to allow running both apps at once.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "/media": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
