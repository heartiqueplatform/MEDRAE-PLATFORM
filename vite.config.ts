import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

process.env.NODE_ENV = process.env.NODE_ENV || "development";

/**
 * MEDRAE Nursing brand mark (heart + graduation cap)
 * Inlined as a data URI so it works in the manifest without needing a file in /public.
 */
const MEDRAE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect x="0" y="0" width="192" height="192" rx="35" fill="#FFFFFF"/>
  <path d="M96 169 C91 165 31 116 20 91 C8 64 23 38 48 32 C67 27 84 35 96 50 C108 35 125 27 144 32 C169 38 184 64 172 91 C161 116 101 165 96 169 Z" fill="#FF1F1F"/>
  <path d="M44 82 L96 63 L150 82 L96 101 Z" fill="#FFFFFF"/>
  <path d="M62 88 V105 C62 111 77 119 96 122 C115 119 130 111 130 105 V88 L96 101 Z" fill="#FFFFFF"/>
  <path d="M62 91 V105 C62 111 77 119 96 122 C115 119 130 111 130 105 V91" fill="none" stroke="#FF1F1F" stroke-width="3" stroke-linecap="round"/>
  <path d="M96 82 V101" stroke="#FF1F1F" stroke-width="2.5"/>
  <circle cx="94" cy="82" r="3.5" fill="#FF1F1F"/>
  <path d="M94 82 C86 86 75 88 63 89" fill="none" stroke="#FF1F1F" stroke-width="2"/>
  <path d="M63 89 C61 94 61 98 61 103" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="61" cy="105" r="4" fill="#FFFFFF"/>
  <path d="M57 108 L65 108 L67 122 C63 124 59 124 55 122 Z" fill="#FFFFFF"/>
</svg>`;

/** Encode SVG as a data URI for use in the manifest */
const MEDRAE_SVG_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(MEDRAE_SVG)}`;

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
          // PNG fallbacks for older browsers
          'pwa-192x192.png',
          'pwaa-512x512.png',
          'maskable-icon.png'
        ],
        manifest: {
          name: "Medrae Nursing",
          short_name: "Medrae Nursing",
          description: "Structured NCK-style exam practice with 6,500+ questions",
          theme_color: "#FF1F1F",   // match your red brand mark
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait-primary",
          scope: "/",
          start_url: "/",
          categories: ["education", "medical", "health", "reference"],
          lang: "en",
          dir: "ltr",
          icons: [
            // ✨ Primary: inline SVG logo (crisp at every size)
            {
              src: MEDRAE_SVG_DATA_URI,
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any"
            },
            {
              src: MEDRAE_SVG_DATA_URI,
              sizes: "any",
              type: "image/svg+xml",
              purpose: "maskable"
            },
            // 🔁 PNG fallbacks for browsers that don't yet support SVG icons
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
        output: {}
      }
    }
  };
});