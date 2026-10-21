// src/navigation/routePreload.ts
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
    "/assessments": () => import("@/pages/assessment"),
    "/market": () => import("@/pages/market"),
    "/survival-hub": () => import("@/pages/survival-hub/index"),
    "/profile": () => import("@/pages/Profile"),
    "/settings": () => import("@/pages/Settings"),
    "/notifications": () => import("@/pages/Notifications"),
    "/announcements": () => import("@/pages/Announcements"),
    "/subscription": () => import("@/pages/Subscription"),
    "/calendar": () => import("@/pages/Calendar"),
    "/resources": () => import("@/pages/Resources"),
    "/medtube": () => import("@/pages/MedTube"),
};

const inflight = new Set<string>();

export function preloadRoute(path: string) {
    const loader = PAGE_LOADERS[path];
    if (!loader) return;
    if (inflight.has(path)) return;
    inflight.add(path);
    loader().catch(() => inflight.delete(path));
}

export function preloadAllRoutes(delayMs = 300) {
    setTimeout(() => {
        Object.keys(PAGE_LOADERS).forEach(preloadRoute);
    }, delayMs);
}