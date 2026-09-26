"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { WifiOff } from "lucide-react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const { loading } = useAuth();
    const [isOffline, setIsOffline] = useState(
        typeof navigator !== 'undefined' ? !navigator.onLine : false
    );

    useEffect(() => {
        const handleStatus = () => setIsOffline(!navigator.onLine);
        window.addEventListener('online', handleStatus);
        window.addEventListener('offline', handleStatus);

        return () => {
            window.removeEventListener('online', handleStatus);
            window.removeEventListener('offline', handleStatus);
        };
    }, [loading]);


    // 🔧 Render a themed background instead of `null`.
    // Previously this returned `null` while loading, which left #root
    // empty and let the browser canvas (or a downstream black route
    // guard) show through — the "black flash" between splash and app.
    if (loading) {
        return (
            <div className="min-h-screen w-full bg-white dark:bg-[#0d1117] transition-colors duration-300" />
        );
    }

    return (
        <div className="min-h-screen w-full bg-white dark:bg-[#0d1117] transition-colors duration-300">
            {isOffline && (
                <div className="fixed top-0 left-0 w-full z-[10000] pointer-events-none flex flex-col items-center">
                    <div className="h-[2px] w-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                </div>
            )}
            {children}
        </div>
    );
}