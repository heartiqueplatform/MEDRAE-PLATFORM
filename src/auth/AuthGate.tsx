"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { WifiOff, HeartPulse } from "lucide-react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // 🌐 Detect offline immediately
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

    // 📴 OFFLINE UI — professional & calm
    if (isOffline) {
        return (
            <div className="h-screen flex items-center justify-center bg-white dark:bg-gray-900 px-6">
                <div className="text-center max-w-sm">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <HeartPulse className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                    </div>

                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Offline Mode
                    </h1>

                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        You are currently offline. MEDRAE is available in limited mode.
                        Please reconnect to the internet to access authentication,
                        syncing, and clinical updates.
                    </p>

                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                        <WifiOff className="h-4 w-4" />
                        No internet connection
                    </div>
                </div>
            </div>
        );
    }

    // 🔐 ONLINE: Normal auth flow
    useEffect(() => {
        let mounted = true;

        supabase.auth.getUser().then(({ data }) => {
            if (!mounted) return;
            setUser(data.user);
            setLoading(false);
        });

        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
            }
        );

        return () => {
            mounted = false;
            listener?.subscription.unsubscribe();
        };
    }, []);

    // ⏳ Wait for auth
    if (loading) return null;

    return <>{children}</>;
}
