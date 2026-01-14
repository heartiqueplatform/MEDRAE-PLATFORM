// src/components/PWAInstallButton.tsx
"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

export function PWAInstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault(); // stop browser mini-infobar
            setDeferredPrompt(e);
        };

        window.addEventListener("beforeinstallprompt", handler);

        // Detect if already installed
        if (window.matchMedia("(display-mode: standalone)").matches) {
            setIsInstalled(true);
        }

        window.addEventListener("appinstalled", () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
        };
    }, []);

    if (!deferredPrompt || isInstalled) return null;

    const installApp = async () => {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;

        if (choiceResult.outcome === "accepted") {
            setDeferredPrompt(null);
        }
    };

    return (
        <button
            onClick={installApp}
            className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-full
                 bg-green-500 text-white shadow-lg hover:bg-green-600 active:scale-95 transition"
        >
            <Download size={18} />
            Install App
        </button>
    );
}

