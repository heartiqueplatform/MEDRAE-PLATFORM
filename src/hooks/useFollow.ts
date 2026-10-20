// src/hooks/useFollow.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export interface FollowStatus {
    iFollow: boolean;
    theyFollow: boolean;
    mutual: boolean;
}

const CACHE_PREFIX = "medrae:follow_status:";
const TTL_MS = 10 * 60 * 1000; // 10 min

// In-memory session cache — survives re-renders, dies on tab close
const sessionCache = new Map<string, { data: FollowStatus; ts: number }>();

// Tiny event bus so useFollowingList can react to toggles elsewhere
const FOLLOW_CHANGED_EVENT = "medrae:follow-changed";
export const emitFollowChanged = (targetUserId: string) => {
    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent(FOLLOW_CHANGED_EVENT, { detail: { targetUserId } })
        );
    }
};
export const onFollowChanged = (cb: (userId: string) => void) => {
    if (typeof window === "undefined") return () => { };
    const handler = (e: Event) => {
        const detail = (e as CustomEvent).detail as { targetUserId?: string };
        if (detail?.targetUserId) cb(detail.targetUserId);
    };
    window.addEventListener(FOLLOW_CHANGED_EVENT, handler);
    return () => window.removeEventListener(FOLLOW_CHANGED_EVENT, handler);
};

function readCache(targetUserId: string): FollowStatus | null {
    // 1) session cache
    const mem = sessionCache.get(targetUserId);
    if (mem && Date.now() - mem.ts < TTL_MS) return mem.data;

    // 2) localStorage (cross-tab, offline-friendly)
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + targetUserId);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw) as { data: FollowStatus; ts: number };
        // Offline: return stale cache — better than nothing
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            return data;
        }
        if (Date.now() - ts < TTL_MS) return data;
        return null;
    } catch {
        return null;
    }
}

function writeCache(targetUserId: string, data: FollowStatus) {
    const ts = Date.now();
    sessionCache.set(targetUserId, { data, ts });
    try {
        localStorage.setItem(CACHE_PREFIX + targetUserId, JSON.stringify({ data, ts }));
    } catch {
        // quota — ignore
    }
}

export function useFollow(targetUserId: string | null | undefined) {
    const [status, setStatus] = useState<FollowStatus>({
        iFollow: false,
        theyFollow: false,
        mutual: false,
    });
    const [loading, setLoading] = useState<boolean>(!!targetUserId);
    const inFlightRef = useRef(false);

    // Load status
    useEffect(() => {
        if (!targetUserId) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        const cached = readCache(targetUserId);
        if (cached) {
            setStatus(cached);
            setLoading(false);
        } else {
            setLoading(true);
        }

        // Background revalidate (never block on network)
        (async () => {
            if (typeof navigator !== "undefined" && navigator.onLine === false) return;
            try {
                const { data, error } = await supabase.rpc("get_user_follow_status", {
                    target_user_id: targetUserId,
                });
                if (cancelled || error || !data) return;
                const row = Array.isArray(data) ? data[0] : data;
                const fresh: FollowStatus = {
                    iFollow: !!row?.i_follow,
                    theyFollow: !!row?.they_follow,
                    mutual: !!row?.i_follow && !!row?.they_follow,
                };
                setStatus(fresh);
                writeCache(targetUserId, fresh);
            } catch (err) {
                console.warn("[useFollow] revalidate failed:", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        // React to toggles elsewhere (e.g. same user shown in another list)
        const off = onFollowChanged((changedId) => {
            if (changedId === targetUserId) {
                const fresh = readCache(targetUserId);
                if (fresh) setStatus(fresh);
            }
        });

        return () => {
            cancelled = true;
            off();
        };
    }, [targetUserId]);

    const toggleFollow = useCallback(async () => {
        if (!targetUserId || inFlightRef.current) return;
        inFlightRef.current = true;

        const prev = status;
        // Optimistic: flip iFollow immediately; mutual only if theyFollow already true
        const optimistic: FollowStatus = {
            iFollow: !prev.iFollow,
            theyFollow: prev.theyFollow,
            mutual: !prev.iFollow && prev.theyFollow,
        };
        setStatus(optimistic);
        writeCache(targetUserId, optimistic);
        emitFollowChanged(targetUserId);

        try {
            const { data, error } = await supabase.rpc("toggle_user_follow", {
                target_user_id: targetUserId,
            });
            if (error) throw error;

            const row = Array.isArray(data) ? data[0] : data;
            const following = !!row?.following;

            // Reconcile from server truth (handles rare drift)
            const reconciled: FollowStatus = {
                iFollow: following,
                theyFollow: prev.theyFollow,
                mutual: following && prev.theyFollow,
            };
            setStatus(reconciled);
            writeCache(targetUserId, reconciled);
            emitFollowChanged(targetUserId);
        } catch (err: any) {
            // Revert
            setStatus(prev);
            writeCache(targetUserId, prev);
            emitFollowChanged(targetUserId);
            toast.error("Couldn't update follow. Try again.", {
                description: err?.message ?? undefined,
            });
        } finally {
            inFlightRef.current = false;
        }
    }, [targetUserId, status]);

    return { status, loading, toggleFollow };
}