"use client";

import React from 'react';
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dayjs from "dayjs";
import { motion, AnimatePresence } from "framer-motion";
import { playSound } from "@/lib/soundManager";

import { Trophy, Sparkles, ArrowRight, Heart, BookOpen, RefreshCw, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MistakesCard } from "@/components/MistakesCard";

interface Question {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
    explanation: string;
    additional?: string;
    topic?: string;
    difficulty?: string;
    user_selected?: string;
}
interface Mistake {
    id: string;
    times_wrong: number;
    first_wrong_at: string;
    last_wrong_at: string;
    resolved: boolean;
    quiz_id: string;
    questions: Question;
    mistake_reason?: string;
}

// ═══════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════
const MISTAKES_CACHE_KEY = "my_mistakes_cache";
const MISTAKES_VERSION_KEY = "my_mistakes_version";
const CACHE_DURATION = 43200000; // 12 hours

let fetchInProgress = false;
const MIN_FETCH_INTERVAL = 43200000;

// ═══════════════════════════════════════════════════════════════
// SAFE STORAGE — never throws, even in private mode / quota exceeded
// ═══════════════════════════════════════════════════════════════
const safeStorage = {
    get(key: string): string | null {
        try {
            if (typeof window === "undefined") return null;
            return window.localStorage.getItem(key);
        } catch {
            return null;
        }
    },
    set(key: string, value: string): boolean {
        try {
            if (typeof window === "undefined") return false;
            window.localStorage.setItem(key, value);
            return true;
        } catch {
            return false;
        }
    },
    remove(key: string): void {
        try {
            if (typeof window === "undefined") return;
            window.localStorage.removeItem(key);
        } catch {
            /* ignore */
        }
    },
};

// ═══════════════════════════════════════════════════════════════
// CHANGE DETECTION
// ═══════════════════════════════════════════════════════════════
async function checkForChanges(userId: string): Promise<boolean> {
    if (!userId) return false;
    if (typeof navigator !== "undefined" && !navigator.onLine) return false;

    try {
        const { data, error } = await supabase
            .from("user_mistakes")
            .select("last_wrong_at")
            .eq("user_id", userId)
            .eq("resolved", false)
            .order("last_wrong_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) return false;

        const currentVersion = data?.last_wrong_at || "no_data";
        const cachedVersion = safeStorage.get(MISTAKES_VERSION_KEY);

        if (cachedVersion !== currentVersion) {
            safeStorage.set(MISTAKES_VERSION_KEY, currentVersion);
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
// CACHE HELPERS
// ═══════════════════════════════════════════════════════════════
const getCachedMistakes = (): Mistake[] => {
    try {
        const cached = safeStorage.get(MISTAKES_CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_DURATION) {
                return (parsed.data || []).filter(
                    (m: Mistake) => m.questions && Object.keys(m.questions).length > 0
                );
            }
        }
    } catch (e) {
        console.error("Failed to parse cached mistakes:", e);
    }
    return [];
};

const setCachedMistakes = (data: Mistake[]) => {
    try {
        safeStorage.set(
            MISTAKES_CACHE_KEY,
            JSON.stringify({ data, timestamp: Date.now() })
        );
    } catch {
        /* ignore */
    }
};

// ═══════════════════════════════════════════════════════════════
// TIMEOUT WRAPPER — no promise can hang the UI forever
// ═══════════════════════════════════════════════════════════════
function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("timeout")), ms);
        promise.then(
            (v) => {
                clearTimeout(t);
                resolve(v);
            },
            (e) => {
                clearTimeout(t);
                reject(e);
            }
        );
    });
}

// ═══════════════════════════════════════════════════════════════
// SKELETON — explicit colors, no undefined CSS vars
// ═══════════════════════════════════════════════════════════════
const MistakesSkeleton = () => {
    return (
        <div className="w-full max-w-full mx-auto px-0 md:px-4 lg:px-6 space-y-0 md:space-y-2 pb-4 md:pb-6 animate-pulse">
            <div className="mb-0 md:mb-1">
                <div className="relative bg-white dark:bg-[#0d1117] md:rounded-2xl p-4 md:p-6 lg:p-8 text-start overflow-hidden border-b border-slate-100 dark:border-slate-800 md:border-b-0 rounded-none">
                    <div className="flex justify-between items-start">
                        <div className="space-y-3 w-full">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-200 dark:bg-[#161b22]" />
                                <div className="h-8 md:h-10 bg-gray-200 dark:bg-[#161b22] rounded-lg w-48" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-[#161b22] rounded w-3/4" />
                                <div className="h-4 bg-gray-200 dark:bg-[#161b22] rounded w-1/2" />
                            </div>
                            <div className="h-6 bg-gray-200 dark:bg-[#161b22] rounded w-64" />
                        </div>
                        <div className="w-10 h-10 bg-gray-200 dark:bg-[#161b22] rounded-full" />
                    </div>
                </div>
            </div>

            {[1, 2, 3].map((i) => (
                <Card
                    key={i}
                    className="overflow-visible md:border-0 md:shadow-md md:rounded-xl bg-white dark:bg-[#0d1117] rounded-none border-none shadow-none border-b border-slate-100 dark:border-slate-800 md:border-b-0"
                >
                    <CardHeader className="p-3 md:p-4">
                        <div className="h-5 bg-gray-200 dark:bg-[#161b22] rounded w-3/4 mb-2" />
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 md:gap-1">
                            <div className="h-4 bg-gray-200 dark:bg-[#161b22] rounded w-24" />
                            <div className="h-4 bg-gray-200 dark:bg-[#161b22] rounded w-32" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4">
                        {["A", "B", "C", "D"].map((letter) => (
                            <div key={letter} className="flex justify-between items-center py-1.5 md:py-2">
                                <div className="h-4 bg-gray-200 dark:bg-[#161b22] rounded w-3/4" />
                                <div className="h-5 bg-gray-200 dark:bg-[#161b22] rounded w-16" />
                            </div>
                        ))}
                        <div className="h-4 bg-gray-200 dark:bg-[#161b22] rounded w-full" />
                        <div className="h-10 bg-gray-200 dark:bg-[#161b22] rounded w-32" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// OFFLINE FALLBACK — never a blank screen
// ═══════════════════════════════════════════════════════════════
const OfflineFallback = ({ onRetry }: { onRetry: () => void }) => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="bg-slate-100 dark:bg-[#161b22] w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            You're offline
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-6">
            Your mistakes will appear here once you reconnect. Any progress you
            made offline is saved.
        </p>
        <Button onClick={onRetry} variant="outline" className="rounded-xl">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
        </Button>
    </div>
);

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
export default function MyMistakes() {
    const navigate = useNavigate();

    // ── Safe session read (no @supabase/auth-helpers-react) ──
    const [user, setUser] = useState<any>(null);
    const [authReady, setAuthReady] = useState(false);

    const isMounted = useRef(true);
    const pendingResolves = useRef<Map<string, boolean>>(new Map());

    const [mistakes, setMistakes] = useState<Mistake[]>(() => getCachedMistakes());
    const [loading, setLoading] = useState(false);
    const [mistakeCount, setMistakeCount] = useState(mistakes.length);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isOffline, setIsOffline] = useState(
        typeof navigator !== "undefined" ? !navigator.onLine : false
    );
    const [hardError, setHardError] = useState(false);

    // ── Auth resolution (offline-safe, never throws) ──
    useEffect(() => {
        let cancelled = false;

        // 1. Read cached session from localStorage (sync, no network)
        try {
            const keys = Object.keys(localStorage).filter((k) =>
                k.startsWith("sb-") && k.endsWith("-auth-token")
            );
            for (const key of keys) {
                try {
                    const parsed = JSON.parse(safeStorage.get(key) || "null");
                    const cachedUser = parsed?.user ?? parsed?.currentSession?.user ?? null;
                    if (!cancelled && cachedUser) {
                        setUser(cachedUser);
                        break;
                    }
                } catch {
                    /* ignore */
                }
            }
        } catch {
            /* ignore */
        }

        // 2. Try Supabase (async, guarded)
        supabase.auth
            .getSession()
            .then(({ data }) => {
                if (!cancelled) setUser(data?.session?.user ?? null);
            })
            .catch(() => {
                /* offline or no session — keep cached */
            })
            .finally(() => {
                if (!cancelled) setAuthReady(true);
            });

        // 3. Subscribe to changes
        let sub: any = null;
        try {
            const res = supabase.auth.onAuthStateChange((_event, session) => {
                if (!cancelled) setUser(session?.user ?? null);
            });
            sub = res?.data?.subscription;
        } catch {
            /* ignore */
        }

        return () => {
            cancelled = true;
            try {
                sub?.unsubscribe?.();
            } catch {
                /* ignore */
            }
        };
    }, []);

    // ── Online/offline listeners ──
    useEffect(() => {
        const goOnline = () => setIsOffline(false);
        const goOffline = () => setIsOffline(true);
        window.addEventListener("online", goOnline);
        window.addEventListener("offline", goOffline);
        return () => {
            window.removeEventListener("online", goOnline);
            window.removeEventListener("offline", goOffline);
        };
    }, []);

    // ── Offline queue helpers ──
    const getOfflineQueue = useCallback((): string[] => {
        const stored = safeStorage.get("offlineResolved");
        if (!stored) return [];
        try {
            return JSON.parse(stored) as string[];
        } catch {
            return [];
        }
    }, []);

    const saveToOfflineQueue = useCallback(
        (questionId: string) => {
            const queue = getOfflineQueue();
            if (!queue.includes(questionId)) {
                queue.push(questionId);
                safeStorage.set("offlineResolved", JSON.stringify(queue));
            }
        },
        [getOfflineQueue]
    );

    const syncOfflineQueue = useCallback(async () => {
        const queue = getOfflineQueue();
        if (!queue.length) return;
        if (!user) return;
        if (typeof navigator !== "undefined" && !navigator.onLine) return;

        try {
            for (const questionId of queue) {
                try {
                    const { error } = await withTimeout(
                        supabase
                            .from("user_mistakes")
                            .update({ resolved: true })
                            .eq("user_id", user.id)
                            .eq("question_id", questionId) as any,
                        6000
                    );
                    if (!error) {
                        const updatedQueue = getOfflineQueue().filter((id) => id !== questionId);
                        safeStorage.set("offlineResolved", JSON.stringify(updatedQueue));
                    }
                } catch {
                    /* keep in queue for next time */
                }
            }
        } catch (err) {
            console.error("Sync offline queue failed:", err);
        }
    }, [user, getOfflineQueue]);

    // ── Fetch mistakes (fully guarded) ──
    const fetchMistakes = useCallback(
        async (forceRefresh = false) => {
            if (!user || fetchInProgress) return;

            // OFFLINE: read cache, exit clean
            if (typeof navigator !== "undefined" && !navigator.onLine) {
                const cached = getCachedMistakes();
                if (isMounted.current) {
                    setMistakes(cached);
                    setMistakeCount(cached.length);
                    setLoading(false);
                    setIsRefreshing(false);
                }
                return;
            }

            const now = Date.now();
            const lastSync = safeStorage.get(MISTAKES_VERSION_KEY + "_time");

            if (!forceRefresh && lastSync && now - parseInt(lastSync) < MIN_FETCH_INTERVAL) {
                const cached = getCachedMistakes();
                if (cached.length > 0) {
                    setMistakes(cached);
                    setMistakeCount(cached.length);
                    setLoading(false);
                    return;
                }
            }

            fetchInProgress = true;

            if (isMounted.current) {
                const cached = getCachedMistakes();
                if (cached.length === 0) setLoading(true);
                setIsRefreshing(true);
            }

            try {
                const { data, error } = await withTimeout(
                    supabase
                        .from("user_mistakes")
                        .select(`
                            id,
                            times_wrong,
                            first_wrong_at,
                            last_wrong_at,
                            resolved,
                            quiz_id,
                            user_selected,
                            mistake_reason,
                            questions:question_id (
                                id,
                                question_text,
                                option_a,
                                option_b,
                                option_c,
                                option_d,
                                correct_answer,
                                explanation,
                                additional,
                                topic,
                                difficulty
                            )
                        `)
                        .eq("user_id", user.id)
                        .eq("resolved", false)
                        .order("last_wrong_at", { ascending: false }) as any,
                    10000
                );

                if (error) {
                    console.error("Supabase error:", error);
                    // fall back to cache
                    const cached = getCachedMistakes();
                    if (isMounted.current && cached.length > 0) {
                        setMistakes(cached);
                        setMistakeCount(cached.length);
                    }
                    return;
                }

                if (!isMounted.current) return;

                const userMistakes = (data || []).filter(
                    (m: any) => m.questions && Object.keys(m.questions).length > 0
                );

                setMistakes(userMistakes);
                setMistakeCount(userMistakes.length);
                setCachedMistakes(userMistakes);
                safeStorage.set(MISTAKES_VERSION_KEY + "_time", String(Date.now()));
                setHardError(false);
            } catch (err) {
                console.error("Error fetching mistakes:", err);
                // network error — try cache
                const cached = getCachedMistakes();
                if (isMounted.current && cached.length > 0) {
                    setMistakes(cached);
                    setMistakeCount(cached.length);
                } else if (isMounted.current) {
                    // no cache, no network → show fallback, not blank
                    setHardError(true);
                }
            } finally {
                fetchInProgress = false;
                if (isMounted.current) {
                    setIsRefreshing(false);
                    setLoading(false); // ← ALWAYS
                }
            }
        },
        [user]
    );

    // ── Initial load ──
    useEffect(() => {
        isMounted.current = true;
        if (!authReady) return;

        const cached = getCachedMistakes();
        if (cached.length > 0) {
            setMistakes(cached);
            setMistakeCount(cached.length);
            setLoading(false);
            fetchMistakes().catch(() => { });
        } else if (!user) {
            // no user, no cache → not an error, just empty
            setLoading(false);
        } else if (typeof navigator !== "undefined" && !navigator.onLine) {
            // offline + no cache → show offline fallback, not blank
            setLoading(false);
            setHardError(true);
        } else {
            setLoading(true);
            fetchMistakes().catch(() => {
                if (isMounted.current) setLoading(false);
            });
        }

        if (navigator.onLine && user) {
            syncOfflineQueue().catch(() => { });
        }

        return () => {
            isMounted.current = false;
        };
    }, [authReady, user, fetchMistakes, syncOfflineQueue]);

    // ── Refetch when user becomes available ──
    useEffect(() => {
        if (!authReady || !user) return;
        const cached = getCachedMistakes();
        if (cached.length === 0) {
            fetchMistakes().catch(() => { });
        }
    }, [authReady, user, fetchMistakes]);

    // ── Smart refresh on focus / reconnect ──
    useEffect(() => {
        let focusTimer: ReturnType<typeof setTimeout>;
        const handleFocus = async () => {
            if (focusTimer) clearTimeout(focusTimer);
            focusTimer = setTimeout(async () => {
                if (typeof navigator !== "undefined" && !navigator.onLine) return;
                if (!isMounted.current || !user) return;

                const now = Date.now();
                const lastSync = safeStorage.get(MISTAKES_VERSION_KEY + "_time");
                if (lastSync && now - parseInt(lastSync) < MIN_FETCH_INTERVAL) return;

                try {
                    const hasChanges = await checkForChanges(user.id);
                    if (hasChanges) fetchMistakes(true).catch(() => { });
                } catch {
                    /* ignore */
                }
            }, 500);
        };

        const handleOnline = () => {
            setIsOffline(false);
            if (user) {
                syncOfflineQueue().catch(() => { });
                fetchMistakes(true).catch(() => { });
            }
        };

        window.addEventListener("focus", handleFocus);
        window.addEventListener("online", handleOnline);

        return () => {
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("online", handleOnline);
            if (focusTimer) clearTimeout(focusTimer);
        };
    }, [user, fetchMistakes, syncOfflineQueue]);

    const vibrateTap = (duration = 40) => {
        try {
            if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                navigator.vibrate(duration);
            }
        } catch {
            /* ignore */
        }
    };

    const markAsResolved = useCallback(
        (questionId: string) => {
            if (pendingResolves.current.has(questionId)) return;
            pendingResolves.current.set(questionId, true);
            setTimeout(() => pendingResolves.current.delete(questionId), 2000);

            const updated = mistakes.filter((m) => m.questions.id !== questionId);
            setMistakes(updated);
            setMistakeCount(updated.length);
            setCachedMistakes(updated);

            try {
                playSound("tap-correct", false);
            } catch {
                /* ignore */
            }

            const updateMistake = async () => {
                try {
                    if (!user || (typeof navigator !== "undefined" && !navigator.onLine)) {
                        saveToOfflineQueue(questionId);
                        return;
                    }

                    const { error } = await withTimeout(
                        supabase
                            .from("user_mistakes")
                            .update({ resolved: true })
                            .eq("user_id", user.id)
                            .eq("question_id", questionId) as any,
                        6000
                    );

                    if (error) {
                        saveToOfflineQueue(questionId);
                        const rollback = mistakes.filter((m) => m.questions.id === questionId);
                        if (rollback.length > 0 && isMounted.current) {
                            setMistakes((prev) => [...rollback, ...prev]);
                            setMistakeCount((prev) => prev + 1);
                            setCachedMistakes([...rollback, ...mistakes]);
                        }
                    } else {
                        safeStorage.remove(MISTAKES_VERSION_KEY);
                    }
                } catch (err) {
                    saveToOfflineQueue(questionId);
                    console.error("Error, queued:", questionId, err);
                }
            };

            updateMistake().catch(() => { });
        },
        [mistakes, user, saveToOfflineQueue]
    );

    const getReasonClass = (reason?: string) => {
        switch (reason) {
            case "Misread question":
                return "bg-red-100 dark:bg-red-800 border-red-300 dark:border-red-700";
            case "Concept gap":
                return "bg-blue-100 dark:bg-blue-800 border-blue-300 dark:border-blue-700";
            case "Rushed":
                return "bg-yellow-100 dark:bg-yellow-800 border-yellow-300 dark:border-yellow-700";
            case "Guess":
                return "bg-green-100 dark:bg-green-800 border-green-300 dark:border-green-700";
            default:
                return "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600";
        }
    };

    const handleManualRefresh = async () => {
        setHardError(false);
        try {
            await fetchMistakes(true);
        } catch {
            /* ignore */
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════

    // 1. First paint before auth resolves AND we have no cache → skeleton
    if (!authReady && loading === false && mistakes.length === 0) {
        // brief skeleton while auth settles — avoids a flash of "offline" state
        return <MistakesSkeleton />;
    }

    // 2. Loading with no cache → skeleton
    if (loading && mistakes.length === 0) {
        return <MistakesSkeleton />;
    }

    // 3. Offline + no cached data → explicit fallback (never blank)
    if (hardError && mistakes.length === 0) {
        return <OfflineFallback onRetry={handleManualRefresh} />;
    }

    // 4. User not signed in + no cache → empty achievement state
    if (!user && mistakes.length === 0 && authReady) {
        return (
            <div className="flex justify-center items-center min-h-[70vh] p-4 md:p-6 bg-transparent">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative w-full max-w-md"
                >
                    <div className="absolute -inset-1 rounded-xl blur-2xl opacity-30 dark:opacity-40" />
                    <div className="relative bg-white/90 backdrop-blur-sm dark:bg-slate-900/90 border-0 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl shadow-slate-200/50 dark:shadow-black/50 p-6 md:p-10 text-center overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent dark:from-emerald-500/5 pointer-events-none" />
                        <div className="flex justify-center mb-4 md:mb-6">
                            <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 border-emerald-200 dark:border-emerald-500/30 px-3 md:px-4 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">
                                Milestone Achieved
                            </Badge>
                        </div>
                        <div className="relative mb-6 md:mb-8 flex justify-center">
                            <div className="bg-emerald-50 dark:bg-emerald-500/15 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 dark:shadow-emerald-500/10">
                                <Trophy className="w-10 h-10 md:w-12 md:h-12 text-emerald-500 dark:text-emerald-400" />
                            </div>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            >
                                <Sparkles className="w-24 h-24 md:w-28 md:h-28 text-emerald-200 dark:text-emerald-500/30" />
                            </motion.div>
                        </div>
                        <div className="space-y-2 md:space-y-3 mb-8 md:mb-10">
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                Flawless <span className="text-emerald-500 dark:text-emerald-400">Performance</span>
                            </h2>
                            <p className="text-slate-600 dark:text-slate-300 text-xs md:text-sm leading-relaxed font-medium">
                                Extraordinary work! You answered every question with 100% accuracy. Your clinical knowledge is currently peaking.
                            </p>
                        </div>
                        <div className="space-y-3 md:space-y-4">
                            <Button
                                onClick={() => navigate("/Medrae-quizzes")}
                                className="w-full h-12 md:h-14 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-2xl shadow-xl shadow-blue-200/50 dark:shadow-blue-900/30 transition-all group font-bold text-sm md:text-md"
                            >
                                <div className="flex items-center justify-center gap-2 md:gap-3">
                                    <Heart className="w-5 h-5 md:w-6 md:h-6 text-white fill-rose-500 stroke-white stroke-[1.5px] transition-transform group-hover:scale-125" />
                                    Continue My Journey
                                    <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Button>
                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                🏆 Streak Active • Keep Practicing
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // 5. Loaded with data → normal render
    return (
        <div className="w-full max-w-full mx-auto px-0 md:px-4 lg:px-6 space-y-0 md:space-y-2 pb-4 md:pb-6">
            {/* Offline banner — quiet, non-blocking */}
            {isOffline && (
                <div className="mb-2 mx-3 md:mx-0 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                        You're offline — showing saved data. Changes will sync when you reconnect.
                    </span>
                </div>
            )}

            <MistakesCard />

            <div className="mb-0 md:mb-1">
                <div className="relative bg-slate-100 dark:bg-[#0d1117] md:rounded-2xl p-4 md:p-6 lg:p-8 text-start overflow-hidden rounded-none">
                    <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                    <Sparkles size={14} className="text-amber-600 dark:text-amber-400" />
                                </div>
                                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                    Your learning space
                                </span>
                            </div>

                            <h1 className="text-lg lg:text-2xl font-semibold text-gray-900 dark:text-white leading-snug">
                                {mistakeCount === 0 ? (
                                    <>Everything's clear. Nothing left to revisit.</>
                                ) : (
                                    <>
                                        You have{" "}
                                        <span className="font-bold text-rose-600 dark:text-rose-400">
                                            {mistakeCount}
                                        </span>{" "}
                                        {mistakeCount === 1
                                            ? "question worth revisiting"
                                            : "questions worth revisiting"}
                                        .
                                    </>
                                )}
                            </h1>


                            <p className="text-sm font-normal text-gray-500 dark:text-gray-500 mt-2 max-w-xl leading-relaxed">
                                {mistakeCount === 0
                                    ? "Keep going  you're on top of everything right now."
                                    : "Each one is a small lesson waiting to be understood. Work through them at your own pace."}
                            </p>

                            {mistakeCount === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
                                    className="mt-6 flex flex-col items-center justify-center text-center w-full"
                                >
                                    <Button
                                        onClick={() => {
                                            vibrateTap(40);
                                            try { playSound("medrae", false); } catch { }
                                            navigate("/Medrae-quizzes");
                                        }}
                                        className="h-11 md:h-12 px-5 md:px-6 rounded-2xl
                bg-gradient-to-r from-emerald-500 to-teal-600
                hover:from-emerald-600 hover:to-teal-700
                dark:from-emerald-500 dark:to-teal-600
                dark:hover:from-emerald-600 dark:hover:to-teal-700
                text-white font-bold text-sm md:text-base
                shadow-lg shadow-emerald-500/25
                transition-all group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:rotate-12" />
                                            Take a New Quiz
                                            <ChevronRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </Button>
                                    <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                        You're on a clean slate ~ keep the streak alive.
                                    </p>
                                </motion.div>
                            )}
                        </div>

                        {mistakeCount > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                                className="flex items-center gap-4 md:gap-6 bg-white/60 dark:bg-[#161b22]/60 backdrop-blur-sm rounded-2xl px-5 py-4 md:px-6 md:py-5"
                            >
                                <div className="flex flex-col">
                                    <span className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                                        {mistakeCount}
                                    </span>
                                    <span className="text-[11px] font-normal text-gray-500 dark:text-gray-500">
                                        {mistakeCount === 1 ? "lesson" : "lessons"} waiting
                                    </span>
                                </div>

                                <div className="w-px h-10 bg-gray-200 dark:bg-gray-800" />

                                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                                    <BookOpen size={16} />
                                    <span className="text-[11px] font-medium">Revisit anytime</span>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {mistakes.map((m, i) => (
                    <motion.div
                        key={m.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -300, transition: { duration: 0.4, type: "spring", stiffness: 150 } }}
                        layout
                        className="mb-0 md:mb-4"
                    >
                        <Card className="overflow-visible md:border-0 md:shadow-md md:rounded-xl bg-white/40 dark:bg-[#0d1117] rounded-none border-none shadow-none border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                            <CardHeader className="p-3 md:p-4">
                                <CardTitle className="text-sm md:text-base lg:text-lg">
                                    Q{i + 1}: {m.questions?.question_text ?? "Question unavailable"}
                                </CardTitle>
                                <CardDescription className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 md:gap-1 text-xs md:text-sm">
                                    <span>
                                        Wrong {m.times_wrong} {m.times_wrong === 1 ? "time" : "times"}
                                    </span>
                                    <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                        Last Attempt: {dayjs(m.last_wrong_at).format("DD MMM YYYY, h:mm A")}
                                    </span>
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4 text-xs md:text-sm lg:text-base">
                                {["A", "B", "C", "D"].map((letter) => {
                                    const optionText =
                                        m.questions?.[`option_${letter.toLowerCase()}` as keyof Question] ?? "—";
                                    const isCorrect = letter === m.questions?.correct_answer;
                                    const isUserChoice = letter === m.user_selected;

                                    return (
                                        <div
                                            key={letter}
                                            className="flex justify-between items-center py-1.5 md:py-2 flex-wrap gap-1.5 md:gap-2"
                                        >
                                            <span
                                                className={
                                                    isCorrect
                                                        ? "font-semibold text-green-700 dark:text-green-400"
                                                        : isUserChoice
                                                            ? "font-semibold text-red-700 dark:text-red-400"
                                                            : ""
                                                }
                                            >
                                                <strong>{letter}.</strong> {optionText}
                                            </span>
                                            {isUserChoice && !isCorrect && (
                                                <span className="ml-1 md:ml-2 px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-medium bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200 rounded-full">
                                                    Your Choice
                                                </span>
                                            )}
                                            {isCorrect && (
                                                <span className="ml-1 md:ml-2 px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-medium bg-green-200 dark:bg-green-900 text-green-900 dark:text-green-200 rounded-full">
                                                    Correct Answer
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}

                                {m.mistake_reason && (
                                    <div
                                        className={`mt-1.5 md:mt-2 px-2 md:px-3 py-1.5 md:py-2 rounded-md border text-xs md:text-sm ${getReasonClass(
                                            m.mistake_reason
                                        )} text-black dark:text-white`}
                                    >
                                        <strong>Reason for mistake:</strong> {m.mistake_reason}
                                    </div>
                                )}

                                <p className="leading-relaxed text-xs md:text-sm">
                                    <strong>Explanation:</strong>{" "}
                                    {m.questions?.explanation ?? "No explanation available."}
                                </p>
                                {m.questions?.additional && (
                                    <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded border-l-4 border-blue-500 text-xs italic">
                                        <strong>Pro Tip:</strong> {m.questions.additional}
                                    </div>
                                )}
                                {m.questions?.topic && (
                                    <div className="mt-2">
                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500">
                                            Topic: {m.questions.topic}
                                        </span>
                                    </div>
                                )}
                                <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}>
                                    <Button
                                        onClick={() => {
                                            vibrateTap(40);
                                            if (m.questions?.id) {
                                                markAsResolved(m.questions.id);
                                            }
                                        }}
                                        className="w-full sm:w-auto text-xs md:text-sm h-10 md:h-11"
                                    >
                                        Mark as Understood
                                    </Button>
                                </motion.div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Refresh button — only visible when there are mistakes and not loading */}
            {mistakes.length > 0 && !isRefreshing && (
                <div className="flex justify-center pt-4 pb-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleManualRefresh}
                        className="text-xs text-slate-500 dark:text-slate-400"
                    >
                        <RefreshCw className="w-3.5 h-3.5 mr-2" />
                        Refresh
                    </Button>
                </div>
            )}
        </div>
    );
}