import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";

export default function PublicOnlyRoute({ children }: { children: JSX.Element }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Logged-in users (cached or live) never see public pages
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}