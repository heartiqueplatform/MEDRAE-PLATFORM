import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";

export default function PublicOnlyRoute({ children }: { children: JSX.Element }) {
    const { user, loading } = useAuth();

    if (loading) return null;

    // Logged-in users (cached or live) never see public pages
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}