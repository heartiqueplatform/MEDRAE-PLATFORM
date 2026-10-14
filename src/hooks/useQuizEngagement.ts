"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface QuizStats {
    startCount: number;
    completeCount: number;
    uniqueStudents: number;
    bookmarkCount: number;
    shareCount: number;
    ratingAvg: number;
    ratingCount: number;
    votesEasy: number;
    votesOk: number;
    votesHard: number;
    recentStarts24h: number;
}

export interface QuizUserState {
    bookmarked: boolean;
    rating: number | null;
    difficultyVote: "easy" | "ok" | "hard" | null;
    startedAt: string | null;
    completedAt: string | null;
}

const EMPTY_STATS: QuizStats = Object.freeze({
    startCount: 0, completeCount: 0, uniqueStudents: 0,
    bookmarkCount: 0, shareCount: 0,
    ratingAvg: 0, ratingCount: 0,
    votesEasy: 0, votesOk: 0, votesHard: 0,
    recentStarts24h: 0,
});

const EMPTY_STATE: QuizUserState = Object.freeze({
    bookmarked: false, rating: null, difficultyVote: null,
    startedAt: null, completedAt: null,
});

const sessionId =
    typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now());

// ── canonical equality checks ──
function eqStats(a: QuizStats, b: QuizStats): boolean {
    return (
        a.startCount === b.startCount &&
        a.completeCount === b.completeCount &&
        a.uniqueStudents === b.uniqueStudents &&
        a.bookmarkCount === b.bookmarkCount &&
        a.shareCount === b.shareCount &&
        a.ratingAvg === b.ratingAvg &&
        a.ratingCount === b.ratingCount &&
        a.votesEasy === b.votesEasy &&
        a.votesOk === b.votesOk &&
        a.votesHard === b.votesHard &&
        a.recentStarts24h === b.recentStarts24h
    );
}

function eqState(a: QuizUserState, b: QuizUserState): boolean {
    return (
        a.bookmarked === b.bookmarked &&
        a.rating === b.rating &&
        a.difficultyVote === b.difficultyVote &&
        a.startedAt === b.startedAt &&
        a.completedAt === b.completedAt
    );
}

export function useQuizEngagement() {
    const [stats, setStats] = useState<Map<string, QuizStats>>(new Map());
    const [userState, setUserState] = useState<Map<string, QuizUserState>>(new Map());
    const [version, setVersion] = useState(0);

    // ✅ Refs mirror state so get() can be identity-stable.
    const statsRef = useRef(stats);
    const stateRef = useRef(userState);

    const hydratedStatsRef = useRef<Set<string>>(new Set());
    const hydratedStateRef = useRef<Set<string>>(new Set());
    const inFlightStatsRef = useRef<Set<string>>(new Set());
    const inFlightStateRef = useRef<Set<string>>(new Set());

    // Sync refs + bump version only when state actually changed.
    useEffect(() => {
        statsRef.current = stats;
        stateRef.current = userState;
        setVersion((v) => v + 1);
    }, [stats, userState]);

    // ── write-if-changed helpers ──
    const writeStats = useCallback((id: string, next: QuizStats) => {
        setStats((prev) => {
            const cur = prev.get(id);
            if (cur && eqStats(cur, next)) return prev;   // no-op
            const map = new Map(prev);
            map.set(id, next);
            return map;
        });
    }, []);

    const writeState = useCallback((id: string, next: QuizUserState) => {
        setUserState((prev) => {
            const cur = prev.get(id);
            if (cur && eqState(cur, next)) return prev;   // no-op
            const map = new Map(prev);
            map.set(id, next);
            return map;
        });
    }, []);

    // ── hydrate stats (batched, skip in-flight) ──
    const hydrateStats = useCallback(async (quizIds: string[]) => {
        if (quizIds.length === 0) return;
        const newIds = quizIds.filter((id) => !hydratedStatsRef.current.has(id));
        if (newIds.length === 0) return;

        const { data, error } = await supabase
            .from("quiz_stats")
            .select("*")
            .in("quiz_id", newIds);

        if (error) {
            console.error("hydrateStats:", error);
            return;
        }

        newIds.forEach((id) => hydratedStatsRef.current.add(id));

        setStats((prev) => {
            let mutated = false;
            const next = new Map(prev);
            for (const s of (data ?? []) as any[]) {
                if (inFlightStatsRef.current.has(s.quiz_id)) continue;
                const server: QuizStats = {
                    startCount: Number(s.start_count ?? 0),
                    completeCount: Number(s.complete_count ?? 0),
                    uniqueStudents: Number(s.unique_students ?? 0),
                    bookmarkCount: Number(s.bookmark_count ?? 0),
                    shareCount: Number(s.share_count ?? 0),
                    ratingAvg: Number(s.rating_avg ?? 0),
                    ratingCount: Number(s.rating_count ?? 0),
                    votesEasy: Number(s.votes_easy ?? 0),
                    votesOk: Number(s.votes_ok ?? 0),
                    votesHard: Number(s.votes_hard ?? 0),
                    recentStarts24h: Number(s.recent_starts_24h ?? 0),
                };
                const cur = next.get(s.quiz_id);
                if (cur && eqStats(cur, server)) continue;
                next.set(s.quiz_id, server);
                mutated = true;
            }
            return mutated ? next : prev;
        });
    }, []);

    // ── hydrate user state (batched, skip in-flight) ──
    const hydrateUserState = useCallback(async (quizIds: string[]) => {
        if (quizIds.length === 0) return;
        const newIds = quizIds.filter((id) => !hydratedStateRef.current.has(id));
        if (newIds.length === 0) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from("quiz_user_state")
            .select("quiz_id,bookmarked,rating,difficulty_vote,started_at,completed_at")
            .eq("user_id", user.id)
            .in("quiz_id", newIds);

        if (error) {
            console.error("hydrateUserState:", error);
            return;
        }

        newIds.forEach((id) => hydratedStateRef.current.add(id));

        setUserState((prev) => {
            let mutated = false;
            const next = new Map(prev);
            for (const s of (data ?? []) as any[]) {
                if (inFlightStateRef.current.has(s.quiz_id)) continue;
                const server: QuizUserState = {
                    bookmarked: !!s.bookmarked,
                    rating: s.rating ?? null,
                    difficultyVote: s.difficulty_vote ?? null,
                    startedAt: s.started_at ?? null,
                    completedAt: s.completed_at ?? null,
                };
                const cur = next.get(s.quiz_id);
                if (cur && eqState(cur, server)) continue;
                next.set(s.quiz_id, server);
                mutated = true;
            }
            return mutated ? next : prev;
        });
    }, []);

    // ── actions (optimistic + in-flight guard) ──
    const reportStart = useCallback((quizId: string) => {
        setStats((prev) => {
            const cur = prev.get(quizId) ?? EMPTY_STATS;
            const next = new Map(prev);
            next.set(quizId, {
                ...cur,
                startCount: cur.startCount + 1,
                recentStarts24h: cur.recentStarts24h + 1,
            });
            return next;
        });
        inFlightStatsRef.current.add(quizId);
        void supabase.rpc("report_quiz_start", {
            p_quiz_id: quizId,
            p_session_id: sessionId,
        }).then(({ error }) => {
            if (error) console.error("report_quiz_start:", error);
            inFlightStatsRef.current.delete(quizId);
        });
    }, []);

    const reportComplete = useCallback((quizId: string) => {
        setStats((prev) => {
            const cur = prev.get(quizId) ?? EMPTY_STATS;
            const next = new Map(prev);
            next.set(quizId, { ...cur, completeCount: cur.completeCount + 1 });
            return next;
        });
        setUserState((prev) => {
            const cur = prev.get(quizId) ?? EMPTY_STATE;
            const next = new Map(prev);
            next.set(quizId, { ...cur, completedAt: new Date().toISOString() });
            return next;
        });
        inFlightStatsRef.current.add(quizId);
        inFlightStateRef.current.add(quizId);
        void supabase.rpc("report_quiz_complete", { p_quiz_id: quizId }).then(() => {
            inFlightStatsRef.current.delete(quizId);
            inFlightStateRef.current.delete(quizId);
        });
    }, []);

    const rateQuiz = useCallback((quizId: string, rating: number) => {
        const clearing = rating === 0;

        setUserState((prev) => {
            const cur = prev.get(quizId) ?? EMPTY_STATE;
            const next = new Map(prev);
            next.set(quizId, { ...cur, rating: clearing ? null : rating });
            return next;
        });

        inFlightStateRef.current.add(quizId);
        inFlightStatsRef.current.add(quizId);

        void supabase.rpc("rate_quiz", {
            p_quiz_id: quizId,
            p_rating: clearing ? 0 : rating,
        }).then(({ data, error }) => {
            if (error) { console.error("rate_quiz:", error); inFlightStateRef.current.delete(quizId); inFlightStatsRef.current.delete(quizId); return; }
            const row = Array.isArray(data) ? data[0] : data;
            if (row) {
                setStats((prev) => {
                    const cur = prev.get(quizId) ?? EMPTY_STATS;
                    const server: QuizStats = {
                        ...cur,
                        ratingAvg: Number(row.rating_avg ?? 0),
                        ratingCount: Number(row.rating_count ?? 0),
                    };
                    if (eqStats(cur, server)) return prev;
                    const next = new Map(prev);
                    next.set(quizId, server);
                    return next;
                });
            }
            inFlightStateRef.current.delete(quizId);
            inFlightStatsRef.current.delete(quizId);
        });
    }, []);

    const toggleBookmark = useCallback((quizId: string) => {
        // Capture the current bookmarked value BEFORE mutating.
        const wasBookmarked = stateRef.current.get(quizId)?.bookmarked ?? false;

        setUserState((prev) => {
            const cur = prev.get(quizId) ?? EMPTY_STATE;
            const next = new Map(prev);
            next.set(quizId, { ...cur, bookmarked: !cur.bookmarked });
            return next;
        });
        setStats((prev) => {
            const cur = prev.get(quizId) ?? EMPTY_STATS;
            const next = new Map(prev);
            next.set(quizId, {
                ...cur,
                bookmarkCount: Math.max(0, cur.bookmarkCount + (wasBookmarked ? -1 : 1)),
            });
            return next;
        });

        inFlightStateRef.current.add(quizId);
        inFlightStatsRef.current.add(quizId);

        void supabase.rpc("toggle_quiz_bookmark", { p_quiz_id: quizId })
            .then(({ data, error }) => {
                if (error) { console.error("toggle_bookmark:", error); inFlightStateRef.current.delete(quizId); inFlightStatsRef.current.delete(quizId); return; }
                const row = Array.isArray(data) ? data[0] : data;
                if (!row) { inFlightStateRef.current.delete(quizId); inFlightStatsRef.current.delete(quizId); return; }

                writeState(quizId, {
                    ...(stateRef.current.get(quizId) ?? EMPTY_STATE),
                    bookmarked: !!row.bookmarked,
                });
                writeStats(quizId, {
                    ...(statsRef.current.get(quizId) ?? EMPTY_STATS),
                    bookmarkCount: Number(row.bookmark_count ?? 0),
                });

                inFlightStateRef.current.delete(quizId);
                inFlightStatsRef.current.delete(quizId);
            });
    }, [writeState, writeStats]);

    const reportShare = useCallback((quizId: string) => {
        setStats((prev) => {
            const cur = prev.get(quizId) ?? EMPTY_STATS;
            const next = new Map(prev);
            next.set(quizId, { ...cur, shareCount: cur.shareCount + 1 });
            return next;
        });
        inFlightStatsRef.current.add(quizId);
        void supabase.rpc("report_quiz_share", { p_quiz_id: quizId }).then(() => {
            inFlightStatsRef.current.delete(quizId);
        });
    }, []);

    const voteDifficulty = useCallback((quizId: string, vote: "easy" | "ok" | "hard") => {
        setUserState((prev) => {
            const cur = prev.get(quizId) ?? EMPTY_STATE;
            const next = new Map(prev);
            next.set(quizId, { ...cur, difficultyVote: vote });
            return next;
        });
        inFlightStateRef.current.add(quizId);
        void supabase.rpc("vote_quiz_difficulty", {
            p_quiz_id: quizId, p_vote: vote,
        }).then(({ error }) => {
            if (error) console.error("vote_difficulty:", error);
            inFlightStateRef.current.delete(quizId);
        });
    }, []);

    // ✅ Stable getters — read from ref, identity never changes
    const getStats = useCallback(
        (quizId: string) => statsRef.current.get(quizId) ?? EMPTY_STATS,
        []
    );

    const getUserState = useCallback(
        (quizId: string) => stateRef.current.get(quizId) ?? EMPTY_STATE,
        []
    );

    return {
        version,                 // ✅ NEW — feed into consumer memo deps
        hydrateStats, hydrateUserState,
        reportStart, reportComplete, rateQuiz, toggleBookmark, reportShare, voteDifficulty,
        getStats, getUserState,
    };
}