"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { cacheGet, cacheSet } from "@/lib/localCache";

type ReactionKind = "like" | "love" | "save";
type TargetType = "show" | "episode";

export interface InteractionState {
    liked: boolean;
    loved: boolean;
    saved: boolean;
    counts: { like: number; love: number; save: number };
    playCount: number;
}

const EMPTY: InteractionState = Object.freeze({
    liked: false,
    loved: false,
    saved: false,
    counts: { like: 0, love: 0, save: 0 },
    playCount: 0,
});

const flagOf = (kind: ReactionKind): "liked" | "loved" | "saved" =>
    kind === "like" ? "liked" : kind === "love" ? "loved" : "saved";

// ─── localStorage cache ────────────────────────────────────────
const CACHE_KEY = "reactions:v1";

type PersistShape = Record<string, InteractionState>;

function loadCache(): Map<string, InteractionState> {
    const raw = cacheGet<PersistShape>(CACHE_KEY);
    if (!raw) return new Map();
    try {
        return new Map(Object.entries(raw));
    } catch {
        return new Map();
    }
}

function persist(map: Map<string, InteractionState>) {
    const obj: PersistShape = {};
    map.forEach((v, k) => (obj[k] = v));
    cacheSet(CACHE_KEY, obj);
}

/** Deep-equality check for InteractionState — used to skip no-op writes. */
function eq(a: InteractionState, b: InteractionState): boolean {
    return (
        a.liked === b.liked &&
        a.loved === b.loved &&
        a.saved === b.saved &&
        a.playCount === b.playCount &&
        a.counts.like === b.counts.like &&
        a.counts.love === b.counts.love &&
        a.counts.save === b.counts.save
    );
}

export function useEpisodeInteractions() {
    // ✅ L1: seed from cache — the FIRST paint already has the correct state
    const [state, setState] = useState<Map<string, InteractionState>>(loadCache);

    // Debounce timers per key
    const pendingRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    // In-flight keys — hydrate() must not clobber these
    const inFlightRef = useRef<Set<string>>(new Set());

    // Track which IDs we've already hydrated
    const hydratedRef = useRef<Set<string>>(new Set());

    const keyOf = (t: TargetType, id: string) => `${t}:${id}`;

    // ─────────────────────────────────────────────────────────
    // Persist to localStorage on every state change.
    // Cheap — the map is small and writes are ~1 KB.
    // ─────────────────────────────────────────────────────────
    useEffect(() => {
        persist(state);
    }, [state]);

    // Clean up pending timers on unmount
    useEffect(() => {
        const pending = pendingRef.current;
        return () => {
            pending.forEach((t) => clearTimeout(t));
            pending.clear();
        };
    }, []);

    /**
     * Write only if the value actually changed.
     * Returning `prev` from the updater = React skips the re-render.
     * This is what stops the "content rearranging itself" on hydrate.
     */
    const writeIfChanged = useCallback(
        (key: string, next: InteractionState) => {
            setState((prev) => {
                const cur = prev.get(key);
                if (cur && eq(cur, next)) return prev; // no-op
                const map = new Map(prev);
                map.set(key, next);
                return map;
            });
        },
        []
    );

    const toggle = useCallback(
        (targetType: TargetType, targetId: string, kind: ReactionKind) => {
            const key = keyOf(targetType, targetId);
            const flag = flagOf(kind);

            // ─────────────────────────────────────────────
            // 1. OPTIMISTIC FLIP — synchronous, feels instant
            // ─────────────────────────────────────────────
            setState((prev) => {
                const next = new Map(prev);
                const cur = next.get(key) ?? EMPTY;
                const nowActive = !cur[flag];
                const delta = nowActive ? 1 : -1;
                next.set(key, {
                    ...cur,
                    [flag]: nowActive,
                    counts: {
                        ...cur.counts,
                        [kind]: Math.max(0, cur.counts[kind] + delta),
                    },
                });
                return next;
            });

            inFlightRef.current.add(key);

            // ─────────────────────────────────────────────
            // 2. DEBOUNCED SERVER SYNC (one RPC per burst)
            // ─────────────────────────────────────────────
            const existing = pendingRef.current.get(key);
            if (existing) clearTimeout(existing);

            pendingRef.current.set(
                key,
                setTimeout(async () => {
                    pendingRef.current.delete(key);

                    const { data, error } = await supabase.rpc("toggle_reaction", {
                        p_target_type: targetType,
                        p_target_id: targetId,
                        p_kind: kind,
                    });

                    // ─────────────────────────────────────────
                    // 3a. FAILURE → roll back the optimistic flip
                    // ─────────────────────────────────────────
                    if (error) {
                        console.error("toggle_reaction failed:", error);
                        setState((prev) => {
                            const next = new Map(prev);
                            const cur = next.get(key);
                            if (!cur) return next;
                            const wasActive = cur[flag];
                            next.set(key, {
                                ...cur,
                                [flag]: !wasActive,
                                counts: {
                                    ...cur.counts,
                                    [kind]: Math.max(
                                        0,
                                        cur.counts[kind] + (wasActive ? 1 : -1)
                                    ),
                                },
                            });
                            return next;
                        });
                        inFlightRef.current.delete(key);
                        return;
                    }

                    // ─────────────────────────────────────────
                    // 3b. SUCCESS → reconcile with server truth
                    //     Uses writeIfChanged → no re-render if equal
                    // ─────────────────────────────────────────
                    const row = Array.isArray(data) ? data[0] : data;
                    if (row) {
                        setState((prev) => {
                            const next = new Map(prev);
                            const cur = next.get(key) ?? EMPTY;
                            const merged: InteractionState = {
                                ...cur,
                                [flag]: row.active,
                                counts: {
                                    ...cur.counts,
                                    [kind]: Number(row.count),
                                },
                            };
                            // Skip the write if the server agrees with us
                            if (eq(cur, merged)) return prev;
                            next.set(key, merged);
                            return next;
                        });
                    }

                    inFlightRef.current.delete(key);
                }, 150)
            );
        },
        []
    );

    const hydrate = useCallback(
        async (episodeIds: string[], opts?: { force?: boolean }) => {
            if (!episodeIds || episodeIds.length === 0) return;

            const newIds = opts?.force
                ? episodeIds
                : episodeIds.filter((id) => !hydratedRef.current.has(id));
            if (newIds.length === 0) return;
            newIds.forEach((id) => hydratedRef.current.add(id));

            const {
                data: { user },
            } = await supabase.auth.getUser();

            const [statsRes, userRes] = await Promise.all([
                supabase
                    .from("podcast_episode_stats")
                    .select("episode_id,like_count,love_count,save_count,play_count")
                    .in("episode_id", newIds),

                user
                    ? supabase
                        .from("podcast_reactions")
                        .select("target_id,kind")
                        .eq("user_id", user.id)
                        .eq("target_type", "episode")
                        .in("target_id", newIds)
                    : Promise.resolve({ data: [] as any[] }),
            ]);

            // Fold raw reaction rows into per-episode flags
            const myFlags = new Map<
                string,
                { liked: boolean; loved: boolean; saved: boolean }
            >();
            for (const r of (userRes.data ?? []) as any[]) {
                const id = r.target_id as string;
                const cur = myFlags.get(id) ?? {
                    liked: false,
                    loved: false,
                    saved: false,
                };
                if (r.kind === "like") cur.liked = true;
                else if (r.kind === "love") cur.loved = true;
                else if (r.kind === "save") cur.saved = true;
                myFlags.set(id, cur);
            }

            // ✅ ONE batched setState. Return `prev` if nothing changed
            //    → zero re-renders when localStorage already matched the server.
            setState((prev) => {
                let mutated = false;
                const next = new Map(prev);

                for (const s of (statsRes.data ?? []) as any[]) {
                    const key = keyOf("episode", s.episode_id);

                    // Never clobber an in-flight optimistic update
                    if (inFlightRef.current.has(key)) continue;

                    const mine = myFlags.get(s.episode_id) ?? {
                        liked: false,
                        loved: false,
                        saved: false,
                    };

                    const server: InteractionState = {
                        liked: mine.liked,
                        loved: mine.loved,
                        saved: mine.saved,
                        counts: {
                            like: Number(s.like_count ?? 0),
                            love: Number(s.love_count ?? 0),
                            save: Number(s.save_count ?? 0),
                        },
                        playCount: Number(s.play_count ?? 0),
                    };

                    const cur = next.get(key);
                    if (cur && eq(cur, server)) continue; // ← no change, skip

                    next.set(key, server);
                    mutated = true;
                }

                // Episodes with reactions but no stats row yet
                for (const [id, mine] of myFlags) {
                    const key = keyOf("episode", id);
                    if (next.has(key)) continue;
                    if (inFlightRef.current.has(key)) continue;

                    next.set(key, {
                        liked: mine.liked,
                        loved: mine.loved,
                        saved: mine.saved,
                        counts: { like: 0, love: 0, save: 0 },
                        playCount: 0,
                    });
                    mutated = true;
                }

                return mutated ? next : prev;
            });
        },
        []
    );

    const get = useCallback(
        (targetType: TargetType, targetId: string) =>
            state.get(keyOf(targetType, targetId)) ?? EMPTY,
        [state]
    );

    return { toggle, hydrate, get };
}