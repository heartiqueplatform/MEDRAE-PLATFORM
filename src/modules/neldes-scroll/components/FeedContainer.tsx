// src/modules/neldes-scroll/components/FeedContainer.tsx
// ============================================================
// Neldes Scroll — scroll container.
// Owns: vertical snap, infinite scroll, prefetch, active index.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { FeedCard } from "./FeedCard";
import { LoadingCard } from "./LoadingCard";
import { EmptyFeed } from "./EmptyFeed";
import type { FeedPost, ShareTarget } from "../types";
import { NELDES_COLORS } from "../config/constants";
import type { ShareDispatcher } from "./NeldesScrollScreen";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
interface FeedContainerProps {
    posts: FeedPost[];
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
    hasMore: boolean;
    onLoadMore: () => void;
    onVisible: (index: number) => void;
    onUpdate: (id: number, patch: Partial<FeedPost>) => void;
    onOpenComments: (post: FeedPost) => void;
    onOpenShare: (post: FeedPost) => void;
    onRefresh: () => void;
    onRegisterShare: (fn: ShareDispatcher) => void;
    onCreate: () => void;
    onOpenOwnerMenu: (post: FeedPost) => void;   // ← ADD
    currentUserId: string | null;                 // ← ADD
}

export function FeedContainer({
    posts,
    loading,
    loadingMore,
    error,
    hasMore,
    onLoadMore,
    onVisible,
    onUpdate,
    onOpenComments,
    onOpenShare,
    onRefresh,
    onRegisterShare,
    onCreate,
    onOpenOwnerMenu,
    currentUserId,
}: FeedContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Pull-to-refresh hook — must come BEFORE any useEffect that uses it
    const pull = usePullToRefresh({
        onRefresh,
        enabled: true,
    });

    // Hand the real scroller to the pull hook once it mounts
    useEffect(() => {
        pull.setScrollEl(containerRef.current);
    }, [pull.setScrollEl]);

    // ── Infinite scroll sentinel ──────────────────────────────
    useEffect(() => {
        if (!sentinelRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    onLoadMore();
                }
            },
            { root: containerRef.current, rootMargin: "400px" }
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, onLoadMore]);

    // ── Active card tracking ──────────────────────────────────
    const handleVisible = useCallback(
        (index: number) => {
            if (index === activeIndex) return;
            setActiveIndex(index);
            onVisible(index);
        },
        [activeIndex, onVisible]
    );

    // ── SCROLL OBSERVER (desktop + mobile) ────────────────────
    // Watches every card. Whichever card is >= 50% visible wins.
    // Works with mouse wheel, trackpad, touch — any input source.
    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const cards = root.querySelectorAll<HTMLElement>("[data-neldes-card]");
        if (cards.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                let best: IntersectionObserverEntry | null = null;
                for (const e of entries) {
                    if (!e.isIntersecting) continue;
                    if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
                }
                if (!best) return;
                const idx = Number(best.target.getAttribute("data-neldes-index") ?? "-1");
                if (idx >= 0) handleVisible(idx);
            },
            { root, threshold: [0.5, 0.6, 0.75, 1.0] }
        );

        cards.forEach((c) => observer.observe(c));
        return () => observer.disconnect();
    }, [posts.length, handleVisible]);

    if (error && posts.length === 0) {
        return <EmptyFeed kind="error" message={error} onRetry={onRefresh} />;
    }

    if (loading && posts.length === 0) {
        return (
            <div
                className="w-full h-full flex flex-col"
                style={{ backgroundColor: NELDES_COLORS.bg }}
            >
                <LoadingCard />
                <LoadingCard />
            </div>
        );
    }

    if (!loading && posts.length === 0) {
        return (
            <EmptyFeed
                kind="empty"
                message="Be the first to make Medspite Scroll."
                onRetry={onRefresh}
                onCreate={onCreate}
            />
        );
    }

    return (
        <div
            ref={containerRef}
            className="w-full h-full overflow-y-scroll snap-y snap-mandatory overscroll-contain"
            style={{
                backgroundColor: NELDES_COLORS.bg,
                scrollSnapStop: "always",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
            }}
        >
            {/* Pull indicator — absolutely positioned over the scroller */}
            <div
                className="sticky top-0 left-0 right-0 z-20 flex items-center justify-center pointer-events-none"
                style={{
                    height: pull.refreshing ? pull.threshold : pull.pull,
                    transition: pull.refreshing ? "height 0.2s ease-out" : "none",
                    overflow: "hidden",
                }}
            >
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{
                        backgroundColor: "rgba(0,0,0,0.55)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        opacity: pull.refreshing ? 1 : 0.4 + pull.progress * 0.6,
                        transform: `scale(${pull.refreshing ? 1 : 0.6 + pull.progress * 0.4})`,
                    }}
                >
                    {pull.refreshing ? (
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                        <span
                            className="text-white text-xs font-bold"
                            style={{
                                transform: `rotate(${pull.progress >= 1 ? 180 : 0}deg)`,
                                transition: "transform 0.2s",
                            }}
                        >
                            ↓
                        </span>
                    )}
                </div>
            </div>

            {/* Inner wrapper — THIS is what moves on pull */}
            <div
                style={{
                    transform: `translateY(${pull.refreshing ? pull.threshold : pull.pull
                        }px)`,
                    transition: pull.pull > 0 ? "none" : "transform 0.25s ease-out",
                    willChange: "transform",
                }}
            >
                {posts.map((post, index) => (
                    <div
                        key={post.id}
                        data-neldes-card
                        data-neldes-index={index}
                        className="w-full h-full snap-start snap-always flex-shrink-0"
                    >
                        <FeedCard
                            post={post}
                            onUpdate={onUpdate}
                            onOpenComments={onOpenComments}
                            onOpenShare={onOpenShare}
                            onVisible={handleVisible}
                            onRegisterShare={onRegisterShare}
                            onOpenOwnerMenu={onOpenOwnerMenu}
                            currentUserId={currentUserId}
                            onCreate={onCreate}
                            index={index}
                        />
                    </div>
                ))}

                {loadingMore && (
                    <div className="w-full h-full snap-start snap-always flex-shrink-0">
                        <LoadingCard />
                    </div>
                )}

                <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
            </div>
        </div>
    );
}