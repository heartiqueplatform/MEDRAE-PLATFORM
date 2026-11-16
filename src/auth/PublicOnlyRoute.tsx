import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { authManager } from "@/lib/authManager";

export default function PublicOnlyRoute({ children }: { children: JSX.Element }) {
    const { user, loading } = useAuth();
    const cachedUser = authManager.getUser();
    const effectiveUser = user ?? cachedUser;

    // Don't paint a spinner — AuthGate's overlay already covers the screen.
    // If a cached user exists we can decide immediately.
    if (loading && !cachedUser) return null;

    if (effectiveUser) return <Navigate to="/dashboard" replace />;

    return children;
}