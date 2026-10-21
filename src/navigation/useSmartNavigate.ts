// src/navigation/useSmartNavigate.ts
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { startTransition } from "react";
import { preloadRoute } from "./routePreload";

function haptic(type: "light" | "medium" = "light") {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(type === "medium" ? 30 : 15);
    }
}

/**
 * Use it in a pointer-down handler:
 *   <button onPointerDown={(e) => smartNav(e, "/feed")} />
 */
export function useSmartNavigate() {
    const navigate = useNavigate();

    return useCallback(
        (e: React.PointerEvent | null, path: string) => {
            if (e) e.preventDefault();

            // 1. Instant feedback — bar + haptic, before anything else
            window.dispatchEvent(new Event("nav-progress-start"));
            haptic("light");

            // 2. Warm the chunk (no-op if already cached)
            preloadRoute(path);

            // 3. Defer the actual route swap so paint isn't blocked
            startTransition(() => {
                navigate(path);
            });
        },
        [navigate]
    );
}