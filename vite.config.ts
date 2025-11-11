import { defineConfig, loadEnv } from "vite"; // ✅ added loadEnv for environment variables
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// ✅ Added: Default export for Node version hint (for local builds)
process.env.NODE_ENV = process.env.NODE_ENV || "development";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // ✅ Load environment variables for both dev and build
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
    },

    // ✅ Build optimization and compatibility for Vercel
    build: {
      chunkSizeWarningLimit: 1500,
      target: "esnext", // for modern browser support
      outDir: "dist", // default Vercel expects
      sourcemap: mode === "development", // helpful during debugging
    },

    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "favicon.svg",
          "robots.txt",
          "pwa-192x192.jpeg",
          "pwa-512x512.jpeg", // ✅ fixed “pneg” typo
        ],
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
            { src: "/pwa-512x512.jpeg", sizes: "512x512", type: "image/jpeg" },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /\/.*\.(?:css|json)$/,
              handler: "NetworkFirst",
              options: {
                cacheName: "static-resources",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: /\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/, // ✅ added webp
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

    // ✅ Define global environment vars to prevent undefined errors
    define: {
      "process.env": env,
    },

    // ✅ Added this for compatibility on Vercel
    optimizeDeps: {
      include: ["react", "react-dom"],
    },
  };
});
