"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const isOffline =
        typeof window !== "undefined" && !navigator.onLine;

    const cachedUser =
        typeof window !== "undefined"
            ? localStorage.getItem("supabaseUser")
            : null;

    const [loading, setLoading] = useState(!isOffline);
    const [user, setUser] = useState<any>(
        isOffline && cachedUser ? JSON.parse(cachedUser) : null
    );

    // 🔐 ONLINE: Normal auth flow (unchanged, just guarded)
    useEffect(() => {
        if (!navigator.onLine) return; // ✅ skip Supabase when offline

        let mounted = true;

        supabase.auth.getUser().then(({ data }) => {
            if (!mounted) return;
            setUser(data.user);
            setLoading(false);

            if (data.user) {
                localStorage.setItem("supabaseUser", JSON.stringify(data.user));
            }
        });

        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                const sessionUser = session?.user ?? null;
                setUser(sessionUser);

                if (sessionUser) {
                    localStorage.setItem(
                        "supabaseUser",
                        JSON.stringify(sessionUser)
                    );
                } else {
                    localStorage.removeItem("supabaseUser");
                }
            }
        );

        return () => {
            mounted = false;
            listener?.subscription.unsubscribe();
        };
    }, []);

    // ⏳ Wait for auth only when online
    if (loading) return null;

    return <>{children}</>;
}
