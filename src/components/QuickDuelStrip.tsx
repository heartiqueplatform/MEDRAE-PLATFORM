import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    Swords,
    Trophy,
    Flame,
    Star,
    StarOff,
    CheckCircle2,
    AlertCircle,
    Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { UserProfileModal } from "./UserProfileModal";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
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

type ChallengeState =
    | { status: "idle" }
    | { status: "preparing"; player: Player }
    | { status: "ready"; player: Player }
    | { status: "error"; player: Player; message: string };

/* ------------------------------------------------------------------ */
/*  Cache — 60s TTL                                                    */
/* ------------------------------------------------------------------ */

const HISTORY_KEY = "quick_duel_history_v2";
const PLAYERS_KEY = "quick_duel_players_v2";
const CACHE_TTL = 60 * 1000;      // ⬅️ 60s
const POLL_INTERVAL = 60 * 1000;  // ⬅️ 60s

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
    } catch { }
}

/* ------------------------------------------------------------------ */
/*  Safe avatar — handles broken URLs                                  */
/* ------------------------------------------------------------------ */

const FALLBACK = "/pwa-512x512.png";

function SafeImg({
    src,
    fallback = FALLBACK,
    alt,
    ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & { fallback?: string }) {
    const [current, setCurrent] = useState(src || fallback);
    useEffect(() => { setCurrent(src || fallback); }, [src, fallback]);
    return (
        <img
            {...rest}
            src={current}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={() => { if (current !== fallback) setCurrent(fallback); }}
        />
    );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
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
    const isMountedRef = useRef(true);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    // ⬇️ Challenge modal state
    const [challenge, setChallenge] = useState<ChallengeState>({ status: "idle" });

    /* -------------------------------------------------------------- */
    /*  Fetch                                                          */
    /* -------------------------------------------------------------- */
    const fetchData = useCallback(
        async (force = false) => {
            if (!userId) return;
            if (!force && fetchedRef.current) return;
            fetchedRef.current = true;

            try {
                const [duelsRes, playersRes] = await Promise.all([
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

                    supabase
                        .from("profiles")
                        .select("user_id, name, username, avatar_url, is_online")
                        .neq("user_id", userId)
                        .order("name", { ascending: true })
                        .limit(200),
                ]);

                if (!isMountedRef.current) return;

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
                if (isMountedRef.current) {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        },
        [userId, players, cachedPlayers]
    );

    /* -------------------------------------------------------------- */
    /*  Lifecycle: initial idle fetch + 60s poll + focus refresh       */
    /* -------------------------------------------------------------- */
    useEffect(() => {
        isMountedRef.current = true;

        const ric: any = (window as any).requestIdleCallback;
        const idleId = ric
            ? ric(() => fetchData(false), { timeout: 2000 })
            : setTimeout(() => fetchData(false), 800);

        const onFocus = () => {
            if (!document.hidden) fetchData(true);
        };
        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onFocus);

        const intervalId = setInterval(() => {
            if (!document.hidden) fetchData(true);
        }, POLL_INTERVAL);

        return () => {
            isMountedRef.current = false;
            if ((window as any).cancelIdleCallback) {
                (window as any).cancelIdleCallback(idleId);
            } else {
                clearTimeout(idleId);
            }
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("visibilitychange", onFocus);
            clearInterval(intervalId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchData]);

    /* -------------------------------------------------------------- */
    /*  Pin toggle                                                     */
    /* -------------------------------------------------------------- */
    const togglePin = useCallback((playerId: string) => {
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
    }, []);

    /* -------------------------------------------------------------- */
    /*  Sorted players                                                 */
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
    /*  PREMIUM challenge flow                                         */
    /*   1. Show modal immediately (preparing)                         */
    /*   2. Prefetch 10 questions via RPC                              */
    /*   3. Stash in sessionStorage for ChallengePage                  */
    /*   4. Enforce minimum 800ms display                              */
    /*   5. Show "ready" for 600ms                                     */
    /*   6. Navigate (modal still visible, covers transition)          */
    /* -------------------------------------------------------------- */
    const sendChallenge = useCallback(
        async (player: Player) => {
            if (!userId || !player.user_id) return;
            if (navigator.vibrate) navigator.vibrate(20);
            setChallenge({ status: "preparing", player });

            const startedAt = Date.now();
            const MIN_DISPLAY_MS = 800;
            const READY_HOLD_MS = 600;

            try {
                const { data, error } = await supabase.rpc("get_random_questions", {
                    limit_count: 10,
                });
                if (error) throw error;

                // Hand off to ChallengePage
                try {
                    sessionStorage.setItem(
                        `prefetched_questions_${player.user_id}`,
                        JSON.stringify(data ?? [])
                    );
                } catch { }

                // Enforce minimum display so it never flashes
                const elapsed = Date.now() - startedAt;
                if (elapsed < MIN_DISPLAY_MS) {
                    await new Promise((r) => setTimeout(r, MIN_DISPLAY_MS - elapsed));
                }

                if (!isMountedRef.current) return;
                setChallenge({ status: "ready", player });

                // Hold "ready" state, then navigate (modal still visible)
                setTimeout(() => {
                    if (!isMountedRef.current) return;
                    navigate(`/challenge?duel=${player.user_id}`);
                    // Fade out after navigation begins
                    setTimeout(() => {
                        if (isMountedRef.current) {
                            setChallenge({ status: "idle" });
                        }
                    }, 220);
                }, READY_HOLD_MS);
            } catch (err: any) {
                if (!isMountedRef.current) return;
                console.error("Challenge prep failed:", err);
                setChallenge({
                    status: "error",
                    player,
                    message: err?.message ?? "Could not prepare challenge",
                });
            }
        },
        [userId, navigate]
    );

    const retryChallenge = useCallback(() => {
        if (challenge.status === "error") {
            sendChallenge(challenge.player);
        }
    }, [challenge, sendChallenge]);

    const dismissChallenge = useCallback(() => {
        setChallenge({ status: "idle" });
    }, []);

    const handleRematch = useCallback(
        (opponentId: string) => {
            const player = players.find((p) => p.user_id === opponentId);
            if (player) {
                sendChallenge(player);
            } else {
                // Fallback — no modal, direct nav
                navigate(`/challenge?duel=${opponentId}`);
            }
        },
        [players, sendChallenge, navigate]
    );

    const handleRefresh = useCallback(() => {
        if (refreshing) return;
        if (navigator.vibrate) navigator.vibrate(20);
        setRefreshing(true);
        fetchData(true);
    }, [refreshing, fetchData]);

    const lastDuel = history[0];

    /* -------------------------------------------------------------- */
    /*  Skeleton                                                       */
    /* -------------------------------------------------------------- */
    if (loading && !lastDuel && sortedPlayers.length === 0) {
        return <StripSkeleton />;
    }

    /* -------------------------------------------------------------- */
    /*  Render                                                         */
    /* -------------------------------------------------------------- */
    return (
        <>
            <section
                className="w-full bg-white/70 dark:bg-muted/30 backdrop-blur-xl rounded-2xl p-5 space-y-5 font-sans"
                style={{ contain: "layout paint" }}
            >
                {/* ---------- Players row ---------- */}
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
                                <div className="relative mb-2">
                                    <button
                                        onClick={() => {
                                            if (navigator.vibrate) navigator.vibrate(10);
                                            setSelectedUserId(p.user_id);
                                        }}
                                        className="block active:scale-[0.97] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                        aria-label={`View ${p.name}'s profile`}
                                    >
                                        <SafeImg
                                            src={p.avatar_url}
                                            alt={p.name}
                                            loading="lazy"
                                            decoding="async"
                                            className={`w-[80px] h-[80px] rounded-full object-cover ${p.is_pinned ? "ring-2 ring-amber-400" : "ring-2 ring-blue-500/20"
                                                }`}
                                        />
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        if (navigator.vibrate) navigator.vibrate(10);
                                        setSelectedUserId(p.user_id);
                                    }}
                                    className="w-full text-center active:scale-[0.98] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate w-full leading-tight mt-1">
                                        {p.name}
                                    </p>
                                    <p className="text-[11px] font-medium text-slate-400 truncate w-full mt-0.5">
                                        @{p.username}
                                    </p>
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        togglePin(p.user_id);
                                    }}
                                    className={`mt-1.5 w-full h-7 rounded-md flex items-center justify-center gap-1 transition-all active:scale-95 ${p.is_pinned
                                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                        }`}
                                    style={{ touchAction: "manipulation" }}
                                    aria-label={p.is_pinned ? "Remove favorite" : "Add favorite"}
                                >
                                    {p.is_pinned ? (
                                        <>
                                            <Star size={11} className="fill-amber-500 text-amber-500" strokeWidth={2.5} />
                                            <span className="text-[10px] font-bold tracking-wide">Favorited</span>
                                        </>
                                    ) : (
                                        <>
                                            <StarOff size={11} strokeWidth={2.5} />
                                            <span className="text-[10px] font-bold tracking-wide">+ Favorite</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => sendChallenge(p)}
                                    className="mt-1.5 w-full h-9 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                    style={{ touchAction: "manipulation" }}
                                    aria-label={`Challenge ${p.name}`}
                                >
                                    <span className="text-[11px] font-bold text-white tracking-wide">
                                        Challenge Me
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

                {/* ---------- Last battle card ---------- */}
                {lastDuel && (
                    <div
                        className={`flex items-center gap-3 p-3 rounded-2xl ${lastDuel.won ? "bg-emerald-500/5" : "bg-rose-500/5"
                            }`}
                    >
                        <div className="relative shrink-0">
                            <SafeImg
                                src={lastDuel.opponent_avatar}
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
                            onClick={() => handleRematch(lastDuel.opponent_id)}
                            className="px-3.5 h-9 rounded-xl bg-blue-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black tracking-wider active:scale-95 transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            Rematch
                        </button>
                    </div>
                )}

                <UserProfileModal
                    userId={selectedUserId}
                    onClose={() => setSelectedUserId(null)}
                />
            </section>

            {/* ---------- Premium challenge modal ---------- */}
            <ChallengeOverlay
                state={challenge}
                onDismiss={dismissChallenge}
                onRetry={retryChallenge}
            />
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  ChallengeOverlay — dark, animated, premium                         */
/* ------------------------------------------------------------------ */

function ChallengeOverlay({
    state,
    onDismiss,
    onRetry,
}: {
    state: ChallengeState;
    onDismiss: () => void;
    onRetry: () => void;
}) {
    const open = state.status !== "idle";

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 dark:bg-[var(--muted)]/60 backdrop-blur-md"
                    onClick={onDismiss}
                >
                    <motion.div
                        initial={{ scale: 0.94, y: 16, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.96, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        className="relative w-[88%] max-w-sm bg-slate-900 dark:bg-muted/100 rounded-xl p-8 border-0 shadow-none overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Ambient glow */}
                        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-blue-500/20 blur-[80px] pointer-events-none" />
                        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />

                        {/* PREPARING */}
                        {state.status === "preparing" && (
                            <div className="relative flex flex-col items-center text-center">
                                {/* Pulsing swords */}
                                <div className="relative w-24 h-24 mb-6">
                                    <motion.div
                                        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute inset-0 rounded-full bg-blue-500/20 blur-2xl"
                                    />
                                    <motion.div
                                        animate={{ rotate: [-12, 12, -12] }}
                                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute inset-0 flex items-center justify-center"
                                    >
                                        <Swords size={48} className="text-blue-400" strokeWidth={1.5} />
                                    </motion.div>
                                </div>

                                <h3 className="text-xl font-black text-white mb-1">
                                    Preparing Your Duel
                                </h3>
                                <p className="text-sm text-slate-400 mb-6">
                                    Against{" "}
                                    <span className="font-bold text-slate-200">
                                        {state.player.name}
                                    </span>
                                </p>

                                {/* Indeterminate progress bar */}
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-4">
                                    <motion.div
                                        initial={{ x: "-100%" }}
                                        animate={{ x: "200%" }}
                                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                                        className="h-full w-1/2 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
                                    />
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Loader2 size={13} className="animate-spin" />
                                    <span>Fetching 10 clinical questions...</span>
                                </div>
                            </div>
                        )}

                        {/* READY */}
                        {state.status === "ready" && (
                            <div className="relative flex flex-col items-center text-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                    className="w-24 h-24 rounded-full bg-emerald-500/15 flex items-center justify-center mb-6 relative"
                                >
                                    <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-2xl" />
                                    <CheckCircle2 size={48} className="relative text-emerald-400" strokeWidth={1.8} />
                                </motion.div>

                                <h3 className="text-xl font-black text-white mb-1">
                                    Ready!
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Entering the arena...
                                </p>

                                <div className="flex gap-1 mt-6">
                                    {[0, 1, 2].map((i) => (
                                        <motion.div
                                            key={i}
                                            animate={{ opacity: [0.3, 1, 0.3] }}
                                            transition={{
                                                duration: 1,
                                                repeat: Infinity,
                                                delay: i * 0.15,
                                            }}
                                            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ERROR */}
                        {state.status === "error" && (
                            <div className="relative flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-full bg-rose-500/15 flex items-center justify-center mb-6 relative">
                                    <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-2xl" />
                                    <AlertCircle size={48} className="relative text-rose-400" strokeWidth={1.8} />
                                </div>

                                <h3 className="text-xl font-black text-white mb-1">
                                    Couldn't Prepare
                                </h3>
                                <p className="text-sm text-slate-400 mb-6">
                                    {state.message}
                                </p>

                                <div className="flex gap-2 w-full">
                                    <button
                                        onClick={onDismiss}
                                        className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-sm transition-all active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={onRetry}
                                        className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all active:scale-95"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function StripSkeleton() {
    return (
        <section
            className="w-full bg-white/70 dark:bg-muted/30 backdrop-blur-xl rounded-2xl p-5 space-y-5 font-sans"
            style={{ contain: "layout paint" }}
        >
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
            <div className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  Export                                                             */
/* ------------------------------------------------------------------ */

export const QuickDuelStrip = memo(QuickDuelStripBase);