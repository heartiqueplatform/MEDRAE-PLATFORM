"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
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
    const [shows, setShows] = useState<PodcastShow[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async (opts?: { silent?: boolean }) => {
        const silent = opts?.silent ?? false;
        if (!silent) setLoading(true);

        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id ?? null;
        const { data: showRows, error: showErr } = await supabase
            .from("podcast_shows")
            .select(`
        id, apple_id, title, author, artwork_url, description, explicit, is_active,
        podcast_episodes!left ( id, is_hidden )
    `)
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (showErr) {
            console.error("load shows:", showErr);
            if (!silent) setLoading(false);
            return;
        }

        // Count unhidden episodes per show from the nested rows
        const epCount = new Map<string, number>();
        (showRows ?? []).forEach((s: any) => {
            const eps = (s.podcast_episodes ?? []) as { is_hidden: boolean }[];
            epCount.set(s.id, eps.filter((e) => !e.is_hidden).length);
        });

        const { data: endRows } = await supabase
            .from("podcast_endorsements")
            .select("show_id, user_id");

        const endCount = new Map<string, number>();
        const myEndorsements = new Set<string>();
        (endRows ?? []).forEach((r: any) => {
            endCount.set(r.show_id, (endCount.get(r.show_id) ?? 0) + 1);
            if (userId && r.user_id === userId) myEndorsements.add(r.show_id);
        });

        const merged: PodcastShow[] = (showRows ?? []).map((s: any) => ({
            id: s.id,
            apple_id: s.apple_id,
            title: s.title,
            author: s.author,
            artwork_url: s.artwork_url,
            description: s.description,
            explicit: s.explicit,
            episode_count: epCount.get(s.id) ?? 0,   // ✅ now accurate
            endorsement_count: endCount.get(s.id) ?? 0,
            user_endorsed: myEndorsements.has(s.id),
        }));
        // Persist to Dexie
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
        setLoading(false);
    }, []);

    // Hydrate from Dexie first
    useEffect(() => {
        (async () => {
            const cached = await getAllShows();
            if (cached.length > 0) {
                setShows(cached.map(dbToShow));
                setLoading(false);
            }
            refresh({ silent: true });
        })();
    }, [refresh]);

    // ── OPTIMISTIC endorse ──
    const toggleEndorse = useCallback(
        async (showId: string) => {
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData?.user?.id;
            if (!userId) return;

            const target = shows.find((s) => s.id === showId);
            if (!target) return;

            const wasEndorsed = target.user_endorsed;

            setShows((prev) =>
                prev.map((s) =>
                    s.id === showId
                        ? {
                            ...s,
                            user_endorsed: !wasEndorsed,
                            endorsement_count: Math.max(0, s.endorsement_count + (wasEndorsed ? -1 : 1)),
                        }
                        : s
                )
            );

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
                setShows((prev) =>
                    prev.map((s) =>
                        s.id === showId
                            ? {
                                ...s,
                                user_endorsed: wasEndorsed,
                                endorsement_count: Math.max(0, s.endorsement_count + (wasEndorsed ? 1 : -1)),
                            }
                            : s
                    )
                );
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
            // Also clear from Dexie
            await studifyDb.shows.delete(showId);
            await refresh({ silent: true });
            return true;
        },
        [refresh]
    );

    return { shows, loading, refresh, toggleEndorse, deleteShow };
}