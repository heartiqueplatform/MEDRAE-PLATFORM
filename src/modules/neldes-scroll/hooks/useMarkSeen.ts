
import { useEffect, useRef } from "react";
import { markSeen } from "../lib/supabase-memes";
import { SEEN_DELAY_MS } from "../config/constants";

export function useMarkSeen(postId: number, onViewed?: () => void) {
    const ref = useRef<HTMLDivElement>(null);
    const firedRef = useRef(false);
    const timerRef = useRef<number | null>(null);
    const onViewedRef = useRef(onViewed);

    useEffect(() => {
        onViewedRef.current = onViewed;
    }, [onViewed]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        let visible = false;

        const clearTimer = () => {
            if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    visible =
                        entry.isIntersecting &&
                        entry.intersectionRatio >= 0.6;

                    if (firedRef.current) {
                        clearTimer();
                        return;
                    }

                    if (visible && timerRef.current === null) {
                        timerRef.current = window.setTimeout(async () => {
                            timerRef.current = null;

                            if (firedRef.current || !visible) return;

                            try {
                                await markSeen(postId);

                                firedRef.current = true;
                                onViewedRef.current?.();

                            } catch (error) {
                                console.warn(
                                    "[useMarkSeen] failed; will retry:",
                                    error
                                );
                            }
                        }, SEEN_DELAY_MS);
                    } else if (!visible) {
                        clearTimer();
                    }
                }
            },
            { threshold: [0.6] }
        );

        observer.observe(el);

        return () => {
            observer.disconnect();
            clearTimer();
        };
    }, [postId]);

    return ref;
}
