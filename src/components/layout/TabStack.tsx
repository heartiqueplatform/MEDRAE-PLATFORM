// src/components/layout/TabStack.tsx
import { useRef, useEffect, Suspense } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { STUDENT_TABS, TAB_PATHS } from "@/navigation/tabs";
import { useUserRole } from "@/context/UserRoleContext";

export function TabStack() {
    const location = useLocation();
    const mountedTabs = useRef(new Set<string>());
    const { role } = useUserRole();

    const lastRoleRef = useRef(role);
    useEffect(() => {
        if (lastRoleRef.current !== role) {
            lastRoleRef.current = role;
            mountedTabs.current.clear();
        }
    }, [role]);

    if (!TAB_PATHS.has(location.pathname)) {
        return <Outlet />;
    }

    const isStudentTab = STUDENT_TABS.some((t) => t.path === location.pathname);
    if (!isStudentTab) {
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
                        key={`${path}:${role}`}
                        style={{
                            display: active ? "block" : "none",
                            height: "100%",
                            width: "100%",
                        }}
                        aria-hidden={!active}
                    >
                        <Suspense fallback={<div style={{ height: "100%", width: "100%" }} />}>
                            <Element />
                        </Suspense>
                    </div>
                );
            })}
        </div>
    );
}