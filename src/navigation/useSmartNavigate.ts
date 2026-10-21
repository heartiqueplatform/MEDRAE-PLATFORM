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

export function useSmartNavigate() {
    const navigate = useNavigate();
    return useCallback(
        (e: React.PointerEvent | null, path: string) => {
            if (e) e.preventDefault();
            window.dispatchEvent(new Event("nav-progress-start"));
            haptic("light");
            preloadRoute(path);
            startTransition(() => navigate(path));
        },
        [navigate]
    );
}