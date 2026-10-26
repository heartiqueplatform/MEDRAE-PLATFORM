import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { authManager } from "@/lib/authManager";

export default function PrivateRoute({ children }: { children: JSX.Element }) {
    const { user, loading } = useAuth();

    // ✅ Cache-first: if we have ANY known user, let them in immediately.
    // We only block on `loading` when there's nothing cached — i.e. truly
    // fresh sessions where we don't know who the user is yet.
    const cachedUser = authManager.getUser();
    const effectiveUser = user ?? cachedUser;

    if (loading && !cachedUser) {
        // Only show spinner on TRUE cold start (no cache at all).
        // This happens once per device, not on every navigation.
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0d1117]">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!effectiveUser) {
        return <Navigate to="/" replace />;
    }

    return children;
}