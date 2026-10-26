"use client";

import {
    ThumbsUp, Bookmark, Flag, Eye, Heart, BookmarkIcon,
    HelpCircle, CheckCircle2, Lightbulb, Stethoscope, Hash, X, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import { useStableSession } from "@/hooks/useStableSession";
// ============================================================
// TYPES
// ============================================================

interface MicroCaseCardType {
    id: string;
    title?: string;
    scenario: string;
    question: string;
    answer: string;
    explanation?: string;
    related_unit?: string;
    difficulty?: string;
    tags?: string;
    views_count: number;
    likes_count: number;
    saves_count: number;
    reports_count: number;
}

// ============================================================
// CONSTANTS
// ============================================================

const REPORT_REASONS = [
    "Inappropriate or offensive content",
    "Medical misinformation",
    "Spam or promotional",
    "Copyright violation",
    "Duplicates another case",
    "Other (please specify)",
];

// Bounded timeouts so a slow network never hangs the UI.
const RPC_TIMEOUT_MS = 7000;
const STATS_TIMEOUT_MS = 5000;

// ============================================================
// HELPERS
// ============================================================

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), ms)
        ),
    ]);
}

const useMobileDetect = () => {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);
    return isMobile;
};

// ============================================================
// DATA LAYER — three small functions
// ============================================================

/**
 * Fetch one random card the user has not interacted with.
 * Returns null if the user has interacted with every card.
 */
async function fetchUnseenCard(
    userId: string
): Promise<{ card: MicroCaseCardType | null; ok: boolean }> {
    try {
        const { data, error } = await withTimeout(
            Promise.resolve(
                supabase.rpc("get_unseen_micro_case", { p_user_id: userId })
            ),
            RPC_TIMEOUT_MS
        );

        if (error) {
            console.warn("[MicroCase] RPC error:", error.message);
            return { card: null, ok: false }; // ❌ error → not "empty"
        }
        if (!data || data.length === 0) {
            return { card: null, ok: true }; // ✅ succeeded, genuinely empty
        }
        return { card: data[0] as MicroCaseCardType, ok: true };
    } catch (err) {
        console.warn("[MicroCase] fetchUnseenCard failed:", err);
        return { card: null, ok: false }; // ❌ timeout → not "empty"
    }
}

/**
 * Fallback when the user has interacted with everything:
 * pick a random card regardless of interaction history.
 */
async function fetchRandomCard(): Promise<MicroCaseCardType | null> {
    const { data, error } = await withTimeout(
        Promise.resolve(
            supabase
                .from("micro_case_cards")
                .select("id, title, scenario, question, answer, explanation, related_unit, difficulty, tags, views_count, likes_count, saves_count, reports_count")
                .limit(50)
        ),
        RPC_TIMEOUT_MS
    );

    if (error || !data || data.length === 0) return null;
    return data[Math.floor(Math.random() * data.length)] as MicroCaseCardType;
}

/**
 * Fetch this user's like/save/report status for one card.
 * Returns null on failure so the caller can fall back gracefully.
 */
async function fetchUserStateForCard(userId: string, cardId: string) {
    try {
        const [liked, saved, reported] = await withTimeout(
            Promise.all([
                supabase
                    .from("micro_case_card_likes")
                    .select("card_id")
                    .eq("user_id", userId)
                    .eq("card_id", cardId)
                    .maybeSingle(),
                supabase
                    .from("micro_case_card_saved_reports")
                    .select("card_id")
                    .eq("user_id", userId)
                    .eq("card_id", cardId)
                    .maybeSingle(),
                supabase
                    .from("micro_case_card_reports")
                    .select("reason")
                    .eq("user_id", userId)
                    .eq("card_id", cardId)
                    .maybeSingle(),
            ]),
            STATS_TIMEOUT_MS
        );

        return {
            isLiked: !!liked.data,
            isSaved: !!saved.data,
            isReported: !!reported.data,
            reportReason: reported.data?.reason ?? null,
        };
    } catch {
        return { isLiked: false, isSaved: false, isReported: false, reportReason: null };
    }
}

// ============================================================
// COMPONENT
// ============================================================

export function MicroCaseCard({ cardId }: { cardId?: string }) {
    const { user, ready } = useStableSession();
    const isMobile = useMobileDetect();

    const [card, setCard] = useState<MicroCaseCardType | null>(null);
    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);
    const [reported, setReported] = useState(false);
    const [loading, setLoading] = useState(true);
    const [noCard, setNoCard] = useState<false | "offline" | "empty">(false);
    const [retryTick, setRetryTick] = useState(0);
    const [showReportDialog, setShowReportDialog] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [customReasonText, setCustomReasonText] = useState("");
    const [viewReportReason, setViewReportReason] = useState<{
        show: boolean;
        reason: string;
    }>({ show: false, reason: "" });
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    const tapSound =
        typeof Audio !== "undefined" ? new Audio("/sounds/tap0.mp3") : null;
    const isMounted = useRef(true);
    // Prevents duplicate view writes on React StrictMode double-mount
    // and on rapid re-renders.
    const viewedCardsRef = useRef<Set<string>>(new Set());
    // ── Load a card ──────────────────────────────────────────────
    // ── Load a card, with up to 3 retries ────────────────────────
    useEffect(() => {
        // 1. Wait for the session gate. Don't decide anything yet.
        if (!ready) return;

        // 2. Session hydration timed out AND we have no user. This is
        //    genuinely a guest OR Supabase is unreachable. Do NOT show
        //    "You're all caught up" — that's a lie. Show the skeleton
        //    forever until the session arrives, OR show offline UI.
        if (!user?.id) {
            // Give the session one more moment. If it arrives, this
            // effect will re-run (user?.id changed). If it never
            // arrives, the skeleton stays — which is honest.
            // Do NOT setNoCard("empty") here.
            setLoading(true);
            return;
        }

        isMounted.current = true;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setNoCard(false);

            const MAX_ATTEMPTS = 3;

            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                if (cancelled || !isMounted.current) return;

                try {
                    // 1. Try unseen card first.
                    const unseen = await fetchUnseenCard(user.id);

                    // If the RPC errored (network / timeout), don't
                    // interpret it as "no cards" — retry.
                    if (!unseen.ok) {
                        throw new Error("unseen fetch failed");
                    }

                    let picked = unseen.card;

                    // 2. If the RPC succeeded but returned no rows, we
                    // *could* fall back to a random card. But for now
                    // let's treat it as genuinely empty — the RPC is
                    // authoritative on "user has seen everything."
                    if (!picked) {
                        if (isMounted.current && !cancelled) {
                            setNoCard("empty");
                            setLoading(false);
                        }
                        return;
                    }

                    // 3. Fetch user's specific interaction state for this card.
                    const state = await fetchUserStateForCard(user.id, picked.id);

                    if (cancelled || !isMounted.current) return;

                    setCard({
                        ...picked,
                        views_count: picked.views_count + 1,
                    });
                    setLiked(state.isLiked);
                    setSaved(state.isSaved);
                    setReported(state.isReported);
                    setNoCard(false);
                    setLoading(false);

                    // ── Record the view ─────────────────────────────────
                    if (!viewedCardsRef.current.has(picked.id)) {
                        viewedCardsRef.current.add(picked.id);
                        supabase
                            .from("micro_case_card_views")
                            .insert({
                                user_id: user.id,
                                card_id: picked.id,
                            })
                            .then(({ error }) => {
                                if (error && error.code !== "23505") {
                                    console.warn("[MicroCase] view insert failed:", error.message);
                                }
                            });
                    }
                    return;
                } catch (err) {
                    console.warn(
                        `[MicroCase] Load attempt ${attempt}/${MAX_ATTEMPTS} failed:`,
                        err
                    );
                    if (attempt < MAX_ATTEMPTS) {
                        await new Promise((r) => setTimeout(r, attempt * 300));
                    }
                }
            }

            // All 3 attempts failed → network problem, NOT empty.
            if (isMounted.current && !cancelled) {
                setNoCard("offline");
                setLoading(false);
            }
        };

        load();

        return () => {
            cancelled = true;
            isMounted.current = false;
        };
    }, [ready, user?.id, cardId, retryTick]);

    // ── Fire-and-forget RPC helper ───────────────────────────────
    const fireRpc = useCallback((name: string, cardId: string) => {
        supabase
            .rpc(name, { card_id_param: cardId })
            .then(({ error }) => {
                if (error) console.warn(`[MicroCase] ${name} failed:`, error.message);
            })
            .catch((err) => {
                console.warn(`[MicroCase] ${name} threw:`, err);
            });
    }, []);

    // ── Like ─────────────────────────────────────────────────────
    const handleLike = useCallback(async () => {
        if (!card || !user?.id) return;
        if (tapSound && !isMobile) tapSound.play().catch(() => { });

        const newLiked = !liked;
        const prevCard = card;

        // Optimistic UI — instant.
        setLiked(newLiked);
        setCard((prev) =>
            prev
                ? {
                    ...prev,
                    likes_count: Math.max(0, prev.likes_count + (newLiked ? 1 : -1)),
                }
                : prev
        );

        try {
            if (newLiked) {
                const { error } = await supabase
                    .from("micro_case_card_likes")
                    .upsert(
                        { user_id: user.id, card_id: card.id },
                        { onConflict: "user_id,card_id" }
                    );
                if (error) throw error;
                fireRpc("increment_likes", card.id);
            } else {
                const { error } = await supabase
                    .from("micro_case_card_likes")
                    .delete()
                    .match({ user_id: user.id, card_id: card.id });
                if (error) throw error;
                fireRpc("decrement_likes", card.id);
            }
        } catch (err) {
            // Revert on failure.
            console.warn("[MicroCase] Like failed:", err);
            setLiked(!newLiked);
            setCard(prevCard);
        }
    }, [card, user?.id, liked, tapSound, isMobile, fireRpc]);

    // ── Save ─────────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        if (!card || !user?.id) return;
        if (tapSound && !isMobile) tapSound.play().catch(() => { });

        const newSaved = !saved;
        const prevCard = card;

        setSaved(newSaved);
        setCard((prev) =>
            prev
                ? {
                    ...prev,
                    saves_count: Math.max(0, prev.saves_count + (newSaved ? 1 : -1)),
                }
                : prev
        );

        try {
            if (newSaved) {
                const { error } = await supabase
                    .from("micro_case_card_saved_reports")
                    .upsert(
                        { user_id: user.id, card_id: card.id },
                        { onConflict: "user_id,card_id" }
                    );
                if (error) throw error;
                fireRpc("increment_saves", card.id);
            } else {
                const { error } = await supabase
                    .from("micro_case_card_saved_reports")
                    .delete()
                    .match({ user_id: user.id, card_id: card.id });
                if (error) throw error;
                fireRpc("decrement_saves", card.id);
            }
        } catch (err) {
            console.warn("[MicroCase] Save failed:", err);
            setSaved(!newSaved);
            setCard(prevCard);
        }
    }, [card, user?.id, saved, tapSound, isMobile, fireRpc]);

    // ── Report ───────────────────────────────────────────────────
    const submitReportWithReason = useCallback(async () => {
        if (!card || !user?.id || !reportReason.trim()) return;

        let finalReason = reportReason;
        if (customReasonText.trim()) {
            finalReason = `${reportReason}\n\nDetails: ${customReasonText.trim()}`;
        }

        setIsSubmittingReport(true);
        const prevCard = card;
        const prevReported = reported;

        setReported(true);
        setCard((prev) =>
            prev ? { ...prev, reports_count: prev.reports_count + 1 } : prev
        );

        try {
            const { error } = await supabase
                .from("micro_case_card_reports")
                .upsert(
                    { user_id: user.id, card_id: card.id, reason: finalReason },
                    { onConflict: "user_id,card_id" }
                );
            if (error) throw error;
            fireRpc("increment_reports", card.id);
        } catch (err) {
            console.warn("[MicroCase] Report failed:", err);
            setReported(prevReported);
            setCard(prevCard);
        } finally {
            setShowReportDialog(false);
            setReportReason("");
            setCustomReasonText("");
            setIsSubmittingReport(false);
        }
    }, [card, user?.id, reportReason, customReasonText, reported, fireRpc]);

    // ── Loading skeleton ─────────────────────────────────────────
    const LoadingSkeleton = useMemo(
        () => (
            <Card className="mt-4 relative overflow-hidden border-0 bg-white dark:bg-gray-900/50 rounded-xl shadow-sm animate-pulse">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-200 dark:bg-muted/50" />
                <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-muted/50 rounded-xl" />
                            <div className="space-y-2">
                                <div className="h-2 w-20 bg-gray-100 dark:bg-muted/50 rounded-full" />
                                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-full" />
                            </div>
                        </div>
                        <div className="h-6 w-16 bg-gray-100 dark:bg-muted/50 rounded-lg" />
                    </div>
                </div>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
                    <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border-0 space-y-3">
                        <div className="h-3 w-full bg-gray-200 dark:bg-muted/50 rounded-full" />
                        <div className="h-3 w-[90%] bg-gray-200 dark:bg-muted/50 rounded-full" />
                        <div className="h-3 w-[70%] bg-gray-200 dark:bg-muted/50 rounded-full" />
                    </div>

                </CardContent>
            </Card>
        ),
        []
    );

    // ── Render ───────────────────────────────────────────────────
    if (loading) return LoadingSkeleton;

    if (noCard === "offline") {
        return (
            <Card className="mt-4 bg-white dark:bg-gray-900/50 rounded-xl border-0">
                <CardContent className="py-6 flex flex-col items-center gap-3">
                    <p className="text-center text-gray-500 dark:text-gray-400 font-semibold text-sm">
                        Couldn't load the micro-case.
                    </p>
                    <button
                        onClick={() => {
                            setLoading(true);
                            setRetryTick((t) => t + 1);
                        }}
                        className="px-4 py-1.5 rounded-full bg-teal-500 text-white text-xs font-bold active:scale-95"
                    >
                        Try again
                    </button>
                </CardContent>
            </Card>
        );
    }

    if (noCard === "empty") {
        return (
            <Card className="mt-4 bg-white dark:bg-gray-900/50 rounded-xl border-0">
                <CardContent className="py-8">
                    <p className="text-center text-gray-500 dark:text-gray-400 font-semibold text-sm">
                        You're all caught up! Check back soon.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (noCard || !card) return null;

    return (
        <>
            <Card className="mt-4 relative overflow-hidden transition-all duration-300 border-0 bg-white dark:bg-gray-900/50 rounded-xl shadow-xl shadow-teal-500/5 group">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 z-20" />
                <div className="relative z-10">
                    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="p-2.5 bg-teal-500 text-white rounded-xl shadow-lg shadow-teal-500/20 flex-shrink-0">
                                    <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-[10px]   uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400 leading-none mb-1">
                                        Micro Case Study
                                    </h2>
                                    <CardTitle className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-gray-100 break-words whitespace-normal">
                                        {card.title || "Clinical Scenario"}
                                    </CardTitle>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                {card.related_unit && (
                                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-none font-bold text-[10px] px-2 py-0.5 rounded-md">
                                        {card.related_unit}
                                    </Badge>
                                )}
                                {card.difficulty && (
                                    <Badge
                                        className={`text-[9px] uppercase   border-none px-2 py-0.5 rounded-md ${card.difficulty.toLowerCase() === "hard"
                                            ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300"
                                            : card.difficulty.toLowerCase() === "medium"
                                                ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300"
                                                : "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300"
                                            }`}
                                    >
                                        {card.difficulty}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
                        <div className="p-4 sm:p-5 bg-white/50 dark:bg-gray-800/30 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                                <Eye className="w-4 h-4" />
                                <span className="text-[10px]   uppercase tracking-widest">
                                    The Patient Situation
                                </span>
                            </div>
                            <p className="text-sm sm:text-base leading-relaxed font-medium text-gray-800 dark:text-gray-200 italic">
                                "{card.scenario}"
                            </p>
                        </div>

                        <div className="p-4 sm:p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                                <HelpCircle className="w-4 h-4" />
                                <span className="text-[10px]   uppercase tracking-widest">
                                    Critical Question
                                </span>
                            </div>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {card.question}
                            </p>
                        </div>

                        <div className="p-4 sm:p-5 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-[10px]   uppercase tracking-widest">
                                    Correct Response
                                </span>
                            </div>
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                {card.answer}
                            </p>
                        </div>

                        {card.explanation && (
                            <div className="p-4 sm:p-5 bg-amber-50/30 dark:bg-amber-900/10 rounded-2xl">
                                <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-500">
                                    <Lightbulb className="w-4 h-4" />
                                    <span className="text-[10px]   uppercase tracking-widest">
                                        Clinical Rationale
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm leading-relaxed text-gray-600 dark:text-gray-400 font-medium">
                                    {card.explanation}
                                </p>
                            </div>
                        )}

                        {card.tags && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {card.tags.split(",").slice(0, 5).map((tag) => (
                                    <div
                                        key={tag}
                                        className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full uppercase tracking-tight"
                                    >
                                        <Hash className="w-2.5 h-2.5" />
                                        {tag.trim()}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="pt-4 sm:pt-6 flex items-center justify-between gap-1.5 sm:gap-3">
                            {/* Left group — Like · Save · Report, each with its own count */}
                            <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                                <button
                                    onClick={handleLike}
                                    className={`flex items-center justify-center gap-1 sm:gap-1.5 h-9 sm:h-10 px-2 sm:px-3 rounded-full transition-all active:scale-95 text-[11px] sm:text-xs font-bold whitespace-nowrap ${liked
                                        ? "bg-blue-500 text-white shadow-md shadow-blue-500/25"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                                        }`}
                                    aria-label="Like"
                                >
                                    <ThumbsUp
                                        size={14}
                                        fill={liked ? "currentColor" : "none"}
                                    />
                                    <span className="tabular-nums">{card.likes_count}</span>
                                </button>

                                <button
                                    onClick={handleSave}
                                    className={`flex items-center justify-center gap-1 sm:gap-1.5 h-9 sm:h-10 px-2 sm:px-3 rounded-full transition-all active:scale-95 text-[11px] sm:text-xs font-bold whitespace-nowrap ${saved
                                        ? "bg-green-500 text-white shadow-md shadow-green-500/25"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                                        }`}
                                    aria-label="Save"
                                >
                                    <Bookmark size={14} fill={saved ? "currentColor" : "none"} />
                                    <span className="tabular-nums">{card.saves_count}</span>
                                </button>

                                <button
                                    onClick={() =>
                                        reported
                                            ? setViewReportReason({
                                                show: true,
                                                reason:
                                                    "You have already reported this case. Thank you.",
                                            })
                                            : setShowReportDialog(true)
                                    }
                                    title={reported ? "View Report Reason" : "Report Issue"}
                                    className={`flex items-center justify-center gap-1 sm:gap-1.5 h-9 sm:h-10 px-2 sm:px-3 rounded-full transition-all active:scale-95 text-[11px] sm:text-xs font-bold whitespace-nowrap ${reported
                                        ? "bg-rose-500 text-white shadow-md shadow-rose-500/25"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500"
                                        }`}
                                    aria-label="Report"
                                >
                                    <Flag size={14} fill={reported ? "currentColor" : "none"} />
                                    <span className="tabular-nums">{card.reports_count}</span>
                                </button>
                            </div>

                            {/* Right side — View count only */}
                            <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 h-9 sm:h-10 bg-slate-100 dark:bg-gray-800/50 rounded-full flex-shrink-0">
                                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                                <span className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-bold tabular-nums">
                                    {card.views_count}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </div>
            </Card>

            {/* Report Dialog */}
            {showReportDialog && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowReportDialog(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                                    <Flag className="w-5 h-5 text-rose-500" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    Report Micro-Case
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    setShowReportDialog(false);
                                    setCustomReasonText("");
                                    setReportReason("");
                                }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Select a reason and optionally add details:
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Reason for reporting *
                                </label>
                                <Select value={reportReason} onValueChange={setReportReason}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a reason..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {REPORT_REASONS.map((reason) => (
                                            <SelectItem key={reason} value={reason}>
                                                {reason}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Additional details (Optional)
                                </label>
                                <textarea
                                    value={customReasonText}
                                    onChange={(e) => setCustomReasonText(e.target.value)}
                                    placeholder="Please provide more context about your report..."
                                    className="w-full px-3 py-2 border-0 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-transparent resize-none"
                                    rows={4}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Your feedback helps us improve content quality.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 mt-6">
                            <Button
                                onClick={() => {
                                    setShowReportDialog(false);
                                    setCustomReasonText("");
                                    setReportReason("");
                                }}
                                variant="outline"
                                className="flex-1 order-2 sm:order-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={submitReportWithReason}
                                disabled={!reportReason.trim() || isSubmittingReport}
                                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white order-1 sm:order-2"
                            >
                                {isSubmittingReport ? "Submitting..." : "Submit Report"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Report Dialog */}
            {viewReportReason.show && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setViewReportReason({ show: false, reason: "" })}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl border-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                                    <AlertCircle className="w-5 h-5 text-rose-500" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    Report Details
                                </h3>
                            </div>
                            <button
                                onClick={() => setViewReportReason({ show: false, reason: "" })}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border-0">
                            <p className="text-gray-700 dark:text-gray-300 font-medium whitespace-pre-wrap">
                                {viewReportReason.reason}
                            </p>
                        </div>

                        <Button
                            onClick={() => setViewReportReason({ show: false, reason: "" })}
                            className="w-full mt-6 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                            Close
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}