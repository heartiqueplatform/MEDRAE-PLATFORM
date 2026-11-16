"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";

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

    // While loading, render a white overlay only (no dark bg).
    // The page's own background paints underneath when it mounts;
    // this overlay is white so no flash can appear during the gap.
    if (loading) {
        const isDark =
            typeof document !== "undefined" &&
            document.documentElement.classList.contains("dark");
        return (
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100dvh",
                    backgroundColor: isDark ? "#0d1117" : "#ffffff",
                    zIndex: 2147483647,
                    pointerEvents: "none",
                }}
                aria-hidden
            />
        );
    }

    return (
        <>
            {isOffline && (
                <div className="fixed top-0 left-0 w-full z-[10000] pointer-events-none flex flex-col items-center">
                    <div className="h-[2px] w-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                </div>
            )}
            {children}
        </>
    );
}