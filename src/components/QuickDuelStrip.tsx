import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    Swords,
    Trophy,
    Flame,
    ChevronRight,
    Star,
    StarOff,
    RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type Duel = {
    id: string;
    opponent_id: string;
    opponent_name: string;
    opponent_avatar: string | null;
    my_score: number;
    opp_score: number;
    won: boolean;
    completed_at: string;
};

type Player = {
    user_id: string;
    name: string;
    username: string;
    avatar_url: string | null;
    is_online: boolean;
    is_pinned: boolean;
    pinned_at?: number;
};

type Props = {
    userId: string;
    initialHistory?: Duel[];
    initialPlayers?: Player[];
};

/* ------------------------------------------------------------------ */
/*  Cache                                                             */
/* ------------------------------------------------------------------ */

const HISTORY_KEY = "quick_duel_history_v2";
const PLAYERS_KEY = "quick_duel_players_v2";
const CACHE_TTL = 10 * 60 * 1000;

function readCache<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.t > CACHE_TTL) return null;
        return parsed.d as T;
    } catch {
        return null;
    }
}

function writeCache<T>(key: string, data: T) {
    try {
        localStorage.setItem(key, JSON.stringify({ d: data, t: Date.now() }));
    } catch {
        /* silent */
    }
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

function QuickDuelStripBase({
    userId,
    initialHistory,
    initialPlayers,
}: Props) {
    const navigate = useNavigate();

    const cachedHistory = useMemo(() => readCache<Duel[]>(HISTORY_KEY), []);
    const cachedPlayers = useMemo(() => readCache<Player[]>(PLAYERS_KEY), []);

    const [history, setHistory] = useState<Duel[]>(
        initialHistory ?? cachedHistory ?? []
    );
    const [players, setPlayers] = useState<Player[]>(
        initialPlayers ?? cachedPlayers ?? []
    );
    const [loading, setLoading] = useState(
        (initialHistory ?? cachedHistory ?? []).length === 0 &&
        (initialPlayers ?? cachedPlayers ?? []).length === 0
    );
    const [refreshing, setRefreshing] = useState(false);

    const fetchedRef = useRef(false);

    /* -------------------------------------------------------------- */
    /*  Fetch                                                         */
    /* -------------------------------------------------------------- */
    const fetchData = useCallback(
        async (force = false) => {
            if (!userId) return;
            if (!force && fetchedRef.current) return;
            fetchedRef.current = true;

            try {
                const [duelsRes, playersRes] = await Promise.all([
                    /* Last 5 completed battles */
                    supabase
                        .from("challenges")
                        .select(
                            `id, from_user_id, to_user_id, score_to_beat, opponent_score,
               winner_id, completed_at,
               from_user:from_user_id(user_id, name, avatar_url),
               to_user:to_user_id(user_id, name, avatar_url)`
                        )
                        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
                        .eq("status", "completed")
                        .order("completed_at", { ascending: false })
                        .limit(5),

                    /* All available players */
                    supabase
                        .from("profiles")
                        .select("user_id, name, username, avatar_url, is_online")
                        .neq("user_id", userId)
                        .order("name", { ascending: true })
                        .limit(200),
                ]);

                /* ---- shape history ---- */
                const duels: Duel[] = (duelsRes.data ?? []).map((c: any) => {
                    const iAmFrom = c.from_user_id === userId;
                    const my = iAmFrom ? c.score_to_beat : c.opponent_score;
                    const opp = iAmFrom ? c.opponent_score : c.score_to_beat;
                    const oppUser = iAmFrom ? c.to_user : c.from_user;
                    return {
                        id: c.id,
                        opponent_id: oppUser?.user_id ?? "",
                        opponent_name: oppUser?.name?.split(" ")[0] ?? "Peer",
                        opponent_avatar: oppUser?.avatar_url ?? null,
                        my_score: my ?? 0,
                        opp_score: opp ?? 0,
                        won: c.winner_id === userId,
                        completed_at: c.completed_at,
                    };
                });

                /* ---- merge pin state from previous cache ---- */
                const prevPlayers = players.length ? players : cachedPlayers ?? [];
                const pinMap = new Map<string, { is_pinned: boolean; pinned_at?: number }>();
                prevPlayers.forEach((p) => {
                    if (p.is_pinned) {
                        pinMap.set(p.user_id, { is_pinned: true, pinned_at: p.pinned_at });
                    }
                });

                const mergedPlayers: Player[] = (playersRes.data ?? []).map((p: any) => {
                    const pin = pinMap.get(p.user_id);
                    return {
                        user_id: p.user_id,
                        name: p.name || "Unknown",
                        username: p.username || "nurse",
                        avatar_url: p.avatar_url ?? null,
                        is_online: !!p.is_online,
                        is_pinned: !!pin?.is_pinned,
                        pinned_at: pin?.pinned_at,
                    };
                });

                setHistory(duels);
                setPlayers(mergedPlayers);
                writeCache(HISTORY_KEY, duels);
                writeCache(PLAYERS_KEY, mergedPlayers);
            } catch {
                /* silent */
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [userId, players, cachedPlayers]
    );

    useEffect(() => {
        const ric: any = (window as any).requestIdleCallback;
        const id = ric
            ? ric(() => fetchData(false), { timeout: 2000 })
            : setTimeout(() => fetchData(false), 800);
        return () => {
            if ((window as any).cancelIdleCallback) {
                (window as any).cancelIdleCallback(id);
            } else {
                clearTimeout(id);
            }
        };
    }, [fetchData]);

    /* -------------------------------------------------------------- */
    /*  Pin toggle                                                    */
    /* -------------------------------------------------------------- */
    const togglePin = useCallback(
        (playerId: string) => {
            if (navigator.vibrate) navigator.vibrate(15);
            setPlayers((prev) => {
                const next = prev.map((p) =>
                    p.user_id === playerId
                        ? {
                            ...p,
                            is_pinned: !p.is_pinned,
                            pinned_at: !p.is_pinned ? Date.now() : undefined,
                        }
                        : p
                );
                writeCache(PLAYERS_KEY, next);
                return next;
            });
        },
        []
    );

    /* -------------------------------------------------------------- */
    /*  Sorted players: pinned first, then online, then alphabetical  */
    /* -------------------------------------------------------------- */
    const sortedPlayers = useMemo(() => {
        return [...players].sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            if (a.is_pinned && b.is_pinned) {
                return (b.pinned_at ?? 0) - (a.pinned_at ?? 0);
            }
            if (a.is_online && !b.is_online) return -1;
            if (!a.is_online && b.is_online) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [players]);

    /* -------------------------------------------------------------- */
    /*  Handlers                                                      */
    /* -------------------------------------------------------------- */
    const goArena = useCallback(() => {
        if (navigator.vibrate) navigator.vibrate(10);
        navigate("/challenge");
    }, [navigate]);

    const challengeOpponent = useCallback(
        (opponentId: string) => {
            if (!opponentId) return;
            if (navigator.vibrate) navigator.vibrate(15);
            navigate(`/challenge?duel=${opponentId}`);
        },
        [navigate]
    );

    const handleRefresh = useCallback(() => {
        if (refreshing) return;
        if (navigator.vibrate) navigator.vibrate(20);
        setRefreshing(true);
        fetchData(true);
    }, [refreshing, fetchData]);

    const lastDuel = history[0];

    /* -------------------------------------------------------------- */
    /*  Skeleton                                                      */
    /* -------------------------------------------------------------- */
    if (loading && !lastDuel && sortedPlayers.length === 0) {
        return <StripSkeleton />;
    }

    /* -------------------------------------------------------------- */
    /*  Render                                                        */
    /* -------------------------------------------------------------- */
    return (
        <section
            className="w-full bg-white/70 dark:bg-muted/30 backdrop-blur-xl rounded-2xl p-5 space-y-5 font-sans"
            style={{ contain: "layout paint" }}
        >

            {/* ---------- Last battle card ---------- */}
            {lastDuel && (
                <div
                    className={`flex items-center gap-3 p-3 rounded-2xl ${lastDuel.won ? "bg-emerald-500/5" : "bg-rose-500/5"
                        }`}
                >
                    <div className="relative shrink-0">
                        <img
                            src={lastDuel.opponent_avatar || "/pwa-512x512.png"}
                            alt={lastDuel.opponent_name}
                            loading="lazy"
                            decoding="async"
                            className="w-11 h-11 rounded-full object-cover"
                        />
                        <span
                            className={`absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center ${lastDuel.won ? "bg-emerald-500" : "bg-rose-500"
                                }`}
                            style={{ width: 18, height: 18 }}
                        >
                            {lastDuel.won ? (
                                <Trophy size={10} className="text-white" strokeWidth={2.5} />
                            ) : (
                                <Flame size={10} className="text-white" strokeWidth={2.5} />
                            )}
                        </span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                            {lastDuel.won ? "You beat" : "Lost to"} {lastDuel.opponent_name}
                        </p>
                        <p className="text-[11px] font-bold text-slate-500 tabular-nums mt-0.5">
                            {lastDuel.my_score} – {lastDuel.opp_score}
                        </p>
                    </div>

                    <button
                        onClick={() => challengeOpponent(lastDuel.opponent_id)}
                        className="px-3.5 h-9 rounded-xl bg-blue-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black  tracking-wider active:scale-95 transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        Rematch
                    </button>
                </div>
            )}

            {/* ---------- Players scroll ---------- */}
            {sortedPlayers.length > 0 ? (
                <div
                    className="flex gap-5 overflow-x-auto -mx-2 px-2 pb-2 pt-1"
                    style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                        WebkitOverflowScrolling: "touch",
                    }}
                >
                    {sortedPlayers.map((p) => (
                        <div
                            key={p.user_id}
                            className="shrink-0 w-[116px] flex flex-col items-center text-center"
                            style={{ contentVisibility: "auto" }}
                        >
                            {/* Avatar + pin badge */}
                            <div className="relative mb-2">
                                <button
                                    onClick={() => challengeOpponent(p.user_id)}
                                    className="block active:scale-[0.97] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                    aria-label={`Challenge ${p.name}`}
                                >
                                    <img
                                        src={p.avatar_url || "/pwa-512x512.png"}
                                        alt={p.name}
                                        loading="lazy"
                                        decoding="async"
                                        className={`w-[80px] h-[80px] rounded-full object-cover ${p.is_pinned
                                            ? "ring-2 ring-amber-400"
                                            : "ring-2 ring-blue-500/20"
                                            }`}
                                    />
                                    {p.is_online && (
                                        <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                                    )}
                                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                                        <Swords size={11} className="text-white" strokeWidth={2.5} />
                                    </span>
                                </button>

                                {/* Pin toggle */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        togglePin(p.user_id);
                                    }}
                                    className="absolute -top-1 -left-1 p-1 rounded-full bg-white dark:bg-slate-800 active:scale-90 transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                    aria-label={p.is_pinned ? "Unpin" : "Pin"}
                                >
                                    {p.is_pinned ? (
                                        <Star
                                            size={12}
                                            className="text-amber-500 fill-amber-500"
                                            strokeWidth={2.5}
                                        />
                                    ) : (
                                        <StarOff size={12} className="text-slate-300" strokeWidth={2.5} />
                                    )}
                                </button>
                            </div>

                            {/* Name */}
                            <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate w-full leading-tight mt-1">
                                {p.name}
                            </p>
                            {/* Username */}
                            <p className="text-[11px] font-medium text-slate-400 truncate w-full mt-0.5">
                                @{p.username}
                            </p>

                            {/* Challenge label */}
                            {/* Challenge button - Facebook style, blue */}
                            <button
                                onClick={() => challengeOpponent(p.user_id)}
                                className="mt-2.5 w-full h-9 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                style={{ touchAction: "manipulation" }}
                                aria-label={`Challenge ${p.name}`}
                            >
                                <Swords size={11} className="text-white" strokeWidth={2.5} />
                                <span className="text-[11px] font-bold text-white tracking-wide">
                                    Challenge
                                </span>
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                !loading && (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
                            <Swords className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
                        </div>
                        <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
                            No players available
                        </p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                            Tap refresh to load the directory
                        </p>
                    </div>
                )
            )}
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

function StripSkeleton() {
    return (
        <section
            className="w-full bg-white/70 dark:bg-muted/30 backdrop-blur-xl rounded-2xl p-5 space-y-5 font-sans"
            style={{ contain: "layout paint" }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="space-y-1.5">
                        <div className="w-20 h-3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                        <div className="w-28 h-2 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    </div>
                </div>
                <div className="w-12 h-3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>

            <div className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />

            <div className="flex gap-5">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="shrink-0 w-[116px] flex flex-col items-center">
                        <div className="w-[80px] h-[80px] rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse mb-2" />
                        <div className="w-16 h-3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mt-1" />
                        <div className="w-12 h-2.5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mt-1.5" />
                        <div className="w-20 h-5 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse mt-2.5" />
                    </div>
                ))}
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  Export                                                            */
/* ------------------------------------------------------------------ */

export const QuickDuelStrip = memo(QuickDuelStripBase);