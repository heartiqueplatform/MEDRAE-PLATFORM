// src/pages/MyMistakes.tsx
"use client";

import React, {
    useEffect,
    useState,
    useCallback,
    useRef,
    useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useUserRole } from "@/context/UserRoleContext";
import { ChevronLeft, RefreshCw, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { playSound } from "@/lib/soundManager";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { MistakesCard } from "@/components/MistakesCard";
import { MistakesListSkeleton } from "@/components/mistakes/MistakesListSkeleton";
import { InstitutionFilter } from "@/components/mistakes/InstitutionFilter";
import { MistakeRow, type Mistake, type Tab } from "@/components/mistakes/MistakeRow";
import { getCopy, type MistakesMode } from "@/lib/mistakes/roleCopy";
import {
    CACHE_KEYS,
    readEnvelope,
    writeEnvelope,
    readCachedInstitution,
    clearMistakesCache,
} from "@/lib/mistakes/mistakesCache";

const BATCH_SIZE = 25;

const vibrate = (p: number | number[] = 12) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};
const fireConfetti = () => {
    try {
        confetti({
            particleCount: 25,
            spread: 50,
            origin: { y: 0.6 },
            startVelocity: 35,
            scalar: 0.8,
            ticks: 120,
            colors: ["#10b981", "#34d399", "#6ee7b7"],
            disableForReducedMotion: true,
        });
    } catch { }
};
type FetchResult = { rows: Mistake[]; total: number; hasMore: boolean };

export default function MyMistakes() {
    const navigate = useNavigate();
    const { role } = useUserRole();
    const mode: MistakesMode = role === "tutor" ? "tutor" : "student";
    const copy = useMemo(() => getCopy(mode), [mode]);

    const [user, setUser] = useState<any>(null);
    const [authReady, setAuthReady] = useState(false);
    const [institution, setInstitution] = useState<string | null>(() => readCachedInstitution());

    const [openRows, setOpenRows] = useState<Mistake[]>([]);
    const [resolvedRows, setResolvedRows] = useState<Mistake[]>([]);
    const [openTotal, setOpenTotal] = useState(0);
    const [resolvedTotal, setResolvedTotal] = useState(0);
    const [openOffset, setOpenOffset] = useState(0);
    const [resolvedOffset, setResolvedOffset] = useState(0);
    const [openDone, setOpenDone] = useState(false);
    const [resolvedDone, setResolvedDone] = useState(false);

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [hardError, setHardError] = useState(false);
    const [offline, setOffline] = useState(
        typeof navigator !== "undefined" ? !navigator.onLine : false
    );
    const [activeTab, setActiveTab] = useState<Tab>("needs-work");
    const [exitDirection, setExitDirection] = useState<"left" | "right">("right");
    const [movingIds, setMovingIds] = useState<Set<string>>(new Set());

    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const isMounted = useRef(true);
    const loadingMoreRef = useRef(false);
    const requestIdRef = useRef(0);

    /* ── auth ── */
    useEffect(() => {
        let cancelled = false;
        supabase.auth
            .getSession()
            .then(({ data }) => {
                if (!cancelled) setUser(data?.session?.user ?? null);
            })
            .finally(() => {
                if (!cancelled) setAuthReady(true);
            });
        const sub = supabase.auth.onAuthStateChange((_e, s) => {
            if (!cancelled) setUser(s?.user ?? null);
        }).data?.subscription;
        return () => {
            cancelled = true;
            sub?.unsubscribe?.();
        };
    }, []);

    useEffect(() => {
        const on = () => setOffline(false);
        const off = () => setOffline(true);
        window.addEventListener("online", on);
        window.addEventListener("offline", off);
        return () => {
            window.removeEventListener("online", on);
            window.removeEventListener("offline", off);
        };
    }, []);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    /* ── fetch one page ── */
    const fetchPage = useCallback(
        async (resolved: boolean, offset: number): Promise<FetchResult> => {
            const inst = mode === "tutor" ? institution : null;

            // Primary: RPC
            try {
                const { data, error } = await supabase.rpc("get_cohort_mistakes", {
                    p_institution: inst,
                    p_user_id: mode === "student" ? user?.id ?? null : null,
                    p_limit: BATCH_SIZE,
                    p_offset: offset,
                    p_resolved: resolved,
                });
                if (!error && Array.isArray(data)) {
                    const rows = data.map((r: any) => ({
                        id: r.id,
                        times_wrong: r.times_wrong,
                        first_wrong_at: r.first_wrong_at,
                        last_wrong_at: r.last_wrong_at,
                        resolved: r.resolved,
                        quiz_id: r.quiz_id,
                        user_id: r.user_id,
                        user_selected: r.user_selected ?? null,
                        mistake_reason: r.mistake_reason,
                        questions: r.questions ?? r.question,
                    })) as Mistake[];
                    const total = Number(data[0]?.total_count ?? rows.length);
                    return { rows, total, hasMore: offset + rows.length < total };
                }
            } catch {
                /* fall through */
            }

            // Fallback: direct join
            let q = supabase
                .from("user_mistakes")
                .select(
                    `id, times_wrong, first_wrong_at, last_wrong_at, resolved, quiz_id, user_id, user_selected, mistake_reason,
                     questions:question_id (id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, additional, topic, difficulty),
                     profiles!inner(institution)`,
                    { count: "exact" }
                )
                .eq("resolved", resolved)
                .order("last_wrong_at", { ascending: false })
                .range(offset, offset + BATCH_SIZE - 1);

            if (mode === "student" && user) q = q.eq("user_id", user.id);
            if (mode === "tutor" && inst) q = q.eq("profiles.institution", inst);

            const { data, error, count } = await q;
            if (error) throw error;

            const rows = ((data ?? []) as any[])
                .filter((m) => m.questions && Object.keys(m.questions).length > 0)
                .map((m) => ({ ...m, user_selected: m.user_selected ?? null })) as Mistake[];
            const total = count ?? rows.length;
            return { rows, total, hasMore: offset + rows.length < total };
        },
        [mode, institution, user]
    );

    /* ── initial load ── */
    useEffect(() => {
        if (!authReady) return;
        if (mode === "student" && !user) {
            setLoading(false);
            return;
        }

        const myId = ++requestIdRef.current;
        const cacheKey = activeTab === "needs-work" ? CACHE_KEYS.open : CACHE_KEYS.resolved;
        const scope = mode === "tutor" ? institution : null;
        const cached = readEnvelope<Mistake[]>(cacheKey);

        let hadCache = false;
        if (cached && cached.institution === scope) {
            hadCache = true;
            if (activeTab === "needs-work") {
                setOpenRows(cached.data);
                setOpenTotal(cached.data.length);
                setOpenOffset(cached.data.length);
                setOpenDone(cached.data.length < BATCH_SIZE);
            } else {
                setResolvedRows(cached.data);
                setResolvedTotal(cached.data.length);
                setResolvedOffset(cached.data.length);
                setResolvedDone(cached.data.length < BATCH_SIZE);
            }
            setLoading(false);
        } else {
            setLoading(true);
            if (activeTab === "needs-work") {
                setOpenRows([]);
                setOpenTotal(0);
                setOpenOffset(0);
                setOpenDone(false);
            } else {
                setResolvedRows([]);
                setResolvedTotal(0);
                setResolvedOffset(0);
                setResolvedDone(false);
            }
        }

        if (offline) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const { rows, total, hasMore } = await fetchPage(activeTab === "understood", 0);
                if (cancelled || !isMounted.current || myId !== requestIdRef.current) return;
                if (activeTab === "needs-work") {
                    setOpenRows(rows);
                    setOpenTotal(total);
                    setOpenOffset(rows.length);
                    setOpenDone(!hasMore);
                } else {
                    setResolvedRows(rows);
                    setResolvedTotal(total);
                    setResolvedOffset(rows.length);
                    setResolvedDone(!hasMore);
                }
                writeEnvelope(cacheKey, rows, scope);
                setHardError(false);
            } catch {
                if (isMounted.current && myId === requestIdRef.current && !hadCache) {
                    setHardError(true);
                }
            } finally {
                if (isMounted.current && myId === requestIdRef.current) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authReady, user, activeTab, institution, mode]);

    /* ── infinite scroll ── */
    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return;

        const io = new IntersectionObserver(
            async (entries) => {
                if (!entries[0]?.isIntersecting) return;
                if (loadingMoreRef.current || loading) return;

                const isOpen = activeTab === "needs-work";
                if (isOpen && openDone) return;
                if (!isOpen && resolvedDone) return;

                loadingMoreRef.current = true;
                setLoadingMore(true);
                const myId = requestIdRef.current;

                try {
                    const offset = isOpen ? openOffset : resolvedOffset;
                    const { rows, total, hasMore } = await fetchPage(!isOpen, offset);
                    if (!isMounted.current || myId !== requestIdRef.current) return;
                    if (rows.length === 0) {
                        if (isOpen) setOpenDone(true);
                        else setResolvedDone(true);
                        return;
                    }
                    const scope = mode === "tutor" ? institution : null;
                    if (isOpen) {
                        setOpenRows((prev) => {
                            const seen = new Set(prev.map((r) => r.id));
                            const merged = [...prev, ...rows.filter((r) => !seen.has(r.id))];
                            writeEnvelope(CACHE_KEYS.open, merged, scope);
                            return merged;
                        });
                        setOpenOffset(offset + rows.length);
                        setOpenDone(!hasMore);
                        setOpenTotal(total);
                    } else {
                        setResolvedRows((prev) => {
                            const seen = new Set(prev.map((r) => r.id));
                            const merged = [...prev, ...rows.filter((r) => !seen.has(r.id))];
                            writeEnvelope(CACHE_KEYS.resolved, merged, scope);
                            return merged;
                        });
                        setResolvedOffset(offset + rows.length);
                        setResolvedDone(!hasMore);
                        setResolvedTotal(total);
                    }
                } catch {
                    /* silent */
                } finally {
                    loadingMoreRef.current = false;
                    if (isMounted.current && myId === requestIdRef.current) {
                        setLoadingMore(false);
                    }
                }
            },
            { rootMargin: "300px" }
        );

        io.observe(node);
        return () => io.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        activeTab,
        openOffset,
        resolvedOffset,
        openDone,
        resolvedDone,
        loading,
        fetchPage,
        mode,
        institution,
    ]);

    /* ── OPTIMISTIC actions ──
       These move a row from one tab to the other WITHOUT a page reload.
       The exitDirection triggers the slide animation, and the row lands
       in the other tab. Then we sync with Supabase in the background. */

    const markResolved = useCallback(
        async (questionId: string) => {
            vibrate(40);
            if (mode !== "student" || !user) return;

            const item = openRows.find((m) => m.questions.id === questionId);
            if (!item) return;

            // Trigger exit animation toward the "understood" direction
            setExitDirection("right");
            setMovingIds((prev) => new Set(prev).add(questionId));
            // 🎉 Reward feedback
            fireConfetti();
            try {
                playSound("tap-correct", false);
            } catch { }
            // Animate out of `needs-work`, into `understood`
            setOpenRows((prev) => prev.filter((m) => m.questions.id !== questionId));
            setOpenTotal((t) => Math.max(0, t - 1));
            const moved = { ...item, resolved: true, last_wrong_at: new Date().toISOString() };
            setResolvedRows((prev) => [moved, ...prev]);
            setResolvedTotal((t) => t + 1);

            try {
                const { error } = await supabase
                    .from("user_mistakes")
                    .update({ resolved: true })
                    .eq("user_id", user.id)
                    .eq("question_id", questionId);
                if (error) throw error;
                clearMistakesCache();
            } catch {
                // rollback
                setOpenRows((prev) => [item, ...prev]);
                setOpenTotal((t) => t + 1);
                setResolvedRows((prev) => prev.filter((m) => m.questions.id !== questionId));
                setResolvedTotal((t) => Math.max(0, t - 1));
                try {
                    playSound("tap-wrong", false);
                } catch { }
            } finally {
                setTimeout(() => {
                    setMovingIds((prev) => {
                        const next = new Set(prev);
                        next.delete(questionId);
                        return next;
                    });
                }, 600);
            }
        },
        [mode, user, openRows]
    );

    const reopen = useCallback(
        async (questionId: string) => {
            vibrate(40);
            if (mode !== "student" || !user) return;

            const item = resolvedRows.find((m) => m.questions.id === questionId);
            if (!item) return;

            setExitDirection("left");
            setMovingIds((prev) => new Set(prev).add(questionId));
            try {
                playSound("tap", false);
            } catch { }
            setResolvedRows((prev) => prev.filter((m) => m.questions.id !== questionId));
            setResolvedTotal((t) => Math.max(0, t - 1));
            const moved = { ...item, resolved: false };
            setOpenRows((prev) => [moved, ...prev]);
            setOpenTotal((t) => t + 1);

            try {
                const { error } = await supabase
                    .from("user_mistakes")
                    .update({ resolved: false })
                    .eq("user_id", user.id)
                    .eq("question_id", questionId);
                if (error) throw error;
                clearMistakesCache();
            } catch {
                setResolvedRows((prev) => [item, ...prev]);
                setResolvedTotal((t) => t + 1);
                setOpenRows((prev) => prev.filter((m) => m.questions.id !== questionId));
                setOpenTotal((t) => Math.max(0, t - 1));
            } finally {
                setTimeout(() => {
                    setMovingIds((prev) => {
                        const next = new Set(prev);
                        next.delete(questionId);
                        return next;
                    });
                }, 600);
            }
        },
        [mode, user, resolvedRows]
    );

    const manualRefresh = useCallback(async () => {
        vibrate();
        setRefreshing(true);
        clearMistakesCache();
        try {
            const { rows, total, hasMore } = await fetchPage(activeTab === "understood", 0);
            if (activeTab === "needs-work") {
                setOpenRows(rows);
                setOpenTotal(total);
                setOpenOffset(rows.length);
                setOpenDone(!hasMore);
            } else {
                setResolvedRows(rows);
                setResolvedTotal(total);
                setResolvedOffset(rows.length);
                setResolvedDone(!hasMore);
            }
            setHardError(false);
        } catch {
            /* silent */
        } finally {
            setRefreshing(false);
        }
    }, [activeTab, fetchPage]);

    const back = () => {
        vibrate();
        navigate(mode === "tutor" ? "/dashboard/tutor" : "/dashboard/student", { replace: true });
    };

    const activeRows = activeTab === "needs-work" ? openRows : resolvedRows;
    const activeTotal = activeTab === "needs-work" ? openTotal : resolvedTotal;
    const activeDone = activeTab === "needs-work" ? openDone : resolvedDone;
    const coldStart =
        authReady &&
        !loading &&
        !hardError &&
        openRows.length === 0 &&
        resolvedRows.length === 0 &&
        openTotal === 0 &&
        resolvedTotal === 0;

    if ((!authReady && openRows.length === 0) || (loading && activeRows.length === 0)) {
        return (
            <Shell copy={copy} onBack={back}>
                <MistakesListSkeleton tabs headerCard />
            </Shell>
        );
    }

    if (hardError && openRows.length === 0 && resolvedRows.length === 0) {
        return (
            <Shell copy={copy} onBack={back}>
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center mb-3">
                        <RefreshCw className="h-6 w-6 text-slate-400" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">{copy.offlineTitle}</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[240px]">{copy.offlineDesc}</p>
                    <button
                        onClick={manualRefresh}
                        className="mt-4 h-10 px-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-[12px] font-bold"
                    >
                        {copy.refresh}
                    </button>
                </div>
            </Shell>
        );
    }

    if (coldStart && mode === "student") {
        return (
            <Shell copy={copy} onBack={back}>
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-400/10 flex items-center justify-center mb-3">
                        <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">{copy.emptyFlawlessTitle}</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[260px]">{copy.emptyFlawlessDesc}</p>
                    <button
                        onClick={() => navigate("/Medrae-quizzes")}
                        className="mt-4 h-10 px-2 rounded-xl bg-blue-600 text-white text-[12px] font-bold flex items-center gap-1.5"
                    >
                        {copy.continueJourney} <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            </Shell>
        );
    }

    return (
        <Shell copy={copy} onBack={back}>
            <div className="w-full max-w-3xl mx-auto px-2 py-4 space-y-3 safe-bottom pb-6">
                {offline && (
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-400/10 p-2.5 flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">{copy.offlineDesc}</p>
                    </div>
                )}

                {mode === "tutor" && (
                    <InstitutionFilter value={institution} onChange={setInstitution} />
                )}

                {mode === "tutor" ? (
                    <MistakesCard institution={institution} mode="tutor" />
                ) : (
                    <MistakesCard mode="student" />
                )}

                <div className="flex items-center gap-1.5 pt-1">
                    <TabPill
                        active={activeTab === "needs-work"}
                        label={copy.tabNeedsWork}
                        count={openTotal}
                        onClick={() => setActiveTab("needs-work")}
                    />
                    <TabPill
                        active={activeTab === "understood"}
                        label={copy.tabUnderstood}
                        count={resolvedTotal}
                        onClick={() => setActiveTab("understood")}
                    />
                </div>

                <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <div
                            className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                activeTab === "needs-work"
                                    ? "bg-amber-400/10 text-amber-600"
                                    : "bg-emerald-400/10 text-emerald-600"
                            )}
                        >
                            {activeTab === "needs-work" ? (
                                <Sparkles className="h-4 w-4" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider leading-none mb-1 text-slate-500">
                                {activeTab === "needs-work"
                                    ? copy.headerNeedsWorkLabel
                                    : copy.headerUnderstoodLabel}
                            </p>
                            <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                {activeTab === "needs-work"
                                    ? activeTotal === 0
                                        ? copy.headerNeedsWorkEmpty
                                        : `${activeTotal} ${activeTotal === 1
                                            ? copy.headerNeedsWorkCountOne
                                            : copy.headerNeedsWorkCountMany
                                        }`
                                    : activeTotal === 0
                                        ? copy.headerUnderstoodEmpty
                                        : `${activeTotal} ${activeTotal === 1
                                            ? copy.headerUnderstoodCountOne
                                            : copy.headerUnderstoodCountMany
                                        }`}
                            </h1>
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {activeTab === "needs-work"
                            ? activeTotal === 0
                                ? copy.headerNeedsWorkEmptyDesc
                                : copy.headerNeedsWorkDesc
                            : activeTotal === 0
                                ? copy.headerUnderstoodEmptyDesc
                                : copy.headerUnderstoodDesc}
                    </p>
                </section>

                {/* Swipeable rows with slide-in/out animations */}
                <AnimatePresence mode="popLayout" initial={false}>
                    {activeRows.map((m, i) => (
                        <MistakeRow
                            key={m.id}
                            mistake={m}
                            index={i}
                            copy={copy}
                            mode={mode}
                            activeTab={activeTab}
                            exitDirection={exitDirection}
                            movingIds={movingIds}
                            onMarkUnderstood={markResolved}
                            onReopen={reopen}
                        />
                    ))}
                </AnimatePresence>

                <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                    {loadingMore && (
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                            <RefreshCw className="h-3 w-3 animate-spin" /> Loading…
                        </div>
                    )}
                    {!loadingMore && activeDone && activeRows.length > 0 && (
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">End of list</p>
                    )}
                </div>

                {activeRows.length === 0 && !loading && (
                    <div className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center space-y-2">
                        <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                            {activeTab === "needs-work"
                                ? copy.headerNeedsWorkEmpty
                                : copy.understoodTabEmptyTitle}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[260px] mx-auto">
                            {activeTab === "needs-work"
                                ? copy.headerNeedsWorkEmptyDesc
                                : copy.understoodTabEmptyDesc}
                        </p>
                    </div>
                )}

                {activeRows.length > 0 && !refreshing && (
                    <div className="flex justify-center pt-2">
                        <button
                            onClick={manualRefresh}
                            className="h-9 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
                        >
                            <RefreshCw className="h-3 w-3" />
                            {copy.refresh}
                        </button>
                    </div>
                )}
            </div>
        </Shell>
    );
}

function Shell({
    onBack,
    children,
    copy,
}: {
    onBack: () => void;
    children: React.ReactNode;
    copy: ReturnType<typeof getCopy>;
}) {
    return (
        <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
            <header className="shrink-0 flex items-center gap-2 px-2 h-14 bg-white dark:bg-[#0d1117] border-b border-slate-200/70 dark:border-white/[0.06] z-30 safe-top">
                <button
                    onClick={onBack}
                    className="h-10 w-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200"
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
                        {copy.shellTitle}
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {copy.shellSubtitle}
                    </p>
                </div>
            </header>
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">{children}</main>
        </div>
    );
}

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
            className={`flex-1 h-10 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform ${active
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400"
                }`}
        >
            <span>{label}</span>
            <span
                className={`text-[10px] font-bold tabular-nums min-w-[20px] h-[18px] px-1.5 rounded-full flex items-center justify-center ${active
                    ? "bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-900"
                    : "bg-white dark:bg-[#0d1117] text-slate-500 dark:text-slate-400"
                    }`}
            >
                {count}
            </span>
        </button>
    );
}