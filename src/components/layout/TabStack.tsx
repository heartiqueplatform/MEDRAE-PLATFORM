// src/components/layout/TabStack.tsx
import { useRef, useEffect } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { STUDENT_TABS, TAB_PATHS } from "@/navigation/tabs";
import { useUserRole } from "@/context/UserRoleContext";

export function TabStack() {
    const location = useLocation();
    const mountedTabs = useRef(new Set<string>());
    const { role } = useUserRole();

    // 🆕 Role change → clear mounted tabs so every tab remounts fresh
    const lastRoleRef = useRef(role);
    useEffect(() => {
        if (lastRoleRef.current !== role) {
            lastRoleRef.current = role;
            mountedTabs.current.clear();
        }
    }, [role]);

    // Non-tab route → full page swap
    if (!TAB_PATHS.has(location.pathname)) {
        return <Outlet />;
    }

    mountedTabs.current.add(location.pathname);

    return (
        <div style={{ height: "100%", width: "100%" }}>
            {STUDENT_TABS.map(({ path, element: Element }) => {
                const active = location.pathname === path;
                const visited = mountedTabs.current.has(path);
                if (!visited) return null;
                return (
                    <div
                        // ✅ Key includes role → remount on role change
                        key={`${path}:${role}`}
                        style={{
                            display: active ? "block" : "none",
                            height: "100%",
                            width: "100%",
                        }}
                        aria-hidden={!active}
                    >
                        <Element />
                    </div>
                );
            })}
        </div>
    );
}