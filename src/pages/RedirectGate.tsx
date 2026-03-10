"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@supabase/auth-helpers-react";

export default function RedirectGate({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const session = useSession();       // ✅ current session
    const user = session?.user || null; // ✅ current user
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const checkUser = () => {
            try {
                if (user) {
                    // User logged in → redirect to role-based redirect page
                    navigate("/redirect", { replace: true });
                } else {
                    // No user → allow normal rendering
                    setReady(true);
                }
            } catch (err) {
                console.error("Error checking user:", err);
                setReady(true);
            }
        };

        checkUser();
    }, [navigate, user]);

    // Render children only when ready
    if (!ready) return null;

    return <>{children}</>;
}