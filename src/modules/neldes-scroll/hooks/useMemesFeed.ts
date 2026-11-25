// ============================================================
// Neldes Scroll — feed state. One hook, one concern.
// Handles: initial load, pagination, refresh, error, dedupe.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFeedPage } from "../lib/supabase-memes";
import { FEED_PAGE_SIZE, PREFETCH_THRESHOLD } from "../config/constants";
import type { FeedPost } from "../types";

export function useMemesFeed() {
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const cursorRef = useRef<string>(new Date().toISOString());
    const seenIdsRef = useRef<Set<number>>(new Set());
    const inflightRef = useRef(false);

    const loadPage = useCallback(async (isRefresh: boolean) => {
        if (inflightRef.current) return;
        inflightRef.current = true;

        if (isRefresh) {
            cursorRef.current = new Date().toISOString();
            seenIdsRef.current.clear();
            setLoading(true);
            // Reset the end-of-feed latch so a refresh can revive the feed.
            setHasMore(true);
        } else {
            setLoadingMore(true);
        }
        setError(null);

        try {
            const page = await fetchFeedPage(cursorRef.current, FEED_PAGE_SIZE);

            // Advance the cursor off the RAW page (not the deduped subset).
            // Otherwise overlapping rows never move the cursor forward and
            // the next fetch re-requests the same boundary rows forever.
            if (page.length > 0) {
                cursorRef.current = page[page.length - 1].published_at;
            }

            const fresh = page.filter((p) => !seenIdsRef.current.has(p.id));
            fresh.forEach((p) => seenIdsRef.current.add(p.id));

            // End-of-feed is decided by the SERVER page size, not by the
            // client dedupe count. A fully-deduped page is a retry signal,
            // not proof that the feed is exhausted.
            if (page.length < FEED_PAGE_SIZE) {
                setHasMore(false);
            }

            if (fresh.length > 0) {
                setPosts((prev) => (isRefresh ? fresh : [...prev, ...fresh]));
            }
            // If fresh.length === 0 but page.length > 0, the cursor has
            // already advanced, so the next sentinel call will fetch the
            // next window. Nothing to append; keep hasMore as-is.
        } catch (e: any) {
            setError(e?.message || "Failed to load feed");
        } finally {
            setLoading(false);
            setLoadingMore(false);
            inflightRef.current = false;
        }
    }, []);

    useEffect(() => {
        loadPage(true);
    }, [loadPage]);

    const refresh = useCallback(() => loadPage(true), [loadPage]);
    const loadMore = useCallback(() => {
        if (!hasMore || loadingMore || loading) return;
        return loadPage(false);
    }, [hasMore, loadingMore, loading, loadPage]);

    // Prefetch when near end
    const maybePrefetch = useCallback(
        (currentIndex: number) => {
            if (currentIndex >= posts.length - PREFETCH_THRESHOLD) loadMore();
        },
        [posts.length, loadMore]
    );

    /** Apply a local optimistic update to one post. */
    const updatePost = useCallback(
        (id: number, patch: Partial<FeedPost>) => {
            setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
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