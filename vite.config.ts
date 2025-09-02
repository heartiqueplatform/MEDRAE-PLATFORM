import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // ✅ standard plugin
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), // ✅ use this instead of swc
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate", // auto update service worker
      includeAssets: ["favicon.svg", "robots.txt", "pwa-192x192.png", "pwa-512x512.png"], 
      manifest: {
        name: "NCK Simulation App",
        short_name: "Simulation",
        description: "Simulation app for NCK exams",
        theme_color: "#4ade80",
        background_color: "#ffffff",
        display: "standalone", // looks like native app
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/.*\.(?:js|ts|css|json)$/, // cache all JS, CSS, JSON
            handler: "NetworkFirst",
            options: {
              cacheName: "static-resources",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 days
            },
          },
          {
            urlPattern: /\/.*\.(?:png|jpg|jpeg|svg|gif)$/, // cache images
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
