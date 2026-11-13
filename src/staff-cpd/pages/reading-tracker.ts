// src/staff-cpd/pages/reading-tracker.ts
import { useEffect, useRef, useState } from "react";

/**
 * Real reading-progress tracker for text lessons.
 *
 * Reading is considered "done" only when BOTH conditions hold:
 *   1. The user has scrolled through ≥ 90% of the content
 *   2. They have spent at least `minSeconds` on the page AND
 *      the visible content has been on screen at least `minVisibleSeconds`
 *
 * Fast scroll-through (skimming) does NOT count. The tracker samples
 * scroll position every 500ms; if the user jumps more than 25% in
 * one tick, the jump is ignored (treated as "not real reading").
 *
 * Returns:
 *   progress: 0..100 — max % actually viewed
 *   secondsReading: how long the content has been on screen
 *   isComplete: true once both gates are passed
 */
export function useReadingProgress(
    containerRef: React.RefObject<HTMLElement>,
    opts: {
        /** Minimum seconds spent reading (default 30) */
        minSeconds?: number;
        /** Minimum % of the page that must be viewed (default 90) */
        minPercent?: number;
        /** Max scroll jump in one tick that's considered "reading" (default 25% of page) */
        maxJumpPercent?: number;
    } = {}
) {
    const {
        minSeconds = 30,
        minPercent = 90,
        maxJumpPercent = 25,
    } = opts;

    const [progress, setProgress] = useState(0);
    const [secondsReading, setSecondsReading] = useState(0);

    const lastScrollTop = useRef(0);
    const tickRef = useRef<number>(0);

    /* Scroll tracking */
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        let raf = 0;
        const check = () => {
            const scrollHeight = el.scrollHeight - el.clientHeight;
            const scrollTop = el.scrollTop;
            const visibleBottom = scrollTop + el.clientHeight;

            // Percent of page seen so far
            const percent = scrollHeight <= 0
                ? 100
                : Math.min(100, Math.round((visibleBottom / el.scrollHeight) * 100));

            // Anti-skim: if this scroll step is bigger than maxJumpPercent of page, ignore
            const jumpPercent = Math.abs(scrollTop - lastScrollTop.current) / Math.max(1, scrollHeight) * 100;
            lastScrollTop.current = scrollTop;

            if (jumpPercent > maxJumpPercent) {
                // User jumped (e.g. dragged scrollbar or clicked anchor) — don't count this position
                return;
            }

            setProgress((prev) => Math.max(prev, percent));
        };

        const onScroll = () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                check();
            });
        };

        el.addEventListener("scroll", onScroll, { passive: true });
        // Run once on mount to account for short pages
        check();

        return () => {
            el.removeEventListener("scroll", onScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [containerRef, maxJumpPercent]);

    /* Time tracking — only while the tab is visible */
    useEffect(() => {
        tickRef.current = window.setInterval(() => {
            if (document.hidden) return;
            setSecondsReading((s) => s + 1);
        }, 1000);
        return () => {
            if (tickRef.current) clearInterval(tickRef.current);
        };
    }, []);

    const isComplete = progress >= minPercent && secondsReading >= minSeconds;

    return { progress, secondsReading, isComplete, minPercent, minSeconds };
}