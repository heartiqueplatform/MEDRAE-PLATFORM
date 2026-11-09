// src/components/layout/TabStack.tsx
import { useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import {
    STUDENT_TABS,
    TAB_PATHS,
    SWIPE_PATHS,
    SWIPE_DISABLED_PATHS,
} from "@/navigation/tabs";

const SWIPE_THRESHOLD_PX = 55;
const SWIPE_MAX_VERTICAL_PX = 90;
const SWIPE_MAX_DURATION_MS = 700;
const SWIPE_LOCK_MS = 380;

export function TabStack() {
    const location = useLocation();
    const navigate = useNavigate();
    const mountedTabs = useRef(new Set<string>());
    const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
    const swipeLock = useRef(false);

    // ── ALL hooks must run every render, unconditionally ──
    useEffect(() => {
        console.log("[TabStack] path:", location.pathname, "| mounted:", [...mountedTabs.current]);
    }, [location.pathname]);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        if (window.innerWidth >= 768) return;
        if (swipeLock.current) return;
        if (SWIPE_DISABLED_PATHS.has(window.location.pathname)) return;

        const target = e.target as HTMLElement;
        if (target.closest("[data-hscroll], .overflow-x-auto, .overflow-x-scroll")) return;

        const t = e.touches[0];
        touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    }, []);

    const onTouchEnd = useCallback((e: React.TouchEvent) => {
        if (window.innerWidth >= 768) return;
        if (swipeLock.current) return;
        if (SWIPE_DISABLED_PATHS.has(window.location.pathname)) return;

        const start = touchStart.current;
        touchStart.current = null;
        if (!start) return;

        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        const dt = Date.now() - start.t;

        if (dt > SWIPE_MAX_DURATION_MS) return;
        if (Math.abs(dy) > SWIPE_MAX_VERTICAL_PX) return;
        if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
        if (Math.abs(dx) < Math.abs(dy) * 1.4) return;

        const currentIdx = SWIPE_PATHS.indexOf(location.pathname);
        if (currentIdx === -1) return;

        const dir = dx < 0 ? 1 : -1;
        const count = SWIPE_PATHS.length;
        const nextIdx = (currentIdx + dir + count) % count;

        if (nextIdx === currentIdx) return;

        swipeLock.current = true;
        navigate(SWIPE_PATHS[nextIdx]);
        setTimeout(() => { swipeLock.current = false; }, SWIPE_LOCK_MS);

        if ("vibrate" in navigator) navigator.vibrate(8);
    }, [location.pathname, navigate]);

    // ── AFTER all hooks: safe to early-return now ──
    if (!TAB_PATHS.has(location.pathname)) {
        return <Outlet />;
    }

    mountedTabs.current.add(location.pathname);

    return (
        <div
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            style={{ height: "100%", width: "100%", touchAction: "pan-y" }}
        >
            {STUDENT_TABS.map(({ path, element: Element }) => {
                const active = location.pathname === path;
                const visited = mountedTabs.current.has(path);
                if (!visited) return null;
                return (
                    <div
                        key={path}
                        style={{ display: active ? "block" : "none", height: "100%", width: "100%" }}
                        aria-hidden={!active}
                    >
                        <Element />
                    </div>
                );
            })}
        </div>
    );
}