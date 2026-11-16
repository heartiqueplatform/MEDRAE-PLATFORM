import { useSyncExternalStore } from "react";
import { getPulseCount, subscribePulse } from "./pulseStore";

/**
 * Subscribe a component to the Community Pulse unread count.
 *
 * Re-renders only when the count changes. SSR-safe (returns 0 on the
 * server snapshot so it doesn't break during hydration).
 */
export function usePulseCount() {
    return useSyncExternalStore(
        subscribePulse,
        getPulseCount,
        () => 0
    );
}