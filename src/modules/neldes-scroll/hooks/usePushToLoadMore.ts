// src/modules/neldes-scroll/hooks/usePushToLoadMore.ts
import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
    /** Fires when the user pushes up at the bottom of the scroll container. */
    onLoadMore: () => Promise<void> | void;
    /** How far (px) the user must push past the bottom to trigger. */
    threshold?: number;
    /** Max visual overshoot before damping flattens out. */
    maxPush?: number;
    /** Live flag from the feed — block while true, release when it flips false. */
    loadingMore: boolean;
    /** Live flag — block entirely when there's nothing more to fetch. */
    hasMore: boolean;
    /** The scroll element (same one used by usePullToRefresh). */
    scrollEl: HTMLElement | null;
    enabled?: boolean;
}

export function usePushToLoadMore({
    onLoadMore,
    threshold = 60,
    maxPush = 100,
    loadingMore,
    hasMore,
    scrollEl,
    enabled = true,
}: Options) {
    const [push, setPush] = useState(0);
    const [requesting, setRequesting] = useState(false);

    const startY = useRef<number | null>(null);
    const pushing = useRef(false);

    const pushRef = useRef(0);
    const requestingRef = useRef(false);
    const enabledRef = useRef(enabled);
    const hasMoreRef = useRef(hasMore);
    const loadingMoreRef = useRef(loadingMore);
    const onLoadMoreRef = useRef(onLoadMore);

    useEffect(() => { pushRef.current = push; }, [push]);
    useEffect(() => { requestingRef.current = requesting; }, [requesting]);
    useEffect(() => { enabledRef.current = enabled; }, [enabled]);
    useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
    useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);
    useEffect(() => { onLoadMoreRef.current = onLoadMore; }, [onLoadMore]);

    // When the feed finishes loading new posts, collapse the indicator.
    useEffect(() => {
        if (requesting && !loadingMore) {
            // Small delay so the spinner is visible for at least a moment.
            const t = setTimeout(() => {
                setRequesting(false);
                setPush(0);
            }, 200);
            return () => clearTimeout(t);
        }
    }, [loadingMore, requesting]);

    const damp = (delta: number) => {
        const capped = Math.min(delta, maxPush);
        return capped * (1 - capped / (maxPush * 2.2));
    };

    const atBottom = (el: HTMLElement) => {
        // 2px tolerance for sub-pixel rounding
        return el.scrollHeight - el.scrollTop - el.clientHeight <= 2;
    };

    const finish = useCallback(async () => {
        if (!pushing.current) return;
        pushing.current = false;

        const shouldTrigger = pushRef.current >= threshold;
        if (!shouldTrigger || !hasMoreRef.current || loadingMoreRef.current) {
            setPush(0);
            startY.current = null;
            return;
        }

        setRequesting(true);
        setPush(0);
        startY.current = null;

        try {
            await onLoadMoreRef.current();
        } catch {
            // swallow — useMemesFeed already captures error state
            setRequesting(false);
        }
        // requesting stays true until loadingMore flips false (see effect above),
        // so the spinner doesn't flicker between the gesture and the fetch start.
    }, [threshold]);

    useEffect(() => {
        if (!scrollEl) return;

        const onTouchStart = (e: TouchEvent) => {
            if (!enabledRef.current || requestingRef.current) return;
            if (!atBottom(scrollEl)) return;
            startY.current = e.touches[0].clientY;
            pushing.current = false;
        };

        const onTouchMove = (e: TouchEvent) => {
            if (startY.current == null || !enabledRef.current || requestingRef.current) return;

            const delta = e.touches[0].clientY - startY.current;

            // Finger moves UP → delta is negative. We want that.
            if (delta >= 0 || !atBottom(scrollEl)) {
                if (pushing.current) {
                    setPush(0);
                    pushing.current = false;
                }
                startY.current = null;
                return;
            }

            // Only preventDefault once the user is clearly pushing past the
            // bottom edge — otherwise we'd block normal scrolling.
            if (!hasMoreRef.current || loadingMoreRef.current) return;

            e.preventDefault();
            pushing.current = true;
            setPush(damp(-delta));
        };

        const onTouchEnd = () => {
            void finish();
        };

        // Desktop trackpad / mouse wheel: same idea, deltaY > 0 at bottom.
        let wheelLock = false;
        const onWheel = (e: WheelEvent) => {
            if (!enabledRef.current || requestingRef.current) return;
            if (e.deltaY <= 0) return;
            if (!atBottom(scrollEl)) return;
            if (!hasMoreRef.current || loadingMoreRef.current) return;
            if (wheelLock) return;

            wheelLock = true;
            window.setTimeout(() => (wheelLock = false), 600);

            setRequesting(true);
            Promise.resolve(onLoadMoreRef.current())
                .catch(() => { })
                .finally(() => {
                    // requesting collapses via the loadingMore effect
                });
        };

        scrollEl.addEventListener("touchstart", onTouchStart, { passive: true });
        scrollEl.addEventListener("touchmove", onTouchMove, { passive: false });
        scrollEl.addEventListener("touchend", onTouchEnd, { passive: true });
        scrollEl.addEventListener("touchcancel", onTouchEnd, { passive: true });
        scrollEl.addEventListener("wheel", onWheel, { passive: true });

        return () => {
            scrollEl.removeEventListener("touchstart", onTouchStart);
            scrollEl.removeEventListener("touchmove", onTouchMove);
            scrollEl.removeEventListener("touchend", onTouchEnd);
            scrollEl.removeEventListener("touchcancel", onTouchEnd);
            scrollEl.removeEventListener("wheel", onWheel);
        };
    }, [scrollEl, finish]);

    return {
        push,
        requesting,
        threshold,
        progress: Math.min(push / threshold, 1),
    };
}