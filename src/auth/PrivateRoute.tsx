import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { authManager } from "@/lib/authManager";

export default function PrivateRoute({ children }: { children: JSX.Element }) {
    const { user, loading } = useAuth();
    const cachedUser = authManager.getUser();
    const effectiveUser = user ?? cachedUser;

    if (loading && !cachedUser) return null;   // AuthGate already paints the overlay

    if (!effectiveUser) return <Navigate to="/" replace />;

    return children;
}