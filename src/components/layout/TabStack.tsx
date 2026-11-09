// src/components/layout/TabStack.tsx
// Tab-keeping component. Renders every visited tab but only shows the
// one matching the current URL. NO swipe navigation — taps come from
// the footer / sidebar only.
//
// Why keep it at all? Because unmounting a tab loses its scroll
// position, network state, and mounted subtree — which makes tab
// switching feel slow. Keeping it mounted makes the UI feel instant.

import { useRef, useEffect } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { STUDENT_TABS, TAB_PATHS } from "@/navigation/tabs";

export function TabStack() {
    const location = useLocation();
    const mountedTabs = useRef(new Set<string>());

    // Debug — remove if you want
    useEffect(() => {
        console.log(
            "[TabStack] path:",
            location.pathname,
            "| mounted:",
            [...mountedTabs.current]
        );
    }, [location.pathname]);

    // Non-tab route → render via Outlet (full page swap)
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
                        key={path}
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