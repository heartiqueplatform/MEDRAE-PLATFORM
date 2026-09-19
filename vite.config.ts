import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

process.env.NODE_ENV = process.env.NODE_ENV || "development";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: '/',
    server: {
      host: "::",
      port: 8080
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: 'auto',
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwaa-512x512.png',
          'maskable-icon.png'
        ],
        manifest: {
          name: "Medrae Nursing",
          short_name: "Medrae Nursing",
          description: "Structured NCK-style exam practice with 6,500+ questions",
          theme_color: "#4ade80",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait-primary",
          scope: "/",
          start_url: "/",
          categories: ["education", "medical", "health", "reference"],
          lang: "en",
          dir: "ltr",
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
              src: "maskable-icon.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            },
            {
              src: "apple-touch-icon.png",
              sizes: "180x180",
              type: "image/png"
            }
          ],
          screenshots: [
            {
              src: "/screenshot-mobile.png",
              sizes: "360x640",
              type: "image/png",
              platform: "wide",
              label: "Medrae Nursing - Home Screen"
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 60 * 1024 * 1024,

          // ✅ EDIT 1: Only precache truly static assets.
          // HTML and JS go through navigateFallback + runtimeCaching
          // so a new deploy is picked up on the first reload.
          globPatterns: [
            "**/*.{ico,png,svg,jpeg,jpg,woff2,woff,mp3,mp4,webm}"
          ],

          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: 'index.html',
          directoryIndex: 'index.html',

          // ✅ EDIT 3: Strict denylist for real asset extensions.
          // Removed the greedy /[.][a-zA-Z0-9]+$/ that broke deep links.
          navigateFallbackDenylist: [
            /\.(?:js|css|map|json|png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|mp3|mp4|webm)$/,
            /^\/api/,
            /^\/__/,
          ],

          runtimeCaching: [
            {
              // Images & Fonts — safe to cache aggressively
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|woff2|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'medrae-static-assets',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
            {
              // Internal API calls — network first
              urlPattern: /^\/api\/.*/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'medrae-api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60,
                },
              },
            },
            {
              // ✅ EDIT 2: Supabase — NetworkOnly.
              // Our own localStorage / IndexedDB caches handle offline.
              // The SW gets out of the way so mobile doesn't wait 15s for
              // a NetworkFirst fallback on every API call.
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
              handler: 'NetworkOnly',
            }
          ]
        },
        devOptions: {
          // ✅ BONUS: turn OFF the SW in dev to avoid stale caches during
          // local development. Production builds still register it.
          enabled: false,
          type: 'module',
          navigateFallback: 'index.html'
        }
      })
    ].filter(Boolean),
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") }
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {

        }
      }
    }
  };
});