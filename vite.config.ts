import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

process.env.NODE_ENV = process.env.NODE_ENV || "development";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: { host: "::", port: 8080 },
    build: {
      target: "esnext",
      outDir: "dist",
      sourcemap: mode === "development",
      chunkSizeWarningLimit: 1500
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        strategies: "generateSW",
        useCredentials: false,
        injectRegister: "auto",
        registerType: "autoUpdate",
        devOptions: { enabled: true },
        includeAssets: ["robots.txt", "offline.html"],

        manifest: {
          name: "MEDRAE",
          short_name: "MEDRAE",
          description:
            "Comprehensive medical education platform for healthcare students and professionals — featuring structured study modules, clinical case simulations, progress tracking, and interactive learning tools.",
          theme_color: "#4ade80",
          background_color: "#ffffff",
          display: "standalone",
          scope: "/",
          start_url: "/",
          icons: [
            { src: "/pwa-192x192.jpeg", sizes: "192x192", type: "image/jpeg" },
            { src: "/pwa-512x512.jpeg", sizes: "512x512", type: "image/jpeg" }
          ]
        },

        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ["**/*.{html,js,css,png,svg,jpg,jpeg,webp,json}"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/assets\//,
            /^\/favicon\.ico$/,
          ],

          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname === "/", // dashboard root
              handler: "CacheFirst",
              options: {
                cacheName: "dashboard-cache",
                expiration: { maxEntries: 1, maxAgeSeconds: 24 * 60 * 60 } // 1 day
              }
            },

            {
              urlPattern: ({ request }) =>
                request.destination === "script" || request.destination === "style",
              handler: "CacheFirst",
              options: {
                cacheName: "js-css-cache",
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 }
              }
            },
            {
              urlPattern: ({ request }) => request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "images",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }
              }
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith("/api"),
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 6 }
              }
            }
          ],
          cleanupOutdatedCaches: true
        }
      })
    ].filter(Boolean),
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    define: { "process.env": env },
    optimizeDeps: { include: ["react", "react-dom"] }
  };
});
