import { useRef, useEffect } from "react";
import { useLocation, Outlet } from "react-router-dom";

import StudentDashboard from "@/pages/dashboard/student";
import Feed from "@/pages/Feed";
import MyMistakes from "@/pages/MyMistakes";

// ⚠️ Only these 3 routes stay mounted. Do NOT add /Medrae-quizzes here.
const TABS = [
    { path: "/dashboard/student", element: <StudentDashboard /> },
    { path: "/feed", element: <Feed /> },
    { path: "/my-mistakes", element: <MyMistakes /> },
];

const TAB_PATHS = new Set(TABS.map((t) => t.path));

export function TabStack() {
    const location = useLocation();
    const mountedTabs = useRef(new Set<string>());

    // ─── Debug log — remove once you confirm it's working ───
    useEffect(() => {
        console.log("[TabStack] path:", location.pathname, "| mounted:", [...mountedTabs.current]);
    }, [location.pathname]);

    // Non-tab route → let Outlet render normally
    if (!TAB_PATHS.has(location.pathname)) {
        return <Outlet />;
    }

    // Mark this tab as visited
    mountedTabs.current.add(location.pathname);

    return (
        <>
            {TABS.map(({ path, element }) => {
                const active = location.pathname === path;
                const hasBeenVisited = mountedTabs.current.has(path);

                if (!hasBeenVisited) return null;

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
                        {element}
                    </div>
                );
            })}
        </>
    );
}