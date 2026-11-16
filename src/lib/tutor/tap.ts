// lib/tutor/tap.ts

/**
 * Central tap feedback helper — sound + haptic.
 *
 * Sound comes from `@/lib/soundManager`, which is initialized and
 * preloaded once in App.tsx (initSound + loadSound for every file).
 * Do NOT re-init or re-preload here.
 *
 * Registered sound names used here (see App.tsx soundFiles array):
 *   "ui-tap"       → /sounds/Uitap.mp3      (canonical UI tap)
 *   "tap-correct"  → /sounds/tap1.mp3       (success)
 *   "tap-wrong"    → /sounds/tap2.mp3       (error)
 * There is NO "ui-success" sound — do not invent names.
 *
 * Vibration is a no-op on iOS/desktop; navigator.vibrate is feature-checked.
 */

import { playSound } from "@/lib/soundManager";

/** Light tap — use on most tappable elements. */
export function tap(): void {
    try {
        playSound("ui-tap");
    } catch {
        /* sound may not be unlocked yet on iOS — never break the handler */
    }
    vibrate(15);
}

/** Success tap — slightly longer haptic + correct sound. */
export function tapSuccess(): void {
    try {
        playSound("tap-correct");
    } catch {
        /* ignore */
    }
    vibrate([10, 40, 10]);
}

/** Error tap — wrong sound + double buzz. */
export function tapError(): void {
    try {
        playSound("tap-wrong");
    } catch {
        /* ignore */
    }
    vibrate([20, 60, 20]);
}

function vibrate(pattern: number | number[]): void {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
            navigator.vibrate(pattern);
        } catch {
            /* ignore */
        }
    }
}