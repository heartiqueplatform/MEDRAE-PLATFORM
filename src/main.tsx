import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import AuthGate from "@/auth/AuthGate";

// ✅ App version for cache control
const APP_VERSION = "20"; // increment this with each deployment
const storedVersion = localStorage.getItem("appVersion");

if (storedVersion !== APP_VERSION) {
    localStorage.setItem("appVersion", APP_VERSION);
    console.log("🔄 App version changed, updated version key only.");
    // Optional: reload to pick up new SW/assets
    // window.location.reload();
}

// Prefetch Vite route chunks for offline navigation
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
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

                // Force update if waiting SW exists
                if (registration.waiting) {
                    console.log("⚡ Found waiting SW — activating...");
                    registration.waiting.postMessage({ type: "SKIP_WAITING" });
                }

                // Listen for new SW installation
                registration.addEventListener("updatefound", () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener("statechange", () => {
                            if (newWorker.state === "installed") {
                                if (navigator.serviceWorker.controller) {
                                    console.log("🟢 New SW installed — reloading to update app");
                                    window.location.reload(); // auto reload to apply update
                                } else {
                                    console.log("🟢 SW installed for the first time");
                                }
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

// 🚫 Render React after auth
createRoot(document.getElementById("root")!).render(
    <AuthGate>
        <App />
    </AuthGate>
);
