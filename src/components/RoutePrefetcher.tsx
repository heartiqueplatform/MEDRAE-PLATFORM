import { useEffect } from "react";

// Map of route → dynamic import.
// Only add routes that are lazy-loaded.
const ROUTE_PREFETCHERS: Record<string, () => Promise<any>> = {
    "/my-mistakes": () => import("@/pages/MyMistakes"),
    "/challenge": () => import("@/pages/challenge"),
    "/subscription": () => import("@/pages/Subscription"),
    "/feed": () => import("@/pages/Feed"),
    "/Medrae-quizzes": () => import("@/pages/MedraeQuizzes"),
    "/progress": () => import("@/pages/Progress"),
    "/nursing": () => import("@/pages/nursing/NursingHome"),
    "/market": () => import("@/pages/market"),
    "/survival-hub": () => import("@/pages/survival-hub/index"),
    "/grouppay": () => import("@/pages/grouppay/index"),
    "/settings": () => import("@/pages/Settings"),
    "/profile": () => import("@/pages/Profile"),
    "/help": () => import("@/pages/HelpCenter"),
};

export function preloadRoute(path: string) {
    const fn = ROUTE_PREFETCHERS[path];
    if (!fn) return;
    try {
        fn().catch(() => { });
    } catch { }
}

/**
 * Warms all known route chunks during idle time, 1.5s after first paint.
 * Cheap (browser caches the imports), makes subsequent navigations instant.
 */
export function RoutePrefetcher() {
    useEffect(() => {
        if (typeof window === "undefined") return;

        const warm = () => {
            // Warm in small batches to avoid hammering the network
            const paths = Object.keys(ROUTE_PREFETCHERS);
            let i = 0;
            const next = () => {
                if (i >= paths.length) return;
                const path = paths[i++];
                ROUTE_PREFETCHERS[path]();
                // 150ms between chunks so we don't block other requests
                setTimeout(next, 150);
            };
            next();
        };

        const ric: any = (window as any).requestIdleCallback;
        const id = ric
            ? ric(warm, { timeout: 4000 })
            : setTimeout(warm, 2500);

        return () => {
            if ((window as any).cancelIdleCallback) {
                (window as any).cancelIdleCallback(id);
            } else {
                clearTimeout(id);
            }
        };
    }, []);

    return null;
}