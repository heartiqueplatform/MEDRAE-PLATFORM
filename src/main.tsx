import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import AuthGate from "@/auth/AuthGate";

// ✅ App version for cache control
const APP_VERSION = "21"; // increment this with each deployment
const storedVersion = localStorage.getItem("appVersion");

// Update app version safely without clearing all storage
if (storedVersion !== APP_VERSION) {
    localStorage.setItem("appVersion", APP_VERSION);
    console.log("🔄 App version changed, updated version key only.");
    // Optional: reload to pick up new SW/assets
    // window.location.reload(); // Only if necessary
}

// 🔌 Detect offline BEFORE React renders
if (typeof window !== "undefined") {
    (window as any).__APP_OFFLINE__ = !navigator.onLine;

    // ✅ Force dashboard route if offline but app shell cached
    if ((window as any).__APP_OFFLINE__ && storedVersion) {
        window.history.replaceState(null, "", "/dashboard/student");
    }
}

// 🚫 Nothing renders until auth state is known
createRoot(document.getElementById("root")!).render(
    <AuthGate>
        <App />
    </AuthGate>
);
