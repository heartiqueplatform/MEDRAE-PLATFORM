"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export default function RedirectGate({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    // User already logged in → redirect immediately
                    navigate("/redirect", { replace: true });
                } else {
                    // No session → render app normally
                    setReady(true);
                }
            } catch (err) {
                console.error("Error checking session:", err);
                setReady(true);
            }
        };

        checkSession();
    }, [navigate]);

    // Nothing renders until we know the session
    if (!ready) return null;

    return <>{children}</>;
}
