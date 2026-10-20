// src/hooks/useFollowingList.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";
import { onFollowChanged } from "@/hooks/useFollow";

const CACHE_PREFIX = "medrae:following_list:";
const TTL_MS = 10 * 60 * 1000; // 10 min

interface CacheShape {
    ids: string[];
    ts: number;
}

function readCache(userId: string): Set<string> | null {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + userId);
        if (!raw) return null;
        const { ids, ts } = JSON.parse(raw) as CacheShape;
        // Offline: trust stale cache. Better than empty set.
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            return new Set(ids);
        }
        if (Date.now() - ts < TTL_MS) return new Set(ids);
        return null;
    } catch {
        return null;
    }
}

function writeCache(userId: string, ids: string[]) {
    try {
        const payload: CacheShape = { ids, ts: Date.now() };
        localStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(payload));
    } catch {
        // quota — ignore
    }
}

export function useFollowingList() {
    const { user } = useAuth();
    const userId = user?.id ?? null;

    const [ids, setIds] = useState<Set<string>>(() => {
        if (!userId) return new Set();
        return readCache(userId) ?? new Set();
    });
    const [loading, setLoading] = useState<boolean>(!userId ? false : !readCache(userId));

    const inFlightRef = useRef(false);

    const fetchFresh = useCallback(async () => {
        if (!userId || inFlightRef.current) return;
        if (typeof navigator !== "undefined" && navigator.onLine === false) return;

        inFlightRef.current = true;
        try {
            const { data, error } = await supabase
                .from("user_connections")
                .select("following_id")
                .eq("follower_id", userId);

            if (error) throw error;

            const fresh = new Set<string>(
                (data ?? []).map((r: { following_id: string }) => r.following_id)
            );
            setIds(fresh);
            writeCache(userId, Array.from(fresh));
        } catch (err) {
            console.warn("[useFollowingList] fetch failed:", err);
        } finally {
            inFlightRef.current = false;
            setLoading(false);
        }
    }, [userId]);

    // Initial load
    useEffect(() => {
        if (!userId) {
            setIds(new Set());
            setLoading(false);
            return;
        }

        const cached = readCache(userId);
        if (cached) {
            setIds(cached);
            setLoading(false);
        }

        fetchFresh();
    }, [userId, fetchFresh]);

    // React to toggles from anywhere in the app
    useEffect(() => {
        if (!userId) return;
        const off = onFollowChanged((targetUserId) => {
            // The event doesn't tell us whether it was a follow or unfollow,
            // so just refetch. It's one cheap row-set query, cached 10 min.
            fetchFresh();
        });
        return off;
    }, [userId, fetchFresh]);

    // Cross-tab sync: if another tab toggles, re-read cache
    useEffect(() => {
        if (!userId) return;
        const handler = (e: StorageEvent) => {
            if (e.key !== CACHE_PREFIX + userId) return;
            const cached = readCache(userId);
            if (cached) setIds(cached);
        };
        window.addEventListener("storage", handler);
        return () => window.removeEventListener("storage", handler);
    }, [userId]);

    const isFollowing = useCallback(
        (targetUserId: string) => ids.has(targetUserId),
        [ids]
    );

    return { following: ids, isFollowing, loading, refresh: fetchFresh };
}