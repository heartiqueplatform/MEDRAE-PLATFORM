// src/hooks/useHomeRoute.ts
import { useUserRole } from "@/context/UserRoleContext";

export function useHomeRoute(): string {
    const { role } = useUserRole();
    if (role === "tutor" || role === "institution") return "/dashboard/tutor";
    if (role === "staff") return "/dashboard/staff";
    return "/dashboard/student";
}