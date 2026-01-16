import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useAuth() {
    // ✅ Hydrate user from localStorage first (instant)
    const storedUser = localStorage.getItem("supabaseUser");
    const [user, setUser] = useState<any>(storedUser ? JSON.parse(storedUser) : null);
    const [ready, setReady] = useState(true); // immediately ready

    useEffect(() => {
        // Fetch current session from Supabase
        supabase.auth.getSession().then(({ data }) => {
            const sessionUser = data.session?.user ?? null;
            setUser(sessionUser);

            // Save in localStorage
            if (sessionUser) {
                localStorage.setItem("supabaseUser", JSON.stringify(sessionUser));
            } else {
                localStorage.removeItem("supabaseUser");
            }
        });

        // Listen to auth changes
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            const sessionUser = session?.user ?? null;
            setUser(sessionUser);

            if (sessionUser) {
                localStorage.setItem("supabaseUser", JSON.stringify(sessionUser));
            } else {
                localStorage.removeItem("supabaseUser");
            }
        });

        return () => listener?.subscription.unsubscribe();
    }, []);

    return { user, ready };
}
