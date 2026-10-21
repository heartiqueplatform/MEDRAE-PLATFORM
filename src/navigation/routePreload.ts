// src/navigation/routePreload.ts

/**
 * Central map of route path → dynamic import.
 * Used by:
 *  - IntentPrefetch (on pointerdown)
 *  - RoutePrefetcher (background warm-up)
 *  - The router itself (lazy elements)
 */
export const PAGE_LOADERS: Record<string, () => Promise<any>> = {
    "/dashboard/student": () => import("@/pages/dashboard/student"),
    "/dashboard/tutor": () => import("@/pages/dashboard/tutor"),
    "/dashboard/staff": () => import("@/pages/dashboard/staff"),

    "/Medrae-quizzes": () => import("@/pages/MedraeQuizzes"),
    "/feed": () => import("@/pages/Feed"),
    "/my-mistakes": () => import("@/pages/MyMistakes"),
    "/progress": () => import("@/pages/Progress"),
    "/challenge": () => import("@/pages/challenge"),

    "/nursing": () => import("@/pages/nursing/NursingHome"),
    "/nursing/search": () => import("@/pages/nursing/TopicSearch"),
    "/nursing/progress": () => import("@/pages/nursing/ProgressPage"),

    "/assessments": () => import("@/pages/assessment"),
    "/assessment-notes": () => import("@/pages/AssessmentNotes"),

    "/survival-hub": () => import("@/pages/survival-hub/index"),
    "/market": () => import("@/pages/market"),

    "/profile": () => import("@/pages/Profile"),
    "/settings": () => import("@/pages/Settings"),
    "/notifications": () => import("@/pages/Notifications"),
    "/announcements": () => import("@/pages/Announcements"),
    "/subscription": () => import("@/pages/Subscription"),
    "/calendar": () => import("@/pages/Calendar"),
    "/resources": () => import("@/pages/Resources"),
    "/medtube": () => import("@/pages/MedTube"),

    // add the rest as you need them
};

/**
 * Fire-and-forget. Idempotent — Webpack/Vite dedupe the chunk fetch.
 * Never throws. Never blocks.
 */
const inflight = new Set<string>();

export function preloadRoute(path: string) {
    const loader = PAGE_LOADERS[path];
    if (!loader) return;
    if (inflight.has(path)) return;
    inflight.add(path);
    loader().catch(() => {
        // allow retry on failure
        inflight.delete(path);
    });
}

/** Warm every route in the background — call after app shell mounts. */
export function preloadAllRoutes(delayMs = 300) {
    setTimeout(() => {
        Object.keys(PAGE_LOADERS).forEach(preloadRoute);
    }, delayMs);
}