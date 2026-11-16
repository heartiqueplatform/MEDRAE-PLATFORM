// lib/notifications/useNotificationCount.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import { fetchUnreadCount } from "./api";

const CACHE_TTL = 60_000; // 1 min — cheap, fresh enough
const CACHE_PREFIX = "notif_count_";

interface Snapshot {
    count: number;
    timestamp: number;
}

function readCache(userId: string): Snapshot | null {
    try {
        const raw = localStorage.getItem(`${CACHE_PREFIX}${userId}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Snapshot;
        if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeCache(userId: string, count: number): void {
    try {
        localStorage.setItem(
            `${CACHE_PREFIX}${userId}`,
            JSON.stringify({ count, timestamp: Date.now() })
        );
    } catch {
        /* quota — ignore */
    }
}

/**
 * Single source of truth for the notification badge.
 * - Paints instantly from cache (any age — only freshness gates refetch).
 * - Refetches on mount, on focus, on online, and on realtime INSERT.
 * - Provides `refresh()` for after markRead/markAllRead/delete.
 */
export function useNotificationCount() {
    const user = useUser();
    const userId = user?.id ?? null;

    const [count, setCount] = useState<number>(() => {
        if (!userId) return 0;
        const cached = readCache(userId);
        return cached?.count ?? 0;
    });

    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    // Seed from disk the moment userId becomes available
    useEffect(() => {
        if (!userId) return;
        const cached = readCache(userId);
        if (cached) setCount(cached.count);
    }, [userId]);

    const refresh = useCallback(async () => {
        if (!userId) return;
        try {
            const n = await fetchUnreadCount(userId);
            if (!mounted.current) return;
            setCount(n);
            writeCache(userId, n);
        } catch {
            /* silent — cache remains */
        }
    }, [userId]);

    // Initial fetch + focus + online
    useEffect(() => {
        if (!userId) return;
        refresh();
        const onFocus = () => {
            if (!document.hidden) refresh();
        };
        const onOnline = () => refresh();
        window.addEventListener("focus", onFocus);
        window.addEventListener("online", onOnline);
        document.addEventListener("visibilitychange", onFocus);
        return () => {
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("online", onOnline);
            document.removeEventListener("visibilitychange", onFocus);
        };
    }, [userId, refresh]);

    // Realtime INSERT — bump badge without polling
    useEffect(() => {
        if (!userId) return;
        const channel = supabase
            .channel(`notif-badge:${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    refresh();
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, refresh]);

    /** Optimistic override (e.g. after markRead). */
    const setOptimistic = useCallback(
        (delta: number) => {
            if (!userId) return;
            setCount((prev) => {
                const next = Math.max(0, prev + delta);
                writeCache(userId, next);
                return next;
            });
        },
        [userId]
    );

    return { count, refresh, setOptimistic };
}