import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { authManager } from "@/lib/authManager";

export default function PublicOnlyRoute({ children }: { children: JSX.Element }) {
    const { user, initialized } = useAuth();
    const cachedUser = authManager.getUser();
    const effectiveUser = user ?? cachedUser;

    // 1. Logged-in (live or cached) → dashboard immediately.
    if (effectiveUser) return <Navigate to="/dashboard" replace />;

    // 2. No user, auth not yet resolved → render nothing.
    //    Splash stays up. We don't paint Index until we KNOW.
    if (!initialized) return null;

    // 3. Auth resolved, truly anonymous → show public page.
    return children;
}