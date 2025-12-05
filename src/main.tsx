import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * ✅ Prefetch Vite route chunks for offline navigation
 * This ensures page-to-page navigation works without internet
 */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        // Prefetch Vite modulepreload chunks
        const preloads = document.querySelectorAll('link[rel="modulepreload"]');
        preloads.forEach((link) => {
            const href = link.getAttribute("href");
            if (href) fetch(href).catch(() => { });
        });

        // Register Service Worker for offline caching
        navigator.serviceWorker
            .register("/sw.js")
            .then((registration) => {
                console.log("✅ Service Worker registered:", registration);

                // Force the SW to take control immediately if waiting
                if (registration.waiting) {
                    registration.waiting.postMessage({ type: "SKIP_WAITING" });
                }

                // Listen for updates to the service worker
                registration.addEventListener("updatefound", () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener("statechange", () => {
                            if (newWorker.state === "installed") {
                                console.log("🟢 New Service Worker installed and ready.");
                                // Optionally reload page for new SW
                                // window.location.reload();
                            }
                        });
                    }
                });
            })
            .catch((err) => {
                console.error("❌ Service Worker registration failed:", err);
            });
    });
}

// Render the app
createRoot(document.getElementById("root")!).render(<App />);
