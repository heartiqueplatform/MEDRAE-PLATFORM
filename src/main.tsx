import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import AuthGate from "@/auth/AuthGate";

// ✅ App version for cache control
const APP_VERSION = "V05"; // increment this with each deployment
const storedVersion = localStorage.getItem("appVersion");

if (storedVersion !== APP_VERSION) {
    // Clear old localStorage and set new version
    localStorage.clear();
    localStorage.setItem("appVersion", APP_VERSION);
    console.log("🔄 App version changed, clearing cache and reloading...");
}

// Prefetch Vite route chunks for offline navigation
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        // Prefetch modulepreload chunks
        const preloads = document.querySelectorAll('link[rel="modulepreload"]');
        preloads.forEach((link) => {
            const href = link.getAttribute("href");
            if (href) fetch(href).catch(() => { });
        });

        // Register Service Worker
        navigator.serviceWorker
            .register("/sw.js")
            .then((registration) => {
                console.log("✅ Service Worker registered:", registration);

                // Skip waiting if a new SW is already installed
                if (registration.waiting) {
                    registration.waiting.postMessage({ type: "SKIP_WAITING" });
                }

                // Listen for updates to the SW
                registration.addEventListener("updatefound", () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener("statechange", () => {
                            if (newWorker.state === "installed") {
                                console.log("🟢 New Service Worker installed and ready.");
                                if (storedVersion !== APP_VERSION) {
                                    window.location.reload();
                                }
                            }
                        });
                    }
                });
            })
            .catch((err) => {
                console.error("❌ Service Worker registration failed:", err);
            });

        // Reload page when new SW takes control

    });
}
// 🔌 Detect offline BEFORE React renders
if (typeof window !== "undefined") {
    (window as any).__APP_OFFLINE__ = !navigator.onLine;
}

// 🚫 Nothing renders until auth state is known
createRoot(document.getElementById("root")!).render(
    <AuthGate>
        <App />
    </AuthGate>
);
