import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa"; // <--- THIS WAS LIKELY MISSING

process.env.NODE_ENV = process.env.NODE_ENV || "development";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080
    },
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
        registerType: "autoUpdate",
        injectRegister: "auto",
        devOptions: {
          enabled: true // Allows you to test PWA features in dev mode
        },
        manifest: {
          name: "MEDRAE NURSING",
          short_name: "MEDRAE",
          description: "Structured NCK-style exam practice with 6,000+ questions",
          theme_color: "#4ade80",
          background_color: "#ffffff",
          display: "standalone",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "pwaa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "pwaa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ]
        },
        workbox: {

          globPatterns: ["**/*.{js,css,html,ico,png,svg,jpeg}"],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          navigateFallback: "index.html",

          // ADD THIS SECTION BELOW:
          runtimeCaching: [
            {
              // This matches your API calls (change the URL to match your backend)
              urlPattern: /^https:\/\/your-api-url\.com\/.* /i,
              handler: 'NetworkFirst', // It tries to get fresh data, but uses cache if offline
              options: {
                cacheName: 'api-data-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // Cache data for 1 week
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        }
      })
    ].filter(Boolean),
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") }
    },
    define: {
      "process.env": env
    },
    optimizeDeps: {
      include: ["react", "react-dom"]
    }
  };
});