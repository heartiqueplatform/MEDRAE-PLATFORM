import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { authManager } from "@/lib/authManager";

export default function PrivateRoute({ children }: { children: JSX.Element }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0d1117]">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const effectiveUser = user ?? authManager.getUser();

    if (!effectiveUser) {
        return <Navigate to="/" replace />;
    }

    return children;
}