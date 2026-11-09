"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, isReallyOnline } from "@/lib/supabaseClient";
import {
    getAllShows,
    putShows,
    type DbShow,
} from "@/lib/studifyDb";
import { studifyDb } from "@/lib/studifyDb";

export interface PodcastShow {
    id: string;
    apple_id: string;
    title: string;
    author: string | null;
    artwork_url: string | null;
    description: string | null;
    explicit: boolean;
    episode_count: number;
    endorsement_count: number;
    user_endorsed: boolean;
}

const CACHE_TTL_MS = 1000 * 60 * 15;

// ─────────────────────────────────────────────────────────────
// ✅ localStorage cache — survives reload, paints instantly,
//    kills the 2-network-query lag on every /listen open.
// ─────────────────────────────────────────────────────────────
const LS_CACHE_KEY = "medrae:podcast_shows:v1";
const LS_TTL_MS = 15 * 60 * 1000; // 15 min

function readLsCache(): PodcastShow[] | null {
    try {
        const raw = localStorage.getItem(LS_CACHE_KEY);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (!Array.isArray(data) || data.length === 0) return null;
        // Offline → trust stale cache. Better than blank.
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            return data as PodcastShow[];
        }
        if (Date.now() - ts < LS_TTL_MS) return data as PodcastShow[];
        return null;
    } catch {
        return null;
    }
}

function writeLsCache(data: PodcastShow[]) {
    try {
        localStorage.setItem(
            LS_CACHE_KEY,
            JSON.stringify({ data, ts: Date.now() })
        );
    } catch {
        // Quota — ignore, memory cache still works
    }
}

function sortShows(list: PodcastShow[]): PodcastShow[] {
    return [...list].sort((a, b) => {
        const t = a.title.localeCompare(b.title);
        return t !== 0 ? t : a.id.localeCompare(b.id);
    });
}

function dbToShow(s: DbShow): PodcastShow {
    return {
        id: s.id,
        apple_id: s.appleId,
        title: s.title,
        author: s.author ?? null,
        artwork_url: s.artwork ?? null,
        description: s.description ?? null,
        explicit: false,
        episode_count: s.episodeCount,
        endorsement_count: s.endorsementCount,
        user_endorsed: false,
    };
}

export function usePodcastShows() {
    // ✅ Paint from localStorage SYNCHRONOUSLY on first render
    const [shows, setShows] = useState<PodcastShow[]>(() => {
        const cached = readLsCache();
        return cached ? sortShows(cached) : [];
    });
    const [loading, setLoading] = useState(() => {
        const cached = readLsCache();
        return !cached || cached.length === 0;
    });

    const refresh = useCallback(async (opts?: { silent?: boolean }) => {
        const silent = opts?.silent ?? false;

        // ✅ Only show skeleton if we truly have nothing to render.
        const showedSkeleton = !silent && shows.length === 0;
        if (showedSkeleton) setLoading(true);

        try {
            const online = await isReallyOnline();
            if (!online) {
                // Offline → keep whatever localStorage / Dexie has.
                return;
            }

            const { data: sessionData } = await supabase.auth.getSession();
            const userId =
                sessionData?.session?.user?.id ??
                (await supabase.auth.getUser()).data?.user?.id ??
                null;

            const { data: showRows, error: showErr } = await supabase
                .from("podcast_shows")
                .select(`
                    id, apple_id, title, author, artwork_url, description, explicit, is_active,
                    podcast_episodes!left ( id, is_hidden )
                `)
                .eq("is_active", true)
                .order("title", { ascending: true })
                .order("id", { ascending: true });

            if (showErr) {
                console.error("load shows:", showErr);
                return;
            }

            const epCount = new Map<string, number>();
            (showRows ?? []).forEach((s: any) => {
                const eps = (s.podcast_episodes ?? []) as { is_hidden: boolean }[];
                epCount.set(s.id, eps.filter((e) => !e.is_hidden).length);
            });

            const { data: endRows } = await supabase
                .from("podcast_endorsements")
                .select("show_id, user_id")
                .order("show_id", { ascending: true })
                .order("user_id", { ascending: true });

            const endCount = new Map<string, number>();
            const myEndorsements = new Set<string>();
            (endRows ?? []).forEach((r: any) => {
                endCount.set(r.show_id, (endCount.get(r.show_id) ?? 0) + 1);
                if (userId && r.user_id === userId) myEndorsements.add(r.show_id);
            });

            const merged: PodcastShow[] = sortShows(
                (showRows ?? []).map((s: any) => ({
                    id: s.id,
                    apple_id: s.apple_id,
                    title: s.title,
                    author: s.author,
                    artwork_url: s.artwork_url,
                    description: s.description,
                    explicit: s.explicit,
                    episode_count: epCount.get(s.id) ?? 0,
                    endorsement_count: endCount.get(s.id) ?? 0,
                    user_endorsed: myEndorsements.has(s.id),
                }))
            );

            await putShows(
                merged.map((s): DbShow => ({
                    id: s.id,
                    appleId: s.apple_id,
                    title: s.title,
                    author: s.author ?? undefined,
                    artwork: s.artwork_url ?? undefined,
                    description: s.description ?? undefined,
                    episodeCount: s.episode_count,
                    endorsementCount: s.endorsement_count,
                    cachedAt: Date.now(),
                }))
            );

            setShows(merged);
            writeLsCache(merged); // ✅ persist for instant next mount
        } catch (err) {
            console.error("refresh shows threw:", err);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shows.length]);

    useEffect(() => {
        (async () => {
            // If localStorage already painted, skip the Dexie round-trip
            const lsCached = readLsCache();
            if (!lsCached || lsCached.length === 0) {
                const dexieCached = await getAllShows();
                if (dexieCached.length > 0) {
                    setShows(sortShows(dexieCached.map(dbToShow)));
                    setLoading(false);
                }
            }
            // Always refresh in background (silent if we already have data)
            refresh({ silent: (lsCached?.length ?? 0) > 0 || shows.length > 0 });
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refresh]);

    useEffect(() => {
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
            if (
                event === "SIGNED_IN" ||
                event === "SIGNED_OUT" ||
                event === "TOKEN_REFRESHED" ||
                event === "INITIAL_SESSION"
            ) {
                refresh({ silent: true });
            }
        });
        return () => sub.subscription.unsubscribe();
    }, [refresh]);

    const toggleEndorse = useCallback(
        async (showId: string) => {
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData?.user?.id;
            if (!userId) return;

            const target = shows.find((s) => s.id === showId);
            if (!target) return;

            const wasEndorsed = target.user_endorsed;

            setShows((prev) => {
                const next = prev.map((s) =>
                    s.id === showId
                        ? {
                            ...s,
                            user_endorsed: !wasEndorsed,
                            endorsement_count: Math.max(0, s.endorsement_count + (wasEndorsed ? -1 : 1)),
                        }
                        : s
                );
                writeLsCache(next);
                return next;
            });

            try {
                if (wasEndorsed) {
                    const { error } = await supabase
                        .from("podcast_endorsements")
                        .delete()
                        .eq("show_id", showId)
                        .eq("user_id", userId);
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from("podcast_endorsements")
                        .insert({ show_id: showId, user_id: userId });
                    if (error) throw error;
                }
            } catch (e) {
                console.error("endorse failed:", e);
                setShows((prev) => {
                    const next = prev.map((s) =>
                        s.id === showId
                            ? {
                                ...s,
                                user_endorsed: wasEndorsed,
                                endorsement_count: Math.max(0, s.endorsement_count + (wasEndorsed ? 1 : -1)),
                            }
                            : s
                    );
                    writeLsCache(next);
                    return next;
                });
            }
        },
        [shows]
    );

    const deleteShow = useCallback(
        async (showId: string) => {
            const { error } = await supabase
                .from("podcast_shows")
                .delete()
                .eq("id", showId);
            if (error) {
                console.error("delete show:", error);
                return false;
            }
            await studifyDb.shows.delete(showId);
            await refresh({ silent: true });
            return true;
        },
        [refresh]
    );

    return { shows, loading, refresh, toggleEndorse, deleteShow };
}