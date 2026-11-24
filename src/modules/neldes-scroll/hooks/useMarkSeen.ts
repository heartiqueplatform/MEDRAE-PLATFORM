// src/modules/neldes-scroll/hooks/useMarkSeen.ts
import { useEffect, useRef } from "react";
import { markSeen } from "../lib/supabase-memes";
import { SEEN_DELAY_MS } from "../config/constants";

export function useMarkSeen(postId: number, onViewed?: () => void) {
    const ref = useRef<HTMLDivElement>(null);
    const firedRef = useRef(false);
    const timerRef = useRef<number | null>(null);

    // Keep callback current without re-running the effect
    const onViewedRef = useRef(onViewed);
    useEffect(() => { onViewedRef.current = onViewed; }, [onViewed]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const clearTimer = () => {
            if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (firedRef.current) { clearTimer(); return; }
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                        if (timerRef.current === null) {
                            timerRef.current = window.setTimeout(() => {
                                timerRef.current = null;
                                if (firedRef.current) return;
                                firedRef.current = true;
                                markSeen(postId)
                                    .then(() => onViewedRef.current?.())
                                    .catch((e) =>
                                        console.warn("[useMarkSeen] failed:", e)
                                    );
                            }, SEEN_DELAY_MS);
                        }
                    } else {
                        clearTimer();
                    }
                }
            },
            { threshold: [0.6] }
        );

        observer.observe(el);
        return () => { observer.disconnect(); clearTimer(); };
    }, [postId]);

    return ref;
}