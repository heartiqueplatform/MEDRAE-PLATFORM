import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";

export default function PrivateRoute({ children }: { children: JSX.Element }) {
    const { user, loading } = useAuth();

    // Still hydrating — don't bounce yet, don't flash "/"
    if (loading) return null;

    if (!user) {
        return <Navigate to="/" replace />;
    }

    return children;
}