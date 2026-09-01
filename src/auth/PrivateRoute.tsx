import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export default function PrivateRoute({ children }: { children: JSX.Element }) {
    const { user } = useAuth(); // ready is always true with localStorage hydration

    // 🚫 Logged-out users never reach private pages
    if (!user) {
        return <Navigate to="/" replace />;
    }

    //  User exists, render children instantly
    return children;
}
