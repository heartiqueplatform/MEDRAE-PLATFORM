// src/modules/neldes-scroll/components/FeedContainer.tsx
// ============================================================
// Neldes Scroll — scroll container.
// Owns: vertical snap, infinite scroll (push-at-end), prefetch,
// active index.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { FeedCard } from "./FeedCard";
import { LoadingCard } from "./LoadingCard";
import { EmptyFeed } from "./EmptyFeed";
import type { FeedPost, ShareTarget } from "../types";
import { NELDES_COLORS } from "../config/constants";
import type { ShareDispatcher } from "./NeldesScrollScreen";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { usePushToLoadMore } from "../hooks/usePushToLoadMore";
import { CreatePostCard } from "./CreatePostCard";

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
    onOpenOwnerMenu: (post: FeedPost) => void;
    onPostViewed?: (postId: number) => void;
    currentUserId: string | null;

    isEnrolled: boolean;
    onGetApproved: () => void;
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
    onPostViewed,
    isEnrolled,
    onGetApproved,
}: FeedContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
    const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

    const setContainerRef = useCallback(
        (node: HTMLDivElement | null) => {
            containerRef.current = node;
            setScrollEl(node);
        },
        []
    );
    const pull = usePullToRefresh({
        onRefresh,
        enabled: true,
    });

    useEffect(() => {
        pull.setScrollEl(scrollEl);
    }, [pull.setScrollEl, scrollEl]);

    const push = usePushToLoadMore({
        onLoadMore: async () => {
            setHasAttemptedLoad(true);
            await onLoadMore();
        },
        loadingMore,
        hasMore,
        scrollEl,
        enabled: true,
    });

    const onVisibleRef = useRef(onVisible);
    useEffect(() => {
        onVisibleRef.current = onVisible;
    }, [onVisible]);

    const handleVisible = useCallback((index: number) => {
        setActiveIndex((prev) => (prev === index ? prev : index));
        onVisibleRef.current(index);
    }, []);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        let observer: IntersectionObserver | null = null;

        const attach = () => {
            observer?.disconnect();
            const cards = root.querySelectorAll<HTMLElement>("[data-neldes-card]");
            if (cards.length === 0) {
                observer = null;
                return;
            }
            observer = new IntersectionObserver(
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
            cards.forEach((c) => observer!.observe(c));
        };

        attach();

        const mo = new MutationObserver(() => attach());
        mo.observe(root, { childList: true, subtree: true });

        return () => {
            mo.disconnect();
            observer?.disconnect();
        };
    }, [handleVisible]);

    if (error && posts.length === 0) {
        return <EmptyFeed kind="error" message={error} onRetry={onRefresh} />;
    }

    if (loading && posts.length === 0) {
        return (
            <div className="w-full h-full" style={{ backgroundColor: NELDES_COLORS.bg }}>
                <LoadingCard />
            </div>
        );
    }
    // empty branch — ADD the two props
    if (!loading && posts.length === 0) {
        return (
            <EmptyFeed
                kind="empty"
                message="Be the first to make Medspite Scroll."
                onRetry={onRefresh}
                onCreate={onCreate}
                isEnrolled={isEnrolled}
                onGetApproved={onGetApproved}
            />
        );
    }

    return (
        <div
            ref={setContainerRef}
            className="w-full h-full overflow-y-scroll snap-y snap-mandatory overscroll-contain"
            style={{
                backgroundColor: NELDES_COLORS.bg,
                scrollSnapStop: "always",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
            }}
        >
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

            <div
                style={{
                    transform: `translateY(${pull.refreshing ? pull.threshold : pull.pull}px)`,
                    transition: pull.pull > 0 ? "none" : "transform 0.25s ease-out",
                    willChange: "transform",
                }}
            >
                {posts.map((post, index) => {
                    let ctaAt = false;
                    {
                        let next = 3;
                        let step = 5;
                        let pos = next;
                        while (pos <= posts.length) {
                            if (index + 1 === pos) {
                                ctaAt = true;
                                break;
                            }
                            if (pos > index + 1) break;
                            next += step;
                            step += 2;
                            pos = next;
                        }
                    }

                    return (
                        <div key={`fragment-${post.id}`} className="contents">
                            <div
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
                                    onPostViewed={onPostViewed}
                                />
                            </div>

                            {ctaAt && (
                                <div
                                    data-neldes-card
                                    data-neldes-index={`create-${index}`}
                                    className="w-full h-full snap-start snap-always flex-shrink-0"
                                >
                                    <CreatePostCard
                                        onCreate={onCreate}
                                        position={index + 1}
                                        isEnrolled={isEnrolled}
                                        onGetApproved={onGetApproved}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}

                {(loadingMore || push.requesting) && (
                    <div className="w-full h-full snap-start snap-always flex-shrink-0">
                        <LoadingCard />
                    </div>
                )}

                {!hasMore && !loadingMore && hasAttemptedLoad && posts.length > 0 && (
                    <div
                        data-neldes-card
                        data-neldes-index="end"
                        className="w-full h-full snap-start snap-always flex-shrink-0"
                    >
                        <CreatePostCard
                            onCreate={onCreate}
                            position={posts.length + 1}
                            isEnrolled={isEnrolled}
                            onGetApproved={onGetApproved}
                        />
                    </div>
                )}
            </div>

            <div
                className="sticky bottom-0 left-0 right-0 z-20 flex items-center justify-center pointer-events-none"
                style={{
                    height: push.requesting ? push.threshold : push.push,
                    transition: push.requesting ? "height 0.2s ease-out" : "none",
                    overflow: "hidden",
                    marginTop: `-${push.requesting ? push.threshold : push.push}px`,
                }}
            >
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{
                        backgroundColor: "rgba(0,0,0,0.55)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        opacity: push.requesting ? 1 : 0.4 + push.progress * 0.6,
                        transform: `scale(${push.requesting ? 1 : 0.6 + push.progress * 0.4})`,
                    }}
                >
                    {push.requesting ? (
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                        <span
                            className="text-white text-xs font-bold"
                            style={{
                                transform: `rotate(${push.progress >= 1 ? 0 : 180}deg)`,
                                transition: "transform 0.2s",
                            }}
                        >
                            ↑
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}