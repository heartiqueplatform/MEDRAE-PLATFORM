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

      // ⭐ Updated PWA config
      VitePWA({
        registerType: "autoUpdate",

        // ✔ Use YOUR custom service worker
        strategies: "injectManifest",
        srcDir: "public",
        filename: "service-worker.js",

        devOptions: { enabled: true },

        includeAssets: [
          "favicon.svg",
          "robots.txt",
          "pwa-192x192.jpeg",
          "pwa-512x512.jpeg"
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
            { src: "/pwa-512x512.jpeg", sizes: "512x512", type: "image/jpeg" }
          ]
        }
      })
    ].filter(Boolean),

    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },

    define: { "process.env": env },

    optimizeDeps: { include: ["react", "react-dom"] }
  };
});
