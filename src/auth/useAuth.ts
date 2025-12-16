import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useAuth() {
    // ✅ Hydrate user from localStorage first (instant)
    const storedUser = localStorage.getItem("supabaseUser");
    const [user, setUser] = useState<any>(storedUser ? JSON.parse(storedUser) : null);

    // ⚡ ready will now reflect actual Supabase session
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let isMounted = true;

        // 1️⃣ Fetch current session from Supabase
        supabase.auth.getSession().then(({ data }) => {
            if (!isMounted) return;
            const sessionUser = data.session?.user ?? null;
            setUser(sessionUser);

            if (sessionUser) {
                localStorage.setItem("supabaseUser", JSON.stringify(sessionUser));
            } else {
                localStorage.removeItem("supabaseUser");
            }

            setReady(true); // mark auth as ready
        });

        // 2️⃣ Listen for auth state changes
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!isMounted) return;
            const sessionUser = session?.user ?? null;
            setUser(sessionUser);

            if (sessionUser) {
                localStorage.setItem("supabaseUser", JSON.stringify(sessionUser));
            } else {
                localStorage.removeItem("supabaseUser");
            }

            setReady(true);
        });

        return () => {
            isMounted = false;
            listener?.subscription.unsubscribe();
        };
    }, []);

    return { user, ready };
}
