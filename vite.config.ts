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
        injectRegister: 'auto', // Changed from 'inline' to 'auto'
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
          globPatterns: [
            "**/*.{js,css,html,ico,png,svg,jpeg,jpg,woff2,woff,json,mp4,mp3,webm}"
          ],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: 'index.html',
          directoryIndex: 'index.html',
          navigateFallbackDenylist: [
            /[.][a-zA-Z0-9]+$/,
            /^\/api/,
            /^\/__/
          ],
          navigateFallbackAllowlist: [/^(?!\/__).*/],
          runtimeCaching: [
            {
              // Images & Fonts
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
              // API calls - network first for fresh data
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
              // Supabase calls
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60,
                },
              },
            }
          ]
        },
        devOptions: {
          enabled: true,
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