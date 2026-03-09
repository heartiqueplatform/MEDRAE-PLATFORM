"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

type AuthContextType = {
    user: any | null;
    session: any | null;
};

const AuthContext = createContext<AuthContextType>({ user: null, session: null });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<any | null>(null);
    const [session, setSession] = useState<any | null>(null);

    useEffect(() => {
        let mounted = true;

        // 🔹 Fetch initial session once
        const init = async () => {
            const { data } = await supabase.auth.getSession();
            if (!mounted) return;

            setSession(data.session);
            setUser(data.session?.user ?? null);
        };

        init();

        // 🔹 Listen to auth changes globally
        const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);
            setUser(newSession?.user ?? null);
        });

        return () => {
            mounted = false;
            listener.subscription.unsubscribe();
        };
    }, []);

    return <AuthContext.Provider value={{ user, session }}>{children}</AuthContext.Provider>;
};

// ✅ Hook to use in any component
export const useAuth = () => useContext(AuthContext);