import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import AuthGate from "@/auth/AuthGate";
import { BrowserRouter } from "react-router-dom"; // <-- add this import
// In your main entry file (e.g., main.tsx or index.tsx)
/*
import { toast } from "@/hooks/use-toast";

// Save original alert just in case
window.originalAlert = window.alert;

type AlertMessage = string | {
    title?: string;
    description?: string;
    variant?: "default" | "destructive" | "secondary" | "ghost" | "link";
};

window.alert = function (message: AlertMessage) {
    if (typeof message === "string") {
        // fallback for old-style alerts
        toast({
            title: message,
            variant: "destructive",
        });
    } else {
        // enhanced object-style alerts
        toast({
            title: message.title || "Notification",
            description: message.description,
            variant: message.variant || "default",
        });
    }
};
*/

// App version for cache control
const APP_VERSION = "75// increment this with each deployment
const storedVersion = localStorage.getItem("appVersion");

// Update app version safely without clearing all storage
if (storedVersion !== APP_VERSION) {
    localStorage.setItem("appVersion", APP_VERSION);
    console.log(" App version changed, updated version key only.");
    // Optional: reload to pick up new SW/assets
    // window.location.reload(); // Only if necessary
}
// 🔌 Detect offline BEFORE React renders
if (typeof window !== "undefined") {
    (window as any).__APP_OFFLINE__ = !navigator.onLine;
}

//  Nothing renders until auth state is known
createRoot(document.getElementById("root")!).render(
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <AuthGate>

            <App />
        </AuthGate>
    </BrowserRouter>
);