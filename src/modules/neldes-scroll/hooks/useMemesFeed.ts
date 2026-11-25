
// ============================================================
// Neldes Scroll — feed state.
// Handles initial load, infinite pagination, refresh,
// stable cursors, deduplication and terminal detection.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFeedPage } from "../lib/supabase-memes";
import { FEED_PAGE_SIZE, PREFETCH_THRESHOLD } from "../config/constants";
import type { FeedPost, FeedCursor } from "../types";

export function useMemesFeed() {
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    // Stable cursor: pinned status + date + ID.
    const cursorRef = useRef<FeedCursor | null>(null);

    const seenIdsRef = useRef<Set<number>>(new Set());
    const inflightRef = useRef(false);
    const initialLoadDoneRef = useRef(false);

    const loadPage = useCallback(async (isRefresh: boolean) => {
        // Never allow overlapping requests.
        if (inflightRef.current) return;

        inflightRef.current = true;

        if (isRefresh) {
            cursorRef.current = null;
            seenIdsRef.current.clear();
            setLoading(true);
            setHasMore(true);
        } else {
            setLoadingMore(true);
        }

        setError(null);

        try {
            const page = await fetchFeedPage(
                cursorRef.current,
                FEED_PAGE_SIZE
            );

            // Empty response means the feed is exhausted.
            if (page.length === 0) {
                setHasMore(false);

                if (isRefresh) {
                    setPosts([]);
                }

                return;
            }

            // Advance cursor using the last database row,
            // not the last newly inserted frontend row.
            const lastPost = page[page.length - 1];

            cursorRef.current = {
                is_pinned: Boolean(lastPost.is_pinned),
                published_at: lastPost.published_at,
                id: lastPost.id,
            };

            // Deduplicate posts.
            const fresh = page.filter(
                (post) => !seenIdsRef.current.has(post.id)
            );

            fresh.forEach((post) => {
                seenIdsRef.current.add(post.id);
            });

            // A short page means no further eligible posts
            // existed when this page was queried.
            if (page.length < FEED_PAGE_SIZE) {
                setHasMore(false);
            }

            // Append instead of replacing.
            setPosts((previous) =>
                isRefresh
                    ? fresh
                    : [...previous, ...fresh]
            );

        } catch (e: unknown) {
            const message =
                e instanceof Error
                    ? e.message
                    : "Failed to load feed";

            setError(message);

        } finally {
            setLoading(false);
            setLoadingMore(false);
            inflightRef.current = false;
        }
    }, []);

    // Initial load only once.
    useEffect(() => {
        if (initialLoadDoneRef.current) return;

        initialLoadDoneRef.current = true;
        void loadPage(true);
    }, [loadPage]);

    const refresh = useCallback(
        () => loadPage(true),
        [loadPage]
    );

    const loadMore = useCallback(() => {
        if (!hasMore || loadingMore || loading || inflightRef.current) {
            return;
        }

        return loadPage(false);
    }, [hasMore, loadingMore, loading, loadPage]);

    // Automatically request more before reaching the end.
    const maybePrefetch = useCallback(
        (currentIndex: number) => {
            if (
                hasMore &&
                !loading &&
                !loadingMore &&
                currentIndex >= posts.length - PREFETCH_THRESHOLD
            ) {
                void loadMore();
            }
        },
        [posts.length, hasMore, loading, loadingMore, loadMore]
    );

    const updatePost = useCallback(
        (id: number, patch: Partial<FeedPost>) => {
            setPosts((previous) =>
                previous.map((post) =>
                    post.id === id
                        ? { ...post, ...patch }
                        : post
                )
            );
        },
        []
    );

    return {
        posts,
        loading,
        loadingMore,
        error,
        hasMore,
        refresh,
        loadMore,
        maybePrefetch,
        updatePost,
    };
}