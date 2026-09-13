import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export default function PrivateRoute({ children }: { children: JSX.Element }) {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/" replace />;
    }

    //  User exists, render children instantly
    return children;
}
