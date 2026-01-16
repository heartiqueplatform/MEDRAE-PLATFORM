"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useAuth() {
    // ✅ Hydrate user from localStorage first (instant)
    const storedUser =
        typeof window !== "undefined"
            ? localStorage.getItem("supabaseUser")
            : null;

    const [user, setUser] = useState<any>(
        storedUser ? JSON.parse(storedUser) : null
    );
    const [ready, setReady] = useState(true); // immediately ready

    useEffect(() => {
        // 🔒 Skip Supabase if offline
        if (typeof window === "undefined" || !navigator.onLine) return;

        let mounted = true;

        // Fetch current session from Supabase
        supabase.auth.getSession().then(({ data }) => {
            if (!mounted) return;

            const sessionUser = data.session?.user ?? null;
            setUser(sessionUser);

            if (sessionUser) {
                localStorage.setItem("supabaseUser", JSON.stringify(sessionUser));
            } else {
                localStorage.removeItem("supabaseUser");
            }
        });

        // Listen to auth changes
        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (!mounted) return;

                const sessionUser = session?.user ?? null;
                setUser(sessionUser);

                if (sessionUser) {
                    localStorage.setItem("supabaseUser", JSON.stringify(sessionUser));
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

    return { user, ready };
}
