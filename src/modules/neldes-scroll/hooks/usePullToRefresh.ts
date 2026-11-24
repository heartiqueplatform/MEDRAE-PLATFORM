// src/modules/neldes-scroll/hooks/usePullToRefresh.ts
import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
    onRefresh: () => Promise<void> | void;
    threshold?: number;
    maxPull?: number;
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

    // The actual scroll element — state so effects re-run when it's set
    const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);

    const startY = useRef<number | null>(null);
    const pulling = useRef(false);

    const pullRef = useRef(0);
    const refreshingRef = useRef(false);
    const enabledRef = useRef(enabled);

    useEffect(() => { pullRef.current = pull; }, [pull]);
    useEffect(() => { refreshingRef.current = refreshing; }, [refreshing]);
    useEffect(() => { enabledRef.current = enabled; }, [enabled]);

    const damp = (delta: number) => {
        const capped = Math.min(delta, maxPull);
        return capped * (1 - capped / (maxPull * 2.2));
    };

    const finish = useCallback(async () => {
        if (!pulling.current) return;
        pulling.current = false;

        const shouldTrigger = pullRef.current >= threshold;
        if (!shouldTrigger) {
            setPull(0);
            startY.current = null;
            return;
        }

        setRefreshing(true);
        setPull(threshold);

        try {
            await onRefresh();
        } finally {
            await new Promise((r) => setTimeout(r, 350));
            setRefreshing(false);
            setPull(0);
            startY.current = null;
        }
    }, [threshold, onRefresh]);

    useEffect(() => {
        if (!scrollEl) return;

        const onTouchStart = (e: TouchEvent) => {
            if (!enabledRef.current || refreshingRef.current) return;
            if (scrollEl.scrollTop > 0) return;
            startY.current = e.touches[0].clientY;
            pulling.current = false;
        };

        const onTouchMove = (e: TouchEvent) => {
            if (startY.current == null || !enabledRef.current || refreshingRef.current) return;

            const delta = e.touches[0].clientY - startY.current;

            if (delta <= 0 || scrollEl.scrollTop > 0) {
                if (pulling.current) {
                    setPull(0);
                    pulling.current = false;
                }
                startY.current = null;
                return;
            }

            e.preventDefault();
            pulling.current = true;
            setPull(damp(delta));
        };

        const onTouchEnd = () => {
            void finish();
        };

        scrollEl.addEventListener("touchstart", onTouchStart, { passive: true });
        scrollEl.addEventListener("touchmove", onTouchMove, { passive: false });
        scrollEl.addEventListener("touchend", onTouchEnd, { passive: true });
        scrollEl.addEventListener("touchcancel", onTouchEnd, { passive: true });

        return () => {
            scrollEl.removeEventListener("touchstart", onTouchStart);
            scrollEl.removeEventListener("touchmove", onTouchMove);
            scrollEl.removeEventListener("touchend", onTouchEnd);
            scrollEl.removeEventListener("touchcancel", onTouchEnd);
        };
    }, [scrollEl, finish]);

    return {
        pull,
        refreshing,
        setScrollEl,          // ← MUST be exported
        threshold,
        progress: Math.min(pull / threshold, 1),
    };
}