// useAuth.ts (or inside your AuthProvider file)
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useAuth() {
    // 1. Instant check! No 'useEffect' needed for the first check
    const initialUser = useMemo(() => {
        const stored = localStorage.getItem("supabaseUser");
        if (!stored) return null;
        try {
            return JSON.parse(stored);
        } catch (e) {
            return null;
        }
    }, []);

    const [user, setUser] = useState<any>(initialUser);
    // 2. If we found a user in storage, we are NOT loading.
    const [ready, setReady] = useState(!!initialUser || !navigator.onLine);

    useEffect(() => {
        // Run the background check to keep session fresh
        const syncSession = async () => {
            const { data } = await supabase.auth.getSession();
            const sessionUser = data.session?.user ?? null;
            setUser(sessionUser);
            if (sessionUser) localStorage.setItem("supabaseUser", JSON.stringify(sessionUser));
            setReady(true);
        };
        syncSession();
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            const sessionUser = session?.user ?? null;
            setUser(sessionUser);
            if (sessionUser) localStorage.setItem("supabaseUser", JSON.stringify(sessionUser));
            else localStorage.removeItem("supabaseUser");
            setReady(true);
        });
        return () => listener?.subscription.unsubscribe();
    }, []);
    return { user, ready };
}