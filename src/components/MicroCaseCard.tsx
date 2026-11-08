"use client";

import {
    ThumbsUp, Bookmark, Flag, Eye,
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
import { supabase } from "@/lib/supabaseClient";
import { useStableSession } from "@/hooks/useStableSession";
import MicroCaseComments from "@/components/MicroCase/MicroCaseComments";
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

interface MicroCaseCardProps {
    cardId?: string;
    onLoaded?: (cardId: string) => void;
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
// DATA LAYER
// ============================================================
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
            return { card: null, ok: false };
        }
        if (!data || data.length === 0) {
            return { card: null, ok: true };
        }
        return { card: data[0] as MicroCaseCardType, ok: true };
    } catch (err) {
        console.warn("[MicroCase] fetchUnseenCard failed:", err);
        return { card: null, ok: false };
    }
}

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
// SECTION STYLES — GitHub dark mode palette
// Light: solid -50 bg, -950 text (dark on light)
// Dark:  #0d1117-adjacent deep tints, #e6edf3 text (light on dark)
// ============================================================
const SECTION_STYLES = {
    scenario: {
        bg: "bg-slate-50 dark:bg-[#161b22]",
        accent: "border-l-4 border-l-slate-400 dark:border-l-[#30363d]",
        label: "text-slate-700 dark:text-[#8b949e]",
        text: "text-slate-900 dark:text-[#e6edf3]",
    },
    question: {
        bg: "bg-blue-50 dark:bg-[#0d1c2e]",
        accent: "border-l-4 border-l-blue-400 dark:border-l-blue-700",
        label: "text-blue-700 dark:text-blue-400",
        text: "text-blue-950 dark:text-[#e6edf3]",
    },
    answer: {
        bg: "bg-emerald-50 dark:bg-[#0d2018]",
        accent: "border-l-4 border-l-emerald-500 dark:border-l-emerald-700",
        label: "text-emerald-700 dark:text-emerald-400",
        text: "text-emerald-950 dark:text-[#e6edf3]",
    },
    rationale: {
        bg: "bg-amber-50 dark:bg-[#241d0b]",
        accent: "border-l-4 border-l-amber-500 dark:border-l-amber-700",
        label: "text-amber-800 dark:text-amber-400",
        text: "text-amber-950 dark:text-[#e6edf3]",
    },
} as const;

// ============================================================
// COMPONENT
// ============================================================
export function MicroCaseCard({ cardId, onLoaded }: MicroCaseCardProps = {}) {
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
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [commentsCountState, setCommentsCountState] = useState(0);
    const tapSound =
        typeof Audio !== "undefined" ? new Audio("/sounds/tap0.mp3") : null;
    const isMounted = useRef(true);
    const viewedCardsRef = useRef<Set<string>>(new Set());

    // ── Load a card ──────────────────────────────────────────
    useEffect(() => {
        if (!ready) return;
        if (!user?.id) {
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
                    let picked: MicroCaseCardType | null = null;
                    if (cardId) {
                        const { data, error } = await withTimeout(
                            Promise.resolve(
                                supabase
                                    .from("micro_case_cards")
                                    .select("id, title, scenario, question, answer, explanation, related_unit, difficulty, tags, views_count, likes_count, saves_count, reports_count")
                                    .eq("id", cardId)
                                    .maybeSingle()
                            ),
                            RPC_TIMEOUT_MS
                        );
                        if (error) throw error;
                        picked = (data as MicroCaseCardType) ?? null;
                    } else {
                        const unseen = await fetchUnseenCard(user.id);
                        if (!unseen.ok) throw new Error("unseen fetch failed");
                        picked = unseen.card;
                    }

                    if (!picked) {
                        if (isMounted.current && !cancelled) {
                            setNoCard("empty");
                            setLoading(false);
                        }
                        return;
                    }

                    const state = await fetchUserStateForCard(user.id, picked.id);
                    if (cancelled || !isMounted.current) return;

                    setCard({
                        ...picked,
                        views_count: picked.views_count + 1,
                    });
                    setCommentsCountState((picked as any).comments_count ?? 0);
                    setLiked(state.isLiked);
                    setSaved(state.isSaved);
                    setReported(state.isReported);
                    setNoCard(false);
                    setLoading(false);

                    onLoaded?.(picked.id);

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
    }, [ready, user?.id, cardId, retryTick, onLoaded]);

    // ── Fire-and-forget RPC helper ───────────────────────────
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

    // ── Like ─────────────────────────────────────────────────
    const handleLike = useCallback(async () => {
        if (!card || !user?.id) return;
        if (tapSound && !isMobile) tapSound.play().catch(() => { });

        const newLiked = !liked;
        const prevCard = card;

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
            console.warn("[MicroCase] Like failed:", err);
            setLiked(!newLiked);
            setCard(prevCard);
        }
    }, [card, user?.id, liked, tapSound, isMobile, fireRpc]);

    // ── Save ─────────────────────────────────────────────────
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

    // ── Report ───────────────────────────────────────────────
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

    // ── Loading skeleton ─────────────────────────────────────
    const LoadingSkeleton = useMemo(
        () => (
            <Card className="relative overflow-hidden border-0 bg-white dark:bg-[#0d1117] rounded-2xl animate-pulse mb-3">
                <div className="px-3 pt-3 pb-2">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-[#161b22] rounded-xl" />
                            <div className="space-y-2">
                                <div className="h-2 w-20 bg-gray-100 dark:bg-[#161b22] rounded-full" />
                                <div className="h-4 w-32 bg-gray-200 dark:bg-[#21262d] rounded-full" />
                            </div>
                        </div>
                        <div className="h-6 w-16 bg-gray-100 dark:bg-[#161b22] rounded-lg" />
                    </div>
                </div>
                <CardContent className="px-3 pb-4 space-y-3">
                    <div className="p-3 bg-slate-50 dark:bg-[#161b22] rounded-xl space-y-2">
                        <div className="h-3 w-full bg-gray-200 dark:bg-[#21262d] rounded-full" />
                        <div className="h-3 w-[90%] bg-gray-200 dark:bg-[#21262d] rounded-full" />
                        <div className="h-3 w-[70%] bg-gray-200 dark:bg-[#21262d] rounded-full" />
                    </div>
                </CardContent>
            </Card>
        ),
        []
    );

    // ── Render ───────────────────────────────────────────────
    if (loading) return LoadingSkeleton;

    if (noCard === "offline") {
        return (
            <Card className="mb-3 bg-white dark:bg-[#0d1117] rounded-2xl border-0">
                <CardContent className="py-6 flex flex-col items-center gap-3">
                    <p className="text-center text-gray-600 dark:text-[#8b949e] font-semibold text-sm">
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
            <Card className="mb-3 bg-white dark:bg-[#0d1117] rounded-2xl border-0">
                <CardContent className="py-8">
                    <p className="text-center text-gray-600 dark:text-[#8b949e] font-semibold text-sm">
                        You're all caught up! Check back soon.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (noCard || !card) return null;

    return (
        <>
            <Card className="mb-3 relative overflow-hidden border-0 bg-white dark:bg-[#0d1117] rounded-2xl">
                <div className="relative z-10 pt-3">
                    {/* Header */}
                    <div className="px-3 pb-2">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="p-2.5 bg-teal-500 text-white rounded-xl flex-shrink-0">
                                    <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-[10px] uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400 leading-none mb-1 font-bold">
                                        Micro Case Study
                                    </h2>
                                    <CardTitle className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-[#e6edf3] break-words whitespace-normal">
                                        {card.title || "Clinical Scenario"}
                                    </CardTitle>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                                {card.related_unit && (
                                    <Badge className="bg-blue-100 text-blue-700 dark:bg-[#0d1c2e] dark:text-blue-300 border-none font-bold text-[10px] px-2 py-0.5 rounded-md">
                                        {card.related_unit}
                                    </Badge>
                                )}
                                {card.difficulty && (
                                    <Badge
                                        className={`text-[9px] uppercase border-none px-2 py-0.5 rounded-md font-bold ${card.difficulty.toLowerCase() === "hard"
                                            ? "bg-red-100 text-red-700 dark:bg-[#241012] dark:text-red-300"
                                            : card.difficulty.toLowerCase() === "medium"
                                                ? "bg-amber-100 text-amber-800 dark:bg-[#241d0b] dark:text-amber-300"
                                                : "bg-green-100 text-green-700 dark:bg-[#0d2018] dark:text-green-300"
                                            }`}
                                    >
                                        {card.difficulty}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sections */}
                    <CardContent className="px-3 pb-3 space-y-2.5">
                        {/* Scenario */}
                        <div className={`p-3 rounded-xl ${SECTION_STYLES.scenario.bg} ${SECTION_STYLES.scenario.accent}`}>
                            <div className={`flex items-center gap-2 mb-1.5 ${SECTION_STYLES.scenario.label}`}>
                                <Eye className="w-3.5 h-3.5" />
                                <span className="text-[10px] uppercase tracking-widest font-bold">
                                    The Patient Situation
                                </span>
                            </div>
                            <p className={`text-sm leading-relaxed font-medium italic ${SECTION_STYLES.scenario.text}`}>
                                "{card.scenario}"
                            </p>
                        </div>

                        {/* Question */}
                        <div className={`p-3 rounded-xl ${SECTION_STYLES.question.bg} ${SECTION_STYLES.question.accent}`}>
                            <div className={`flex items-center gap-2 mb-1.5 ${SECTION_STYLES.question.label}`}>
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span className="text-[10px] uppercase tracking-widest font-bold">
                                    Critical Question
                                </span>
                            </div>
                            <p className={`text-sm font-bold ${SECTION_STYLES.question.text}`}>
                                {card.question}
                            </p>
                        </div>

                        {/* Answer */}
                        <div className={`p-3 rounded-xl ${SECTION_STYLES.answer.bg} ${SECTION_STYLES.answer.accent}`}>
                            <div className={`flex items-center gap-2 mb-1.5 ${SECTION_STYLES.answer.label}`}>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="text-[10px] uppercase tracking-widest font-bold">
                                    Correct Response
                                </span>
                            </div>
                            <p className={`text-sm font-bold ${SECTION_STYLES.answer.text}`}>
                                {card.answer}
                            </p>
                        </div>

                        {/* Rationale */}
                        {card.explanation && (
                            <div className={`p-3 rounded-xl ${SECTION_STYLES.rationale.bg} ${SECTION_STYLES.rationale.accent}`}>
                                <div className={`flex items-center gap-2 mb-1.5 ${SECTION_STYLES.rationale.label}`}>
                                    <Lightbulb className="w-3.5 h-3.5" />
                                    <span className="text-[10px] uppercase tracking-widest font-bold">
                                        Clinical Rationale
                                    </span>
                                </div>
                                <p className={`text-xs sm:text-sm leading-relaxed font-medium ${SECTION_STYLES.rationale.text}`}>
                                    {card.explanation}
                                </p>
                            </div>
                        )}

                        {/* Tags */}
                        {card.tags && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {card.tags.split(",").slice(0, 5).map((tag) => (
                                    <div
                                        key={tag}
                                        className="flex items-center gap-1 text-[9px] font-bold text-slate-600 dark:text-[#8b949e] bg-slate-100 dark:bg-[#161b22] px-2 py-1 rounded-full uppercase tracking-tight"
                                    >
                                        <Hash className="w-2.5 h-2.5" />
                                        {tag.trim()}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Action bar */}
                        <div className="pt-2 flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                                <button
                                    onClick={handleLike}
                                    className={`flex items-center justify-center gap-1 sm:gap-1.5 h-9 px-2 sm:px-3 rounded-full transition-all active:scale-95 text-[11px] sm:text-xs font-bold whitespace-nowrap ${liked
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-100 dark:bg-[#161b22] text-gray-600 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#21262d]"
                                        }`}
                                    aria-label="Like"
                                >
                                    <ThumbsUp size={14} fill={liked ? "currentColor" : "none"} />
                                    <span className="tabular-nums">{card.likes_count}</span>
                                </button>

                                <button
                                    onClick={handleSave}
                                    className={`flex items-center justify-center gap-1 sm:gap-1.5 h-9 px-2 sm:px-3 rounded-full transition-all active:scale-95 text-[11px] sm:text-xs font-bold whitespace-nowrap ${saved
                                        ? "bg-green-500 text-white"
                                        : "bg-gray-100 dark:bg-[#161b22] text-gray-600 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#21262d]"
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
                                    className={`flex items-center justify-center gap-1 sm:gap-1.5 h-9 px-2 sm:px-3 rounded-full transition-all active:scale-95 text-[11px] sm:text-xs font-bold whitespace-nowrap ${reported
                                        ? "bg-rose-500 text-white"
                                        : "bg-gray-100 dark:bg-[#161b22] text-gray-600 dark:text-[#8b949e] hover:bg-rose-50 dark:hover:bg-[#241012] hover:text-rose-500"
                                        }`}
                                    aria-label="Report"
                                >
                                    <Flag size={14} fill={reported ? "currentColor" : "none"} />
                                    <span className="tabular-nums">{card.reports_count}</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 h-9 bg-slate-100 dark:bg-[#161b22] rounded-full flex-shrink-0">
                                <Eye className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-[11px] sm:text-xs text-slate-700 dark:text-[#e6edf3] font-bold tabular-nums">
                                    {card.views_count}
                                </span>
                            </div>
                        </div>
                        <MicroCaseComments
                            cardId={card.id}
                            user={user}
                            commentsCount={commentsCountState}
                            onCountChange={setCommentsCountState}
                            open={commentsOpen}
                            onToggleOpen={() => setCommentsOpen((v) => !v)}
                        />
                    </CardContent>
                </div>
            </Card>

            {/* Report Dialog */}
            {showReportDialog && (
                <div
                    className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowReportDialog(false)}
                >
                    <div
                        className="bg-white dark:bg-[#0d1117] rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 border-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-100 dark:bg-[#241012] rounded-lg">
                                    <Flag className="w-5 h-5 text-rose-500" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-[#e6edf3]">
                                    Report Micro-Case
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    setShowReportDialog(false);
                                    setCustomReasonText("");
                                    setReportReason("");
                                }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-[#161b22] rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500 dark:text-[#8b949e]" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-[#8b949e] mb-4">
                            Select a reason and optionally add details:
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-[#e6edf3] mb-2">
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-[#e6edf3] mb-2">
                                    Additional details (Optional)
                                </label>
                                <textarea
                                    value={customReasonText}
                                    onChange={(e) => setCustomReasonText(e.target.value)}
                                    placeholder="Please provide more context about your report..."
                                    className="w-full px-3 py-2 border-0 rounded-lg bg-gray-50 dark:bg-[#161b22] text-gray-900 dark:text-[#e6edf3] focus:border-transparent resize-none outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={4}
                                />
                                <p className="text-xs text-gray-500 dark:text-[#8b949e] mt-1">
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
                    className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setViewReportReason({ show: false, reason: "" })}
                >
                    <div
                        className="bg-white dark:bg-[#0d1117] rounded-xl max-w-md w-full p-5 sm:p-6 border-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-100 dark:bg-[#241012] rounded-lg">
                                    <AlertCircle className="w-5 h-5 text-rose-500" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-[#e6edf3]">
                                    Report Details
                                </h3>
                            </div>
                            <button
                                onClick={() => setViewReportReason({ show: false, reason: "" })}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-[#161b22] rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500 dark:text-[#8b949e]" />
                            </button>
                        </div>

                        <div className="bg-gray-50 dark:bg-[#161b22] p-4 rounded-lg border-0">
                            <p className="text-gray-800 dark:text-[#e6edf3] font-medium whitespace-pre-wrap">
                                {viewReportReason.reason}
                            </p>
                        </div>

                        <Button
                            onClick={() => setViewReportReason({ show: false, reason: "" })}
                            className="w-full mt-6 bg-gray-100 dark:bg-[#161b22] hover:bg-gray-200 dark:hover:bg-[#21262d] text-gray-700 dark:text-[#e6edf3]"
                        >
                            Close
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}

export default MicroCaseCard;