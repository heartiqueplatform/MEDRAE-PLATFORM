// src/modules/neldes-scroll/hooks/usePullToRefresh.ts
import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
    /** Called when user releases past threshold */
    onRefresh: () => Promise<void> | void;
    /** Pull distance (px) needed to trigger */
    threshold?: number;
    /** Max visual pull (rubber-band cap) */
    maxPull?: number;
    /** Only allow when scrollTop === 0 */
    enabled?: boolean;
}

export function usePullToRefresh({
    onRefresh,
    threshold = 70,
    maxPull = 120,
    enabled = true,
}: Options) {
    const [pull, setPull] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const startY = useRef<number | null>(null);
    const pulling = useRef(false);
    const scrollEl = useRef<HTMLElement | null>(null);

    const setScrollRef = useCallback((el: HTMLElement | null) => {
        scrollEl.current = el;
    }, []);

    // Rubber-band curve — the further you pull, the harder it gets
    const damp = (delta: number) => {
        const capped = Math.min(delta, maxPull);
        return capped * (1 - capped / (maxPull * 2.2));
    };

    const onTouchStart = useCallback(
        (e: TouchEvent) => {
            if (!enabled || refreshing) return;
            const el = scrollEl.current;
            if (!el || el.scrollTop > 0) return;
            startY.current = e.touches[0].clientY;
            pulling.current = false;
        },
        [enabled, refreshing]
    );

    const onTouchMove = useCallback(
        (e: TouchEvent) => {
            if (startY.current == null || !enabled || refreshing) return;
            const el = scrollEl.current;
            if (!el) return;

            const delta = e.touches[0].clientY - startY.current;

            // If user is scrolling up (delta <= 0) or content is scrolled, bail
            if (delta <= 0 || el.scrollTop > 0) {
                if (pulling.current) {
                    setPull(0);
                    pulling.current = false;
                }
                startY.current = null;
                return;
            }

            // Prevent native scroll/bounce while pulling
            e.preventDefault();
            pulling.current = true;
            setPull(damp(delta));
        },
        [enabled, refreshing]
    );

    const finish = useCallback(async () => {
        if (!pulling.current) return;
        pulling.current = false;

        const shouldTrigger = pull >= threshold;
        if (!shouldTrigger) {
            setPull(0);
            startY.current = null;
            return;
        }

        setRefreshing(true);
        // Hold indicator at threshold while refresh runs
        setPull(threshold);

        try {
            await onRefresh();
        } finally {
            // Small delay so the spinner is visible even on instant refresh
            await new Promise((r) => setTimeout(r, 350));
            setRefreshing(false);
            setPull(0);
            startY.current = null;
        }
    }, [pull, threshold, onRefresh]);

    const onTouchEnd = useCallback(() => {
        void finish();
    }, [finish]);

    useEffect(() => {
        const el = scrollEl.current;
        if (!el) return;

        // passive:false on move so we can preventDefault the native bounce
        el.addEventListener("touchstart", onTouchStart, { passive: true });
        el.addEventListener("touchmove", onTouchMove, { passive: false });
        el.addEventListener("touchend", onTouchEnd, { passive: true });
        el.addEventListener("touchcancel", onTouchEnd, { passive: true });

        return () => {
            el.removeEventListener("touchstart", onTouchStart);
            el.removeEventListener("touchmove", onTouchMove);
            el.removeEventListener("touchend", onTouchEnd);
            el.removeEventListener("touchcancel", onTouchEnd);
        };
    }, [onTouchStart, onTouchMove, onTouchEnd]);

    return {
        pull,
        refreshing,
        setScrollRef,
        threshold,
        /** 0..1 progress toward threshold */
        progress: Math.min(pull / threshold, 1),
    };
}