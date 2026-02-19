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
        injectRegister: "auto",
        registerType: "autoUpdate",
        manifest: {
          name: "MEDRAE",
          short_name: "MEDRAE",
          description: "Structured NCK- style exam practice with 6,000+ questions, unit- based revision and smart performance tracking",
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
          globPatterns: ["**/*.{js,css,html,png,jpeg,svg,ico}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
              handler: "NetworkFirst",
              options: { cacheName: "api-cache", expiration: { maxEntries: 50, maxAgeSeconds: 3600 } }
            }
          ],
          navigateFallback: "/index.html",
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
        }
      })


    ].filter(Boolean),
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    define: { "process.env": env },
    optimizeDeps: { include: ["react", "react-dom"] }
  };
});
