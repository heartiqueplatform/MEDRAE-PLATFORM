import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import AuthGate from "@/auth/AuthGate";
import { BrowserRouter } from "react-router-dom";

// App version for cache control
const APP_VERSION = "101";
const storedVersion = localStorage.getItem("appVersion");

if (storedVersion !== APP_VERSION) {
    localStorage.setItem("appVersion", APP_VERSION);
    console.log("App version changed, updated version key only.");
}

// 🔌 Detect offline BEFORE React renders
if (typeof window !== "undefined") {
    (window as any).__APP_OFFLINE__ = !navigator.onLine;
}

const root = createRoot(document.getElementById("root")!);

// Directly render the app — no loader
root.render(
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <AuthGate>
            <App />
        </AuthGate>
    </BrowserRouter>
);