// src/auth/StaffOnlyRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useUserRole } from "@/context/UserRoleContext";

export default function StaffOnlyRoute({ children }: { children: React.ReactNode }) {
    const { role, isLoading } = useUserRole();
    const location = useLocation();

    // Wait for role to resolve — never bounce a real staff user during hydration
    if (isLoading) return null;

    if (role !== "staff") {
        // Send students/tutors back to their own dashboard, preserving nothing sensitive
        return <Navigate to={`/dashboard/${role || "student"}`} replace state={{ from: location.pathname }} />;
    }

    return <>{children}</>;
}