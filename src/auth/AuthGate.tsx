"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { WifiOff, HeartPulse } from "lucide-react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);



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
