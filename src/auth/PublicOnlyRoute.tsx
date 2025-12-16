import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export default function PublicOnlyRoute({ children }: { children: JSX.Element }) {
    const { user, ready } = useAuth();

    if (!ready) return null;

    // 🚫 Logged-in users can NEVER see public pages
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}
