// ============================================================
// Neldes Scroll — counts a post as "seen" when in view 1s.
// Called from FeedCard via IntersectionObserver.
// ============================================================

import { useEffect, useRef } from "react";
import { markSeen } from "../lib/supabase-memes";
import { SEEN_DELAY_MS } from "../config/constants";

export function useMarkSeen(postId: number) {
    const ref = useRef<HTMLDivElement>(null);
    const firedRef = useRef(false);

    useEffect(() => {
        if (!ref.current || firedRef.current) return;
        const timer = { id: 0 as any };

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !firedRef.current) {
                        timer.id = setTimeout(() => {
                            markSeen(postId);
                            firedRef.current = true;
                        }, SEEN_DELAY_MS);
                    } else {
                        clearTimeout(timer.id);
                    }
                });
            },
            { threshold: 0.6 }
        );

        observer.observe(ref.current);
        return () => {
            observer.disconnect();
            clearTimeout(timer.id);
        };
    }, [postId]);

    return ref;
}