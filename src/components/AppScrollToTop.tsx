import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function AppScrollToTop({ children }: { children: React.ReactNode }) {
    const location = useLocation();

    useEffect(() => {
        // Scroll to top whenever route changes
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, [location.pathname]);

    return <>{children}</>;
}