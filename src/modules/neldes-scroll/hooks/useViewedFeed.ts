// src/modules/neldes-scroll/hooks/useViewedFeed.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchViewedPage, type ViewedPost } from "../lib/supabase-memes";
import type { FeedPost } from "../types";

export function useViewedFeed() {
    const [posts, setPosts] = useState<ViewedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const cursorRef = useRef<string>(new Date().toISOString());
    const inflightRef = useRef(false);

    const loadPage = useCallback(async (isRefresh: boolean) => {
        if (inflightRef.current) return;
        inflightRef.current = true;

        if (isRefresh) {
            cursorRef.current = new Date().toISOString();
            setLoading(true);
        } else {
            setLoadingMore(true);
        }
        setError(null);

        try {
            const page = await fetchViewedPage(cursorRef.current, 20);
            if (page.length === 0) {
                setHasMore(false);
            } else {
                setPosts((prev) => (isRefresh ? page : [...prev, ...page]));
                cursorRef.current = page[page.length - 1].last_interacted;
            }
        } catch (e: any) {
            setError(e?.message || "Failed to load viewed posts");
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

    const maybePrefetch = useCallback(
        (currentIndex: number) => {
            if (currentIndex >= posts.length - 3) loadMore();
        },
        [posts.length, loadMore]
    );

    const updatePost = useCallback(
        (id: number, patch: Partial<FeedPost>) => {
            setPosts((prev) =>
                prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
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