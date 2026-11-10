"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import confetti from "canvas-confetti";
import { Lightbulb, BookMarked } from "lucide-react";
import {
    Sparkles,
    ArrowRight,
    BookOpen,
    RefreshCw,
    ChevronLeft,
    CheckCircle2,
    RotateCcw,
} from "lucide-react";
import { MistakesCard } from "@/components/MistakesCard";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

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

type Tab = "needs-work" | "understood";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (p: number | number[] = 12) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};

const tap = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (type === "success") vibrate([15, 30, 15]);
    else if (type === "warning") vibrate(40);
    else vibrate(12);
};

/* ------------------------------------------------------------------ */
/*  Cache                                                             */
/* ------------------------------------------------------------------ */

const MISTAKES_CACHE_KEY = "my_mistakes_cache";
const RESOLVED_CACHE_KEY = "my_resolved_mistakes_cache";
const MISTAKES_VERSION_KEY = "my_mistakes_version";
const RESOLVED_VERSION_KEY = "my_resolved_version";
const MISTAKES_LAST_FETCH_KEY = "my_mistakes_last_fetch";
const CACHE_DURATION = 43200000;
const MIN_FETCH_INTERVAL = 60000;

let fetchInProgress = false;

const SWIPE_THRESHOLD = 120;
const SWIPE_VELOCITY = 500;

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
        } catch { }
    },
};

/* ------------------------------------------------------------------ */
/*  Confetti                                                          */
/* ------------------------------------------------------------------ */

const fireConfetti = () => {
    try {
        const end = Date.now() + 1200;
        confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            startVelocity: 45,
            scalar: 0.9,
            ticks: 180,
            colors: ["#10b981", "#34d399", "#6ee7b7", "#059669", "#a7f3d0"],
            disableForReducedMotion: true,
        });
        (function frame() {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.7 },
                colors: ["#10b981", "#34d399", "#6ee7b7"],
                disableForReducedMotion: true,
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.7 },
                colors: ["#10b981", "#34d399", "#6ee7b7"],
                disableForReducedMotion: true,
            });
            if (Date.now() < end) requestAnimationFrame(frame);
        })();
    } catch { }
};

/* ------------------------------------------------------------------ */
/*  Change detection                                                  */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Cache helpers                                                     */
/* ------------------------------------------------------------------ */

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
    } catch { }
    return [];
};

const setCachedMistakes = (data: Mistake[]) => {
    try {
        safeStorage.set(
            MISTAKES_CACHE_KEY,
            JSON.stringify({ data, timestamp: Date.now() })
        );
    } catch { }
};

const getCachedResolvedMistakes = (): Mistake[] => {
    try {
        const cached = safeStorage.get(RESOLVED_CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_DURATION) {
                return (parsed.data || []).filter(
                    (m: Mistake) => m.questions && Object.keys(m.questions).length > 0
                );
            }
        }
    } catch { }
    return [];
};

const setCachedResolvedMistakes = (data: Mistake[]) => {
    try {
        safeStorage.set(
            RESOLVED_CACHE_KEY,
            JSON.stringify({ data, timestamp: Date.now() })
        );
    } catch { }
};

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

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function InsightBlock({
    tone = "neutral",
    icon: Icon,
    label,
    children,
}: {
    tone?: "neutral" | "emerald" | "blue";
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    children: React.ReactNode;
}) {
    const toneMap = {
        neutral: {
            surface: "bg-slate-50 dark:bg-[#0d1117]",
            icon: "text-slate-400 dark:text-slate-500",
            label: "text-slate-500 dark:text-slate-400",
        },
        emerald: {
            surface: "bg-emerald-50 dark:bg-emerald-400/10",
            icon: "text-emerald-600 dark:text-emerald-400",
            label: "text-emerald-700 dark:text-emerald-400",
        },
        blue: {
            surface: "bg-blue-50 dark:bg-blue-400/10",
            icon: "text-blue-600 dark:text-blue-400",
            label: "text-blue-700 dark:text-blue-400",
        },
    }[tone];

    return (
        <div className={cn("rounded-xl p-3", toneMap.surface)}>
            <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className={cn("h-3.5 w-3.5", toneMap.icon)} />
                <span
                    className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        toneMap.label
                    )}
                >
                    {label}
                </span>
            </div>
            <div className="text-[12px] leading-relaxed text-slate-700 dark:text-slate-300">
                {children}
            </div>
        </div>
    );
}

function MistakesSkeleton() {
    return (
        <div className="w-full max-w-3xl mx-auto px-4 py-4 space-y-3 animate-pulse">
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                <div className="h-8 w-32 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-4 w-2/3 rounded bg-slate-100 dark:bg-white/[0.06]" />
            </div>
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2.5"
                >
                    <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="space-y-1.5 pt-2">
                        {[1, 2, 3, 4].map((j) => (
                            <div
                                key={j}
                                className="h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]"
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Swipe reveal                                                      */
/* ------------------------------------------------------------------ */

function SwipeReveal({
    direction,
    x,
}: {
    direction: "needs-work" | "understood";
    x: ReturnType<typeof useMotionValue<number>>;
}) {
    const leftOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
    const rightOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
    const isNeedsWork = direction === "needs-work";

    return (
        <>
            <motion.div
                style={{
                    opacity: isNeedsWork ? leftOpacity : rightOpacity,
                }}
                className={cn(
                    "absolute inset-0 rounded-2xl flex items-center px-5 pointer-events-none",
                    isNeedsWork
                        ? "justify-start bg-emerald-50 dark:bg-emerald-400/10"
                        : "justify-start bg-rose-50 dark:bg-rose-400/10"
                )}
            >
                {isNeedsWork ? (
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm">Understood</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold">
                        <RotateCcw className="h-5 w-5" />
                        <span className="text-sm">Needs Work</span>
                    </div>
                )}
            </motion.div>

            <motion.div
                style={{
                    opacity: isNeedsWork ? rightOpacity : leftOpacity,
                }}
                className={cn(
                    "absolute inset-0 rounded-2xl flex items-center justify-end px-5 pointer-events-none",
                    isNeedsWork
                        ? "bg-rose-50 dark:bg-rose-400/10"
                        : "bg-emerald-50 dark:bg-emerald-400/10"
                )}
            >
                {isNeedsWork ? (
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold">
                        <RotateCcw className="h-5 w-5" />
                        <span className="text-sm">Needs Work</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm">Understood</span>
                    </div>
                )}
            </motion.div>
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

export default function MyMistakes() {
    const navigate = useNavigate();

    const [user, setUser] = useState<any>(null);
    const [authReady, setAuthReady] = useState(false);

    const isMounted = useRef(true);
    const pendingResolves = useRef<Map<string, boolean>>(new Map());
    const scrollLockRef = useRef<number | null>(null);

    const [mistakes, setMistakes] = useState<Mistake[]>(() => getCachedMistakes());
    const [resolvedMistakes, setResolvedMistakes] = useState<Mistake[]>(() =>
        getCachedResolvedMistakes()
    );
    const [loading, setLoading] = useState(false);
    const [mistakeCount, setMistakeCount] = useState(mistakes.length);
    const [resolvedCount, setResolvedCount] = useState(resolvedMistakes.length);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isOffline, setIsOffline] = useState(
        typeof navigator !== "undefined" ? !navigator.onLine : false
    );
    const [hardError, setHardError] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("needs-work");
    const [movingIds, setMovingIds] = useState<Set<string>>(new Set());
    const [exitDirection, setExitDirection] = useState<"left" | "right">("right");

    const preserveScroll = useCallback(() => {
        if (typeof window === "undefined") return;
        const target = window.scrollY;
        scrollLockRef.current = target;
        const restore = () => {
            if (scrollLockRef.current === null) return;
            const desired = scrollLockRef.current;
            const maxScroll =
                document.documentElement.scrollHeight - window.innerHeight;
            const clamped = Math.min(desired, Math.max(0, maxScroll));
            if (Math.abs(window.scrollY - clamped) > 1) {
                window.scrollTo({ top: clamped, behavior: "instant" as ScrollBehavior });
            }
        };
        requestAnimationFrame(() => {
            restore();
            requestAnimationFrame(restore);
        });
        setTimeout(restore, 120);
        setTimeout(restore, 350);
        setTimeout(() => {
            restore();
            scrollLockRef.current = null;
        }, 500);
    }, []);

    /* Auth */
    useEffect(() => {
        let cancelled = false;
        try {
            const keys = Object.keys(localStorage).filter(
                (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
            );
            for (const key of keys) {
                try {
                    const parsed = JSON.parse(safeStorage.get(key) || "null");
                    const cachedUser =
                        parsed?.user ?? parsed?.currentSession?.user ?? null;
                    if (!cancelled && cachedUser) {
                        setUser(cachedUser);
                        break;
                    }
                } catch { }
            }
        } catch { }

        supabase.auth
            .getSession()
            .then(({ data }) => {
                if (!cancelled) setUser(data?.session?.user ?? null);
            })
            .catch(() => { })
            .finally(() => {
                if (!cancelled) setAuthReady(true);
            });

        let sub: any = null;
        try {
            const res = supabase.auth.onAuthStateChange((_event, session) => {
                if (!cancelled) setUser(session?.user ?? null);
            });
            sub = res?.data?.subscription;
        } catch { }

        return () => {
            cancelled = true;
            try {
                sub?.unsubscribe?.();
            } catch { }
        };
    }, []);

    /* Online / offline */
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

    /* Offline queue */
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
                        const updatedQueue = getOfflineQueue().filter(
                            (id) => id !== questionId
                        );
                        safeStorage.set(
                            "offlineResolved",
                            JSON.stringify(updatedQueue)
                        );
                    }
                } catch { }
            }
        } catch (err) {
            console.error("Sync offline queue failed:", err);
        }
    }, [user, getOfflineQueue]);

    /* Fetch */
    const fetchMistakes = useCallback(
        async (forceRefresh = false) => {
            if (!user || fetchInProgress) return;

            if (typeof navigator !== "undefined" && !navigator.onLine) {
                const cached = getCachedMistakes();
                const cachedResolved = getCachedResolvedMistakes();
                if (cached.length > 0 || cachedResolved.length > 0) {
                    setMistakes(cached);
                    setMistakeCount(cached.length);
                    setResolvedMistakes(cachedResolved);
                    setResolvedCount(cachedResolved.length);
                    setLoading(false);
                } else {
                    setLoading(false);
                    setHardError(true);
                }
                return;
            }

            const initialCached = getCachedMistakes();
            const initialCachedResolved = getCachedResolvedMistakes();
            const hasCache =
                initialCached.length > 0 || initialCachedResolved.length > 0;

            if (hasCache) {
                setMistakes(initialCached);
                setMistakeCount(initialCached.length);
                setResolvedMistakes(initialCachedResolved);
                setResolvedCount(initialCachedResolved.length);
                setLoading(false);
            }

            const now = Date.now();
            const lastSync = safeStorage.get(MISTAKES_LAST_FETCH_KEY);
            if (
                !forceRefresh &&
                lastSync &&
                now - parseInt(lastSync) < MIN_FETCH_INTERVAL
            ) {
                if (hasCache) {
                    setLoading(false);
                    return;
                }
            }

            fetchInProgress = true;
            if (isMounted.current) {
                if (!hasCache) setLoading(true);
                setIsRefreshing(true);
            }

            try {
                const baseSelect = `
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
                `;

                const [openRes, resolvedRes] = await Promise.all([
                    withTimeout(
                        supabase
                            .from("user_mistakes")
                            .select(baseSelect)
                            .eq("user_id", user.id)
                            .eq("resolved", false)
                            .order("last_wrong_at", { ascending: false }) as any,
                        10000
                    ),
                    withTimeout(
                        supabase
                            .from("user_mistakes")
                            .select(baseSelect)
                            .eq("user_id", user.id)
                            .eq("resolved", true)
                            .order("last_wrong_at", { ascending: false })
                            .limit(200) as any,
                        10000
                    ),
                ]);

                if (openRes.error) {
                    console.error("Supabase error (open):", openRes.error);
                    return;
                }

                if (!isMounted.current) return;

                const openMistakes = (openRes.data || []).filter(
                    (m: any) => m.questions && Object.keys(m.questions).length > 0
                );
                const resolvedList = (resolvedRes.data || []).filter(
                    (m: any) => m.questions && Object.keys(m.questions).length > 0
                );

                setMistakes(openMistakes);
                setMistakeCount(openMistakes.length);
                setCachedMistakes(openMistakes);

                setResolvedMistakes(resolvedList);
                setResolvedCount(resolvedList.length);
                setCachedResolvedMistakes(resolvedList);

                safeStorage.set(MISTAKES_LAST_FETCH_KEY, String(Date.now()));
                setHardError(false);
            } catch (err) {
                console.error("Error fetching mistakes:", err);
                const cached = getCachedMistakes();
                const cachedResolved = getCachedResolvedMistakes();
                if (
                    isMounted.current &&
                    (cached.length > 0 || cachedResolved.length > 0)
                ) {
                    setMistakes(cached);
                    setMistakeCount(cached.length);
                    setResolvedMistakes(cachedResolved);
                    setResolvedCount(cachedResolved.length);
                } else if (isMounted.current) {
                    setHardError(true);
                }
            } finally {
                fetchInProgress = false;
                if (isMounted.current) {
                    setIsRefreshing(false);
                    setLoading(false);
                }
            }
        },
        [user]
    );

    useEffect(() => {
        isMounted.current = true;
        if (!authReady) return;

        const cached = getCachedMistakes();
        const cachedResolved = getCachedResolvedMistakes();

        if (cached.length > 0 || cachedResolved.length > 0) {
            setMistakes(cached);
            setMistakeCount(cached.length);
            setResolvedMistakes(cachedResolved);
            setResolvedCount(cachedResolved.length);
            setLoading(false);
            fetchMistakes(true).catch(() => { });
        } else if (!user) {
            setLoading(false);
        } else if (typeof navigator !== "undefined" && !navigator.onLine) {
            setLoading(false);
            setHardError(true);
        } else {
            setLoading(true);
            fetchMistakes(true).catch(() => {
                if (isMounted.current) setLoading(false);
            });
        }

        if (navigator.onLine && user) {
            syncOfflineQueue().catch(() => { });
        }

        return () => {
            isMounted.current = false;
            fetchInProgress = false;
        };
    }, [authReady, user, fetchMistakes, syncOfflineQueue]);

    useEffect(() => {
        if (!authReady || !user) return;
        const cached = getCachedMistakes();
        const cachedResolved = getCachedResolvedMistakes();
        if (cached.length === 0 && cachedResolved.length === 0) {
            fetchMistakes().catch(() => { });
        }
    }, [authReady, user, fetchMistakes]);

    useEffect(() => {
        let focusTimer: ReturnType<typeof setTimeout>;
        const handleFocus = async () => {
            if (focusTimer) clearTimeout(focusTimer);
            focusTimer = setTimeout(async () => {
                if (typeof navigator !== "undefined" && !navigator.onLine) return;
                if (!isMounted.current || !user) return;
                try {
                    const hasChanges = await checkForChanges(user.id);
                    if (hasChanges) fetchMistakes(true).catch(() => { });
                } catch { }
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

    const markAsResolved = useCallback(
        (questionId: string) => {
            if (pendingResolves.current.has(questionId)) return;
            pendingResolves.current.set(questionId, true);
            setTimeout(() => pendingResolves.current.delete(questionId), 2000);

            setExitDirection("right");
            preserveScroll();

            const item = mistakes.find((m) => m.questions.id === questionId);
            const updatedOpen = mistakes.filter((m) => m.questions.id !== questionId);
            const updatedResolved = item
                ? [
                    {
                        ...item,
                        resolved: true,
                        last_wrong_at: new Date().toISOString(),
                    },
                    ...resolvedMistakes,
                ]
                : resolvedMistakes;

            setMistakes(updatedOpen);
            setMistakeCount(updatedOpen.length);
            setCachedMistakes(updatedOpen);

            setResolvedMistakes(updatedResolved);
            setResolvedCount(updatedResolved.length);
            setCachedResolvedMistakes(updatedResolved);

            fireConfetti();
            try {
                playSound("tap-correct", false);
            } catch { }

            const updateMistake = async () => {
                try {
                    if (
                        !user ||
                        (typeof navigator !== "undefined" && !navigator.onLine)
                    ) {
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
                        if (item && isMounted.current) {
                            setMistakes((prev) => [item, ...prev]);
                            setMistakeCount((prev) => prev + 1);
                            setCachedMistakes([item, ...mistakes]);
                            setResolvedMistakes((prev) =>
                                prev.filter((m) => m.questions.id !== questionId)
                            );
                            setResolvedCount((prev) => Math.max(0, prev - 1));
                            setCachedResolvedMistakes(
                                resolvedMistakes.filter(
                                    (m) => m.questions.id !== questionId
                                )
                            );
                        }
                    } else {
                        safeStorage.remove(MISTAKES_VERSION_KEY);
                        safeStorage.remove(RESOLVED_VERSION_KEY);
                    }
                } catch (err) {
                    saveToOfflineQueue(questionId);
                    console.error("Error, queued:", questionId, err);
                }
            };

            updateMistake().catch(() => { });
        },
        [mistakes, resolvedMistakes, user, saveToOfflineQueue, preserveScroll]
    );

    const reopenMistake = useCallback(
        (questionId: string) => {
            if (pendingResolves.current.has(questionId)) return;
            pendingResolves.current.set(questionId, true);
            setTimeout(() => pendingResolves.current.delete(questionId), 2000);

            setExitDirection("left");
            preserveScroll();
            setMovingIds((prev) => {
                const next = new Set(prev);
                next.add(questionId);
                return next;
            });

            const item = resolvedMistakes.find(
                (m) => m.questions.id === questionId
            );
            const updatedResolved = resolvedMistakes.filter(
                (m) => m.questions.id !== questionId
            );
            const updatedOpen = item
                ? [{ ...item, resolved: false }, ...mistakes]
                : mistakes;

            setResolvedMistakes(updatedResolved);
            setResolvedCount(updatedResolved.length);
            setCachedResolvedMistakes(updatedResolved);

            setMistakes(updatedOpen);
            setMistakeCount(updatedOpen.length);
            setCachedMistakes(updatedOpen);

            try {
                playSound("tap", false);
            } catch { }

            (async () => {
                if (
                    !user ||
                    (typeof navigator !== "undefined" && !navigator.onLine)
                )
                    return;
                try {
                    const { error } = await withTimeout(
                        supabase
                            .from("user_mistakes")
                            .update({ resolved: false })
                            .eq("user_id", user.id)
                            .eq("question_id", questionId) as any,
                        6000
                    );
                    if (error) {
                        safeStorage.remove(MISTAKES_LAST_FETCH_KEY);
                    } else {
                        safeStorage.remove(MISTAKES_VERSION_KEY);
                        safeStorage.remove(RESOLVED_VERSION_KEY);
                    }
                } catch {
                    safeStorage.remove(MISTAKES_LAST_FETCH_KEY);
                } finally {
                    setTimeout(() => {
                        setMovingIds((prev) => {
                            const next = new Set(prev);
                            next.delete(questionId);
                            return next;
                        });
                    }, 800);
                }
            })();
        },
        [mistakes, resolvedMistakes, user, preserveScroll]
    );

    const handleBack = () => {
        tap();
        navigate("/dashboard", { replace: true });
    };

    const handleManualRefresh = async () => {
        tap();
        setHardError(false);
        try {
            await fetchMistakes(true);
        } catch { }
    };

    /* ── Early returns ─────────────────────────────── */
    const coldStart =
        authReady &&
        user &&
        !loading &&
        !hardError &&
        mistakes.length === 0 &&
        resolvedMistakes.length === 0;

    if (
        (!authReady && mistakes.length === 0 && resolvedMistakes.length === 0) ||
        (loading && mistakes.length === 0 && resolvedMistakes.length === 0) ||
        coldStart
    ) {
        return (
            <Shell onBack={handleBack}>
                <MistakesSkeleton />
            </Shell>
        );
    }

    if (hardError && mistakes.length === 0 && resolvedMistakes.length === 0) {
        return (
            <Shell onBack={handleBack}>
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="h-14 w-14 rounded-full
                                    bg-slate-100 dark:bg-white/[0.06]
                                    flex items-center justify-center mb-3">
                        <RefreshCw className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        You're offline
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[240px] leading-snug">
                        Your mistakes will appear once you reconnect. Progress
                        made offline is saved.
                    </p>
                    <button
                        onClick={handleManualRefresh}
                        className="mt-4 h-10 px-4 rounded-xl
                                   bg-slate-100 dark:bg-white/[0.06]
                                   text-slate-700 dark:text-slate-200
                                   text-[12px] font-bold
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        Try again
                    </button>
                </div>
            </Shell>
        );
    }

    if (!user && mistakes.length === 0 && resolvedMistakes.length === 0 && authReady) {
        return (
            <Shell onBack={handleBack}>
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="h-14 w-14 rounded-full
                                    bg-emerald-50 dark:bg-emerald-400/10
                                    flex items-center justify-center mb-3">
                        <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        Flawless performance
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[260px] leading-snug">
                        No mistakes on record. Your clinical knowledge is
                        peaking — keep the streak alive.
                    </p>
                    <button
                        onClick={() => {
                            tap("success");
                            navigate("/Medrae-quizzes");
                        }}
                        className="mt-4 h-10 px-4 rounded-xl
                                   bg-blue-600 text-white
                                   text-[12px] font-bold
                                   active:scale-[0.97] transition-transform
                                   flex items-center gap-1.5"
                        style={{ touchAction: "manipulation" }}
                    >
                        Continue my journey
                        <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            </Shell>
        );
    }

    return (
        <Shell onBack={handleBack}>
            <div className="w-full max-w-3xl mx-auto px-4 py-4 space-y-3 safe-bottom pb-6">
                {isOffline && (
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-400/10 p-2.5
                                    flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
                            You're offline — showing saved data. Changes sync
                            when you reconnect.
                        </p>
                    </div>
                )}

                <MistakesCard />

                {/* Tabs */}
                <div className="flex items-center gap-1.5 pt-1">
                    <TabPill
                        active={activeTab === "needs-work"}
                        label="Needs work"
                        count={mistakeCount}
                        onClick={() => {
                            tap();
                            setActiveTab("needs-work");
                        }}
                    />
                    <TabPill
                        active={activeTab === "understood"}
                        label="Understood"
                        count={resolvedCount}
                        onClick={() => {
                            tap();
                            setActiveTab("understood");
                        }}
                    />
                </div>

                {/* Header card */}
                <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <div
                            className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                activeTab === "needs-work"
                                    ? "bg-amber-400/10 text-amber-600 dark:text-amber-400"
                                    : "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                            )}
                        >
                            {activeTab === "needs-work" ? (
                                <Sparkles className="h-4 w-4" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p
                                className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider leading-none mb-1",
                                    activeTab === "needs-work"
                                        ? "text-amber-700 dark:text-amber-400"
                                        : "text-emerald-700 dark:text-emerald-400"
                                )}
                            >
                                {activeTab === "needs-work"
                                    ? "Your learning space"
                                    : "Your archive"}
                            </p>
                            <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                {activeTab === "needs-work" ? (
                                    mistakeCount === 0 ? (
                                        "Everything's clear"
                                    ) : (
                                        <>
                                            {mistakeCount}{" "}
                                            {mistakeCount === 1
                                                ? "question to revisit"
                                                : "questions to revisit"}
                                        </>
                                    )
                                ) : resolvedCount === 0 ? (
                                    "Nothing understood yet"
                                ) : (
                                    <>
                                        {resolvedCount}{" "}
                                        {resolvedCount === 1
                                            ? "question mastered"
                                            : "questions mastered"}
                                    </>
                                )}
                            </h1>
                        </div>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {activeTab === "needs-work"
                            ? mistakeCount === 0
                                ? "Keep going — you're on top of everything."
                                : "Each one is a small lesson. Work through at your own pace."
                            : resolvedCount === 0
                                ? "Mark a mistake understood and it lands here for quick revision."
                                : "These are the ones you've conquered. Revisit anytime."}
                    </p>

                    {activeTab === "needs-work" && mistakeCount === 0 && (
                        <button
                            onClick={() => {
                                tap("success");
                                try {
                                    playSound("medrae", false);
                                } catch { }
                                navigate("/Medrae-quizzes");
                            }}
                            className="h-10 px-4 rounded-xl
                                       bg-blue-600 text-white
                                       text-[12px] font-bold
                                       active:scale-[0.97] transition-transform
                                       flex items-center gap-1.5 mt-1"
                            style={{ touchAction: "manipulation" }}
                        >
                            Take a new quiz
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    )}
                </section>

                {/* Cards */}
                <AnimatePresence mode="popLayout" initial={false}>
                    {activeTab === "needs-work" &&
                        mistakes.map((m, i) => (
                            <NeedsWorkRow
                                key={m.id}
                                mistake={m}
                                index={i}
                                exitDirection={exitDirection}
                                onMarkUnderstood={markAsResolved}
                            />
                        ))}
                </AnimatePresence>

                <AnimatePresence mode="popLayout" initial={false}>
                    {activeTab === "understood" &&
                        resolvedMistakes.map((m, i) => (
                            <UnderstoodRow
                                key={m.id}
                                mistake={m}
                                index={i}
                                exitDirection={exitDirection}
                                movingIds={movingIds}
                                onReopen={reopenMistake}
                            />
                        ))}
                </AnimatePresence>

                {activeTab === "understood" && resolvedMistakes.length === 0 && (
                    <div className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center space-y-2">
                        <div className="h-12 w-12 rounded-full
                                        bg-emerald-50 dark:bg-emerald-400/10
                                        flex items-center justify-center mx-auto">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                            Nothing here yet
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[260px] mx-auto leading-snug">
                            Mark a mistake understood and it'll show up here to
                            revisit.
                        </p>
                    </div>
                )}

                {/* Refresh */}
                {((activeTab === "needs-work" && mistakes.length > 0) ||
                    (activeTab === "understood" &&
                        resolvedMistakes.length > 0)) &&
                    !isRefreshing && (
                        <div className="flex justify-center pt-2">
                            <button
                                onClick={handleManualRefresh}
                                className="h-9 px-3 rounded-lg
                                           text-[11px] font-bold uppercase tracking-wider
                                           text-slate-500 dark:text-slate-400
                                           active:bg-slate-100 dark:active:bg-white/5
                                           transition-colors
                                           flex items-center gap-1.5"
                                style={{ touchAction: "manipulation" }}
                            >
                                <RefreshCw className="h-3 w-3" />
                                Refresh
                            </button>
                        </div>
                    )}
            </div>
        </Shell>
    );
}

/* ------------------------------------------------------------------ */
/*  Shell                                                             */
/* ------------------------------------------------------------------ */

function Shell({
    onBack,
    children,
}: {
    onBack: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={onBack}
                    aria-label="Go back"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate
                                   text-slate-900 dark:text-white">
                        My mistakes
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        Learn from every miss
                    </p>
                </div>
            </header>

            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                {children}
            </main>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Tab pill                                                          */
/* ------------------------------------------------------------------ */

function TabPill({
    active,
    label,
    count,
    onClick,
}: {
    active: boolean;
    label: string;
    count: number;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 h-10 rounded-xl
                        text-[12px] font-bold
                        flex items-center justify-center gap-1.5
                        active:scale-[0.97] transition-transform
                        ${active
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400"
                }`}
            style={{ touchAction: "manipulation" }}
        >
            <span>{label}</span>
            <span
                className={`text-[10px] font-bold tabular-nums
                            min-w-[20px] h-[18px] px-1.5
                            rounded-full
                            flex items-center justify-center
                            ${active
                        ? "bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-900"
                        : "bg-white dark:bg-[#0d1117] text-slate-500 dark:text-slate-400"
                    }`}
            >
                {count}
            </span>
        </button>
    );
}

/* ------------------------------------------------------------------ */
/*  Needs work row                                                    */
/* ------------------------------------------------------------------ */

function NeedsWorkRow({
    mistake: m,
    index: i,
    exitDirection,
    onMarkUnderstood,
}: {
    mistake: Mistake;
    index: number;
    exitDirection: "left" | "right";
    onMarkUnderstood: (questionId: string) => void;
}) {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-300, 0, 300], [-4, 0, 4]);

    const handleDragEnd = (_: any, info: any) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        const shouldTrigger =
            Math.abs(offset) > SWIPE_THRESHOLD ||
            Math.abs(velocity) > SWIPE_VELOCITY;
        if (!shouldTrigger) return;
        if (offset > 0 || velocity > 0) {
            vibrate(40);
            if (m.questions?.id) onMarkUnderstood(m.questions.id);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{
                opacity: 0,
                x: exitDirection === "right" ? 320 : -320,
                scale: 0.96,
                rotate: exitDirection === "right" ? 3 : -3,
            }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="relative mb-2"
        >
            <SwipeReveal direction="needs-work" x={x} />

            <motion.div
                drag="x"
                dragDirectionLock
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                dragSnapToOrigin
                onDragEnd={handleDragEnd}
                style={{ x, rotate }}
                className="relative cursor-grab active:cursor-grabbing touch-pan-y"
            >
                <article className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2.5">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider
                                      text-rose-600 dark:text-rose-400 leading-none mb-1.5">
                            Wrong {m.times_wrong}{" "}
                            {m.times_wrong === 1 ? "time" : "times"}
                        </p>
                        <h3 className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug">
                            Q{i + 1}: {m.questions?.question_text ?? "Question unavailable"}
                        </h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            Last attempt ·{" "}
                            {dayjs(m.last_wrong_at).format("DD MMM YYYY, h:mm A")}
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        {["A", "B", "C", "D"].map((letter) => {
                            const optionText =
                                m.questions?.[
                                `option_${letter.toLowerCase()}` as keyof Question
                                ] ?? "—";
                            const isCorrect = letter === m.questions?.correct_answer;
                            const isUserChoice = letter === m.user_selected;

                            return (
                                <div
                                    key={letter}
                                    className={`flex items-start justify-between gap-2
                                                rounded-xl px-2.5 py-2
                                                ${isCorrect
                                            ? "bg-emerald-50 dark:bg-emerald-400/10"
                                            : isUserChoice
                                                ? "bg-rose-50 dark:bg-rose-400/10"
                                                : "bg-slate-50 dark:bg-[#0d1117]"
                                        }`}
                                >
                                    <span
                                        className={`text-[12px] leading-snug break-words ${isCorrect
                                            ? "font-bold text-emerald-700 dark:text-emerald-400"
                                            : isUserChoice
                                                ? "font-bold text-rose-700 dark:text-rose-400"
                                                : "text-slate-700 dark:text-slate-300"
                                            }`}
                                    >
                                        <strong>{letter}.</strong> {optionText}
                                    </span>
                                    {isCorrect && (
                                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider
                                                         text-emerald-700 dark:text-emerald-400">
                                            Correct
                                        </span>
                                    )}
                                    {isUserChoice && !isCorrect && (
                                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider
                                                         text-rose-700 dark:text-rose-400">
                                            Yours
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {m.mistake_reason && (
                        <div className="rounded-xl bg-amber-50 dark:bg-amber-400/10 p-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider
                                          text-amber-700 dark:text-amber-400 mb-0.5">
                                Why you missed it
                            </p>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                                {m.mistake_reason}
                            </p>
                        </div>
                    )}

                    <InsightBlock tone="neutral" icon={BookMarked} label="Explanation">
                        {m.questions?.explanation ?? "No explanation available."}
                    </InsightBlock>

                    {m.questions?.additional && (
                        <InsightBlock tone="blue" icon={Lightbulb} label="Pro tip">
                            {m.questions.additional}
                        </InsightBlock>
                    )}

                    {m.questions?.topic && (
                        <p className="text-[10px] font-bold uppercase tracking-wider
                                      text-slate-500 dark:text-slate-400">
                            Topic · {m.questions.topic}
                        </p>
                    )}

                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => {
                            vibrate(40);
                            if (m.questions?.id) {
                                onMarkUnderstood(m.questions.id);
                            }
                        }}
                        className="w-full h-10 rounded-xl
                                   bg-emerald-600 text-white
                                   text-[12px] font-bold
                                   flex items-center justify-center gap-1.5
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark as understood
                    </button>
                </article>
            </motion.div>
        </motion.div>
    );
}

/* ------------------------------------------------------------------ */
/*  Understood row                                                    */
/* ------------------------------------------------------------------ */

function UnderstoodRow({
    mistake: m,
    index: i,
    exitDirection,
    movingIds,
    onReopen,
}: {
    mistake: Mistake;
    index: number;
    exitDirection: "left" | "right";
    movingIds: Set<string>;
    onReopen: (questionId: string) => void;
}) {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-300, 0, 300], [-4, 0, 4]);

    const handleDragEnd = (_: any, info: any) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        const shouldTrigger =
            Math.abs(offset) > SWIPE_THRESHOLD ||
            Math.abs(velocity) > SWIPE_VELOCITY;
        if (!shouldTrigger) return;
        if (offset < 0 || velocity < 0) {
            vibrate(40);
            if (m.questions?.id) onReopen(m.questions.id);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{
                opacity: 0,
                x: exitDirection === "left" ? -320 : 320,
                scale: 0.96,
                rotate: exitDirection === "left" ? -3 : 3,
            }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="relative mb-2"
        >
            <SwipeReveal direction="understood" x={x} />

            <motion.div
                drag="x"
                dragDirectionLock
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                dragSnapToOrigin
                onDragEnd={handleDragEnd}
                style={{ x, rotate }}
                className="relative cursor-grab active:cursor-grabbing touch-pan-y"
            >
                <article className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2.5">
                    <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <p className="text-[10px] font-bold uppercase tracking-wider
                                          text-emerald-700 dark:text-emerald-400 leading-none">
                                Understood
                            </p>
                        </div>
                        <h3 className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug">
                            Q{i + 1}: {m.questions?.question_text ?? "Question unavailable"}
                        </h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            Marked · {dayjs(m.last_wrong_at).format("DD MMM YYYY, h:mm A")}
                        </p>
                    </div>

                    <InsightBlock tone="emerald" icon={CheckCircle2} label="Correct answer">
                        <span className="text-[12px] text-slate-800 dark:text-slate-100">
                            <strong>{m.questions?.correct_answer}.</strong>{" "}
                            {m.questions?.[
                                `option_${m.questions?.correct_answer?.toLowerCase()}` as keyof Question
                            ] ?? "—"}
                        </span>
                    </InsightBlock>

                    {m.mistake_reason && (
                        <div className="rounded-xl bg-amber-50 dark:bg-amber-400/10 p-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider
                                          text-amber-700 dark:text-amber-400 mb-0.5">
                                Why you missed it
                            </p>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                                {m.mistake_reason}
                            </p>
                        </div>
                    )}

                    <InsightBlock tone="neutral" icon={BookMarked} label="Explanation">
                        {m.questions?.explanation ?? "No explanation available."}
                    </InsightBlock>

                    {m.questions?.additional && (
                        <InsightBlock tone="blue" icon={Lightbulb} label="Pro tip">
                            {m.questions.additional}
                        </InsightBlock>
                    )}

                    <button
                        disabled={movingIds.has(m.questions.id)}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => {
                            vibrate(40);
                            if (m.questions?.id) onReopen(m.questions.id);
                        }}
                        className="w-full h-10 rounded-xl
                                   bg-rose-50 dark:bg-rose-400/10
                                   text-rose-700 dark:text-rose-400
                                   text-[12px] font-bold
                                   flex items-center justify-center gap-1.5
                                   active:scale-[0.97] transition-transform
                                   disabled:opacity-60 disabled:cursor-wait"
                        style={{ touchAction: "manipulation" }}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {movingIds.has(m.questions.id)
                            ? "Moving…"
                            : "Move back to needs work"}
                    </button>
                </article>
            </motion.div>
        </motion.div>
    );
}