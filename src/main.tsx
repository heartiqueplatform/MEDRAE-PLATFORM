import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import AuthGate from "@/auth/AuthGate";

// ✅ App version for cache control
const APP_VERSION = "11"; // increment this with each deployment
const storedVersion = localStorage.getItem("appVersion");

// Update app version safely without clearing all storage
if (storedVersion !== APP_VERSION) {
    localStorage.setItem("appVersion", APP_VERSION);
    console.log("🔄 App version changed, updated version key only.");
    // Optional: reload to pick up new SW/assets
    // window.location.reload(); // Only if necessary
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
                                // Optional: reload to pick up new SW
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
