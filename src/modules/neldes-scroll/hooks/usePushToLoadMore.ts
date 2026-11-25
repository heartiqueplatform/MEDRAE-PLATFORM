// src/modules/neldes-scroll/hooks/usePushToLoadMore.ts
import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
    onLoadMore: () => Promise<void> | void;
    threshold?: number;
    maxPush?: number;
    loadingMore: boolean;
    hasMore: boolean;
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

    useEffect(() => {
        if (requesting && !loadingMore) {
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
            setRequesting(false);
        }
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

            if (delta >= 0 || !atBottom(scrollEl)) {
                if (pushing.current) {
                    setPush(0);
                    pushing.current = false;
                }
                startY.current = null;
                return;
            }

            if (!hasMoreRef.current || loadingMoreRef.current) return;

            e.preventDefault();
            pushing.current = true;
            setPush(damp(-delta));
        };

        const onTouchEnd = () => {
            void finish();
        };

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
                .finally(() => { });
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