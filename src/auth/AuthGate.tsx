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

        // ✅ REMOVE this - let DashboardLayout handle the loader
        // if (!loading) {
        //     const loader = document.getElementById('initial-loader');
        //     if (loader) {
        //         loader.style.opacity = '0';
        //         setTimeout(() => loader.remove(), 400);
        //     }
        // }

        return () => {
            window.removeEventListener('online', handleStatus);
            window.removeEventListener('offline', handleStatus);
        };
    }, [loading]);

    // Keep the initial-loader visible by returning null while loading
    if (loading) {
        return null;
    }

    return (
        <div className="min-h-screen w-full bg-white dark:bg-black transition-colors duration-300">
            {isOffline && (
                <div className="fixed top-0 left-0 w-full z-[10000] pointer-events-none flex flex-col items-center">
                    <div className="h-[2px] w-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                    <div className="bg-red-500 text-white text-[8px] px-2 py-0.5 rounded-b-md font-black uppercase tracking-widest flex items-center gap-1 shadow-md">
                        <WifiOff size={8} strokeWidth={3} />
                        Network Vitals: Code Black😒
                    </div>
                </div>
            )}
            {children}
        </div>
    );
}