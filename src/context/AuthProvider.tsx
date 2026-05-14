"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

type AuthContextType = {
    user: any | null;
    session: any | null;
    loading: boolean; // updated
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true, // updated
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<any | null>(null);
    const [session, setSession] = useState<any | null>(null);
    const [loading, setLoading] = useState(true); // updated

    useEffect(() => {
        let mounted = true;

        // 1. Set up auth listener
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, newSession) => {
            if (!mounted) return;

            setSession(newSession);
            setUser(newSession?.user ?? null);
            setLoading(false); // updated
        });

        // 2. Get initial session
        const init = async () => {
            const {
                data: { session: initialSession },
            } = await supabase.auth.getSession();

            if (!mounted) return;

            setSession(initialSession);
            setUser(initialSession?.user ?? null);
            setLoading(false); // updated
        };

        init();

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, session, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

// ✅ Hook to use in any component
export const useAuth = () => useContext(AuthContext);