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
        name: "HEARTIQUE NURSING NEXUS SCHOLAR",
        short_name: "HEARTIQUE X",
        description: "App for NCK/FQE exam revision ",
        theme_color: "#00000000", // transparent nav bar
        background_color: "#ffffff",
        display: "standalone", // looks like native app
        display_override: ["standalone", "fullscreen"], // try fullscreen when possible
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB limit
        runtimeCaching: [
          // ✅ Only cache CSS & JSON (skip large JS bundles)
          {
            urlPattern: /\/.*\.(?:css|json)$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "static-resources",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 days
            },
          },
          // ✅ Cache images
          {
            urlPattern: /\/.*\.(?:png|jpg|jpeg|svg|gif)$/,
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
