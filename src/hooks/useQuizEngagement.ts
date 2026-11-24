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

// ── NEW — reactions ─────────────────────────────────────────
export type ReactionType = "like" | "fire" | "love";

export interface QuizReactions {
    likeCount: number;
    fireCount: number;
    loveCount: number;
    myReaction: ReactionType | null;
}

const EMPTY_REACTIONS: QuizReactions = Object.freeze({
    likeCount: 0,
    fireCount: 0,
    loveCount: 0,
    myReaction: null,
});
// ────────────────────────────────────────────────────────────

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

function eqReactions(a: QuizReactions, b: QuizReactions): boolean {
    return (
        a.likeCount === b.likeCount &&
        a.fireCount === b.fireCount &&
        a.loveCount === b.loveCount &&
        a.myReaction === b.myReaction
    );
}

export function useQuizEngagement() {
    const [stats, setStats] = useState<Map<string, QuizStats>>(new Map());
    const [userState, setUserState] = useState<Map<string, QuizUserState>>(new Map());
    const [reactions, setReactions] = useState<Map<string, QuizReactions>>(new Map());
    const [version, setVersion] = useState(0);

    // ✅ Refs mirror state so get() can be identity-stable.
    const statsRef = useRef(stats);
    const stateRef = useRef(userState);
    const reactionsRef = useRef(reactions);

    const hydratedStatsRef = useRef<Set<string>>(new Set());
    const hydratedStateRef = useRef<Set<string>>(new Set());
    const hydratedReactionsRef = useRef<Set<string>>(new Set());

    const inFlightStatsRef = useRef<Set<string>>(new Set());
    const inFlightStateRef = useRef<Set<string>>(new Set());
    const inFlightReactionsRef = useRef<Set<string>>(new Set());

    // Sync refs + bump version only when state actually changed.
    useEffect(() => {
        statsRef.current = stats;
        stateRef.current = userState;
        reactionsRef.current = reactions;
        setVersion((v) => v + 1);
    }, [stats, userState, reactions]);

    // ── write-if-changed helpers ──
    const writeStats = useCallback((id: string, next: QuizStats) => {
        setStats((prev) => {
            const cur = prev.get(id);
            if (cur && eqStats(cur, next)) return prev;
            const map = new Map(prev);
            map.set(id, next);
            return map;
        });
    }, []);

    const writeState = useCallback((id: string, next: QuizUserState) => {
        setUserState((prev) => {
            const cur = prev.get(id);
            if (cur && eqState(cur, next)) return prev;
            const map = new Map(prev);
            map.set(id, next);
            return map;
        });
    }, []);

    const writeReactions = useCallback((id: string, next: QuizReactions) => {
        setReactions((prev) => {
            const cur = prev.get(id);
            if (cur && eqReactions(cur, next)) return prev;
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

    // ── hydrate reactions (batched, skip in-flight) ──
    const hydrateReactions = useCallback(async (quizIds: string[]) => {
        if (quizIds.length === 0) return;
        const newIds = quizIds.filter((id) => !hydratedReactionsRef.current.has(id));
        if (newIds.length === 0) return;

        // Fetch aggregates in parallel — one RPC per quiz. Table is tiny;
        // 20 concurrent RPC calls is fine. Skip in-flight (user may be
        // reacting while this resolves).
        const results = await Promise.all(
            newIds.map(async (id) => {
                const { data, error } = await supabase.rpc("get_quiz_reactions", {
                    p_quiz_id: id,
                });
                if (error) {
                    console.error("hydrateReactions:", error);
                    return null;
                }
                const row = Array.isArray(data) ? data[0] : data;
                return { id, row };
            })
        );

        newIds.forEach((id) => hydratedReactionsRef.current.add(id));

        setReactions((prev) => {
            let mutated = false;
            const next = new Map(prev);
            for (const r of results) {
                if (!r || !r.row) continue;
                if (inFlightReactionsRef.current.has(r.id)) continue;
                const server: QuizReactions = {
                    likeCount: Number(r.row.like_count ?? 0),
                    fireCount: Number(r.row.fire_count ?? 0),
                    loveCount: Number(r.row.love_count ?? 0),
                    myReaction: (r.row.my_reaction as ReactionType) ?? null,
                };
                const cur = next.get(r.id);
                if (cur && eqReactions(cur, server)) continue;
                next.set(r.id, server);
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

    // ── NEW — toggle reaction (optimistic + rollback) ──
    const toggleReaction = useCallback(
        async (quizId: string, reaction: ReactionType): Promise<void> => {
            const prev = reactionsRef.current.get(quizId) ?? EMPTY_REACTIONS;
            const isSame = prev.myReaction === reaction;

            // Optimistic: remove if same, else replace
            const optimistic: QuizReactions = {
                likeCount:
                    (prev.myReaction === "like" ? Math.max(0, prev.likeCount - 1) : prev.likeCount) +
                    (!isSame && reaction === "like" ? 1 : 0),
                fireCount:
                    (prev.myReaction === "fire" ? Math.max(0, prev.fireCount - 1) : prev.fireCount) +
                    (!isSame && reaction === "fire" ? 1 : 0),
                loveCount:
                    (prev.myReaction === "love" ? Math.max(0, prev.loveCount - 1) : prev.loveCount) +
                    (!isSame && reaction === "love" ? 1 : 0),
                myReaction: isSame ? null : reaction,
            };

            setReactions((m) => {
                const next = new Map(m);
                next.set(quizId, optimistic);
                return next;
            });

            inFlightReactionsRef.current.add(quizId);

            const { data, error } = await supabase.rpc("toggle_quiz_reaction", {
                p_quiz_id: quizId,
                p_reaction: reaction,
            });

            if (error) {
                console.error("toggle_quiz_reaction:", error);
                // Rollback to previous state
                setReactions((m) => {
                    const next = new Map(m);
                    next.set(quizId, prev);
                    return next;
                });
                inFlightReactionsRef.current.delete(quizId);
                return;
            }

            const row = Array.isArray(data) ? data[0] : data;
            if (row) {
                const server: QuizReactions = {
                    likeCount: Number(row.like_count ?? 0),
                    fireCount: Number(row.fire_count ?? 0),
                    loveCount: Number(row.love_count ?? 0),
                    myReaction: (row.my_reaction as ReactionType) ?? null,
                };
                writeReactions(quizId, server);
            }
            inFlightReactionsRef.current.delete(quizId);
        },
        [writeReactions]
    );

    // ✅ Stable getters — read from ref, identity never changes
    const getStats = useCallback(
        (quizId: string) => statsRef.current.get(quizId) ?? EMPTY_STATS,
        []
    );

    const getUserState = useCallback(
        (quizId: string) => stateRef.current.get(quizId) ?? EMPTY_STATE,
        []
    );

    const getReactions = useCallback(
        (quizId: string) => reactionsRef.current.get(quizId) ?? EMPTY_REACTIONS,
        []
    );

    return {
        version,
        hydrateStats, hydrateUserState, hydrateReactions,
        reportStart, reportComplete, rateQuiz, toggleBookmark, reportShare, voteDifficulty,
        toggleReaction,
        getStats, getUserState, getReactions,
    };
}