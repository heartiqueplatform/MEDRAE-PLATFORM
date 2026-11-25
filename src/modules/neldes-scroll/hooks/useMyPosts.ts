// ============================================================
// Neldes Scroll — my own posts feed.
// No filters. Cursor pagination. Author always sees their own.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FEED_PAGE_SIZE } from "../config/constants";
import type { FeedPost } from "../types";

export async function fetchMyPostsPage(
    authorId: string,
    cursor: string | null = null,
    limit = FEED_PAGE_SIZE
): Promise<FeedPost[]> {
    let query = supabase
        .from("memes_posts")
        .select(
            "id, type, title, caption, image_url, video_url, link_url, author_id, author_name, author_avatar, likes_count, comments_count, shares_count, downloads_count, views_count, published_at"
        )
        .eq("author_id", authorId)
        .eq("is_active", true)
        .order("published_at", { ascending: false })
        .limit(limit);

    if (cursor) {
        query = query.lt("published_at", cursor);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Attach is_liked / is_saved for the current user
    const rows = (data ?? []) as FeedPost[];
    if (rows.length === 0) return rows;

    const ids = rows.map((r) => r.id);
    const { data: inter } = await supabase
        .from("memes_interactions")
        .select("post_id, action")
        .in("post_id", ids)
        .eq("user_id", authorId)
        .in("action", ["like", "save"]);

    const likedSet = new Set<number>();
    const savedSet = new Set<number>();
    for (const row of inter ?? []) {
        if (row.action === "like") likedSet.add(row.post_id as number);
        if (row.action === "save") savedSet.add(row.post_id as number);
    }

    return rows.map((r) => ({
        ...r,
        is_liked: likedSet.has(r.id),
        is_saved: savedSet.has(r.id),
    }));
}

export function useMyPosts(authorId: string | null) {
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const cursorRef = useRef<string | null>(null);
    const seenIdsRef = useRef<Set<number>>(new Set());
    const inflightRef = useRef(false);
    const initialLoadDoneRef = useRef(false);

    const loadPage = useCallback(
        async (isRefresh: boolean) => {
            if (!authorId) {
                setLoading(false);
                return;
            }
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
                const page = await fetchMyPostsPage(
                    authorId,
                    cursorRef.current,
                    FEED_PAGE_SIZE
                );

                if (page.length > 0) {
                    cursorRef.current = page[page.length - 1].published_at;
                }

                const fresh = page.filter((p) => !seenIdsRef.current.has(p.id));
                fresh.forEach((p) => seenIdsRef.current.add(p.id));

                if (page.length > 0 && page.length < FEED_PAGE_SIZE) {
                    setHasMore(false);
                }

                if (fresh.length > 0) {
                    setPosts((prev) => (isRefresh ? fresh : [...prev, ...fresh]));
                }
            } catch (e: any) {
                setError(e?.message || "Failed to load your posts");
            } finally {
                setLoading(false);
                setLoadingMore(false);
                inflightRef.current = false;
            }
        },
        [authorId]
    );

    useEffect(() => {
        if (!authorId) return;
        if (initialLoadDoneRef.current) return;
        initialLoadDoneRef.current = true;
        loadPage(true);
    }, [authorId, loadPage]);

    const refresh = useCallback(() => loadPage(true), [loadPage]);
    const loadMore = useCallback(() => {
        if (!hasMore || loadingMore || loading) return;
        return loadPage(false);
    }, [hasMore, loadingMore, loading, loadPage]);

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
        updatePost,
    };
}