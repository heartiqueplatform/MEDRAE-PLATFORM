"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { cacheGet, cacheSet, isFresh, cacheGetStamped } from "@/lib/localCache";

export interface FollowState {
    following: boolean;
    followerCount: number;
}

const EMPTY: FollowState = Object.freeze({
    following: false,
    followerCount: 0,
});

const CACHE_KEY = "follows";
const HYDRATED_KEY = "follows:hydratedAt";

type FollowMap = Record<string, FollowState>;

/** Read the whole follow map from localStorage once, synchronously. */
function loadCache(): Map<string, FollowState> {
    const raw = cacheGet<FollowMap>(CACHE_KEY);
    if (!raw) return new Map();
    return new Map(Object.entries(raw));
}

function persist(map: Map<string, FollowState>) {
    const obj: FollowMap = {};
    map.forEach((v, k) => (obj[k] = v));
    cacheSet(CACHE_KEY, obj);
}

export function useShowFollows() {
    // ✅ L1: seed state from cache — the FIRST paint already has correct values
    const [state, setState] = useState<Map<string, FollowState>>(loadCache);

    const pendingRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const hydratedRef = useRef<Set<string>>(new Set());
    const inFlightRef = useRef<Set<string>>(new Set());

    // ✅ Persist to localStorage on every change (cheap — small map)
    useEffect(() => {
        persist(state);
    }, [state]);

    // Cleanup pending timers
    useEffect(() => {
        const pending = pendingRef.current;
        return () => {
            pending.forEach((t) => clearTimeout(t));
            pending.clear();
        };
    }, []);

    /** Only set if something actually changed → prevents phantom re-renders. */
    const writeIfChanged = useCallback(
        (id: string, next: FollowState) => {
            setState((prev) => {
                const cur = prev.get(id);
                if (
                    cur &&
                    cur.following === next.following &&
                    cur.followerCount === next.followerCount
                ) {
                    return prev; // ← no re-render
                }
                const map = new Map(prev);
                map.set(id, next);
                return map;
            });
        },
        []
    );

    const toggle = useCallback((showId: string) => {
        if (!showId) return;

        // Optimistic flip
        setState((prev) => {
            const next = new Map(prev);
            const cur = next.get(showId) ?? EMPTY;
            const nowFollowing = !cur.following;
            next.set(showId, {
                following: nowFollowing,
                followerCount: Math.max(
                    0,
                    cur.followerCount + (nowFollowing ? 1 : -1)
                ),
            });
            return next;
        });

        inFlightRef.current.add(showId);

        const existing = pendingRef.current.get(showId);
        if (existing) clearTimeout(existing);

        pendingRef.current.set(
            showId,
            setTimeout(async () => {
                pendingRef.current.delete(showId);

                const { data, error } = await supabase.rpc("toggle_follow", {
                    p_show_id: showId,
                });

                if (error) {
                    console.error("toggle_follow failed:", error);
                    setState((prev) => {
                        const next = new Map(prev);
                        const cur = next.get(showId);
                        if (!cur) return next;
                        next.set(showId, {
                            following: !cur.following,
                            followerCount: Math.max(
                                0,
                                cur.followerCount + (cur.following ? -1 : 1)
                            ),
                        });
                        return next;
                    });
                    inFlightRef.current.delete(showId);
                    return;
                }

                const row = Array.isArray(data) ? data[0] : data;
                if (row) {
                    writeIfChanged(showId, {
                        following: !!row.following,
                        followerCount: Number(row.follower_count ?? 0),
                    });
                }
                inFlightRef.current.delete(showId);
            }, 150)
        );
    }, [writeIfChanged]);

    const hydrate = useCallback(async (showIds: string[], opts?: { force?: boolean }) => {
        if (!showIds || showIds.length === 0) return;

        const newIds = showIds.filter((id) => !hydratedRef.current.has(id));
        if (newIds.length === 0 && !opts?.force) return;
        newIds.forEach((id) => hydratedRef.current.add(id));

        const {
            data: { user },
        } = await supabase.auth.getUser();

        const [statsRes, myFollowsRes] = await Promise.all([
            supabase
                .from("podcast_show_stats")
                .select("show_id,follower_count")
                .in("show_id", newIds),

            user
                ? supabase
                    .from("podcast_follows")
                    .select("show_id")
                    .eq("user_id", user.id)
                    .in("show_id", newIds)
                : Promise.resolve({ data: [] as any[] }),
        ]);

        const mySet = new Set(
            (myFollowsRes.data ?? []).map((r: any) => r.show_id as string)
        );

        // ✅ Batch the write — build a merged map, then commit ONE setState
        setState((prev) => {
            let mutated = false;
            const next = new Map(prev);

            for (const s of (statsRes.data ?? []) as any[]) {
                if (inFlightRef.current.has(s.show_id)) continue;

                const server = {
                    following: mySet.has(s.show_id),
                    followerCount: Number(s.follower_count ?? 0),
                };

                const cur = next.get(s.show_id);
                if (
                    cur &&
                    cur.following === server.following &&
                    cur.followerCount === server.followerCount
                ) {
                    continue; // ← no change → no re-render
                }
                next.set(s.show_id, server);
                mutated = true;
            }

            // Shows the user follows but that don't have a stats row yet
            for (const id of mySet) {
                if (inFlightRef.current.has(id)) continue;
                const cur = next.get(id);
                if (cur) continue;
                next.set(id, { following: true, followerCount: 0 });
                mutated = true;
            }

            return mutated ? next : prev;
        });
    }, []);

    const get = useCallback(
        (showId: string) => state.get(showId) ?? EMPTY,
        [state]
    );

    return { toggle, hydrate, get };
}