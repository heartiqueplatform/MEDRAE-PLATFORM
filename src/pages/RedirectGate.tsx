// RedirectGate.tsx
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
export default function RedirectGate({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const [shouldRender, setShouldRender] = useState(false);
    useEffect(() => {
        const storedUser = localStorage.getItem("supabaseUser");
        if (storedUser) {
            // We have a user, go straight to the redirector
            navigate("/redirect", { replace: true });
        } else {
            // No user, show the landing page
            setShouldRender(true);
        }
    }, [navigate]);

    if (!shouldRender) return null;
    return <>{children}</>;
}