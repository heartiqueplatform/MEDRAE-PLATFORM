// src/hooks/useWeeklyStudyActivity.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";
import { useFollowingList } from "@/hooks/useFollowingList";

export interface WeeklyActivityRow {
    user_id: string;
    name: string;
    username: string | null;
    avatar_url: string | null;
    quiz_count: number;
    avg_score_pct: number;
    last_submitted_at: string;
}

const CACHE_PREFIX = "medrae:weekly_activity:";
const TTL_MS = 5 * 60 * 1000; // 5 min — activity changes fast
const LOOKBACK_DAYS = 7;

function cacheKey(userId: string) {
    // Date-stamp the key so it invalidates across day boundaries
    const day = new Date().toISOString().slice(0, 10);
    return `${CACHE_PREFIX}${userId}:${day}`;
}

function readCache(userId: string): WeeklyActivityRow[] | null {
    try {
        const raw = localStorage.getItem(cacheKey(userId));
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw) as { data: WeeklyActivityRow[]; ts: number };
        if (typeof navigator !== "undefined" && navigator.onLine === false) return data;
        if (Date.now() - ts < TTL_MS) return data;
        return null;
    } catch {
        return null;
    }
}

function writeCache(userId: string, data: WeeklyActivityRow[]) {
    try {
        localStorage.setItem(cacheKey(userId), JSON.stringify({ data, ts: Date.now() }));
    } catch {
        // quota
    }
}

export function useWeeklyStudyActivity() {
    const { user } = useAuth();
    const userId = user?.id ?? null;
    const { following, loading: followingLoading } = useFollowingList();

    const [rows, setRows] = useState<WeeklyActivityRow[]>(() => {
        if (!userId) return [];
        return readCache(userId) ?? [];
    });
    const [loading, setLoading] = useState<boolean>(() => {
        if (!userId) return false;
        return readCache(userId) === null;
    });

    const inFlightRef = useRef(false);

    const fetchFresh = useCallback(async () => {
        if (!userId || inFlightRef.current) return;
        if (followingLoading) return;
        if (following.size === 0) {
            setRows([]);
            setLoading(false);
            writeCache(userId, []);
            return;
        }
        if (typeof navigator !== "undefined" && navigator.onLine === false) return;

        inFlightRef.current = true;
        try {
            const since = new Date(
                Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000
            ).toISOString();

            // 1) quiz_results for followed users in window
            const { data: results, error } = await supabase
                .from("quiz_results")
                .select("user_id, score, total_questions, submitted_at")
                .in("user_id", Array.from(following))
                .gte("submitted_at", since);

            if (error) throw error;

            // 2) aggregate per user
            const agg = new Map<
                string,
                { count: number; pctSum: number; pctDen: number; last: string }
            >();
            for (const r of results ?? []) {
                const total = Number(r.total_questions) || 0;
                const score = Number(r.score) || 0;
                if (total <= 0) continue;
                const pct = (score / total) * 100;
                const cur = agg.get(r.user_id) ?? { count: 0, pctSum: 0, pctDen: 0, last: "" };
                cur.count += 1;
                cur.pctSum += pct;
                cur.pctDen += 1;
                if (!cur.last || r.submitted_at > cur.last) cur.last = r.submitted_at;
                agg.set(r.user_id, cur);
            }

            const userIds = Array.from(agg.keys());
            if (userIds.length === 0) {
                setRows([]);
                writeCache(userId, []);
                return;
            }

            // 3) profile details for those users
            const { data: profiles, error: profErr } = await supabase
                .from("profiles")
                .select("user_id, name, username, avatar_url")
                .in("user_id", userIds);
            if (profErr) throw profErr;

            const profileMap = new Map(
                (profiles ?? []).map((p: any) => [p.user_id, p])
            );

            const out: WeeklyActivityRow[] = userIds
                .map((uid) => {
                    const a = agg.get(uid)!;
                    const p = profileMap.get(uid);
                    return {
                        user_id: uid,
                        name: p?.name ?? "Student",
                        username: p?.username ?? null,
                        avatar_url: p?.avatar_url ?? null,
                        quiz_count: a.count,
                        avg_score_pct: Math.round(a.pctSum / a.pctDen),
                        last_submitted_at: a.last,
                    };
                })
                // 4) most recent activity first
                .sort((a, b) => (a.last_submitted_at < b.last_submitted_at ? 1 : -1))
                // 5) max 5 rows
                .slice(0, 5);

            setRows(out);
            writeCache(userId, out);
        } catch (err) {
            console.warn("[useWeeklyStudyActivity] fetch failed:", err);
        } finally {
            inFlightRef.current = false;
            setLoading(false);
        }
    }, [userId, following, followingLoading]);

    // Initial + whenever the followed set changes (follow/unfollow triggers refetch)
    useEffect(() => {
        if (!userId) return;
        const cached = readCache(userId);
        if (cached) {
            setRows(cached);
            setLoading(false);
        }
        fetchFresh();
    }, [userId, fetchFresh]);

    // Cross-tab sync
    useEffect(() => {
        if (!userId) return;
        const key = cacheKey(userId);
        const handler = (e: StorageEvent) => {
            if (e.key !== key) return;
            const cached = readCache(userId);
            if (cached) setRows(cached);
        };
        window.addEventListener("storage", handler);
        return () => window.removeEventListener("storage", handler);
    }, [userId]);

    return { rows, loading, refresh: fetchFresh };
}