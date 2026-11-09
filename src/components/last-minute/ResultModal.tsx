"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    CheckCircle2, X, Loader2, AlertCircle, Clock,
    RotateCcw, ChevronRight, TrendingUp, Sparkles, BookOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { playSound } from "@/lib/soundManager";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import { cn } from "@/lib/utils";
import { CenteredModal } from "@/components/ui/CenteredModal";

type ResultRow = {
    id: string;
    paper_id: string;
    score_correct: number;
    score_total: number;
    score_pct: number;
    topics_json: Record<string, { seen: number; missed: number }>;
    duration_sec: number | null;
    coach_line: string | null;
    answers_json: Record<string, string>;
    created_at: string;
};

type Props = {
    open: boolean;
    paperId: string | null;
    slug: string;
    onClose: () => void;
    onReviewMistakes: (wrongIndices: number[]) => void;
    onRestart: () => void;
};

function fmtDuration(sec: number | null): string {
    if (!sec || sec < 0) return "—";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m >= 60) {
        const h = Math.floor(m / 60);
        return `${h}h ${m % 60}m`;
    }
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function ResultModal({
    open,
    paperId,
    slug,
    onClose,
    onReviewMistakes,
    onRestart,
}: Props) {
    const navigate = useNavigate();
    const home = useHomeRoute();
    const [row, setRow] = useState<ResultRow | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [restarting, setRestarting] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    const [reviewError, setReviewError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !paperId) return;
        let live = true;
        setLoading(true);
        setErr(null);
        setRow(null);
        setReviewError(null);
        (async () => {
            const { data, error } = await supabase.rpc("lm_get_my_results", {
                p_paper_id: paperId,
            });
            if (!live) return;
            if (error) setErr(error.message);
            else if (!data) setErr("No saved result yet for this paper.");
            else setRow(data as ResultRow);
            setLoading(false);
        })();
        return () => { live = false; };
    }, [open, paperId]);

    const weakTopics = useMemo(() => {
        if (!row?.topics_json) return [];
        return Object.entries(row.topics_json)
            .filter(([, v]) => v.missed > 0)
            .sort((a, b) => b[1].missed - a[1].missed)
            .slice(0, 4);
    }, [row]);

    const wrongCount = row ? row.score_total - row.score_correct : 0;

    // ── BULLETPROOF review handler ──
    const handleReview = async () => {
        if (!row || !paperId) {
            setReviewError("Missing result data. Please close and re-finish the paper.");
            return;
        }
        if (reviewing) return;
        setReviewing(true);
        setReviewError(null);
        playSound("tap");
        try {
            // RPC — bypasses RLS safely, verifies access server-side
            const { data: qs, error } = await supabase.rpc("lm_get_review_questions", {
                p_paper_id: paperId,
            });

            if (error) {
                setReviewError(`Could not load questions: ${error.message}`);
                return;
            }
            if (!qs || qs.length === 0) {
                setReviewError("No questions found for this paper.");
                return;
            }

            const answersJson = row.answers_json ?? {};
            if (Object.keys(answersJson).length === 0) {
                setReviewError("No saved answers in this result. Try finishing the paper again.");
                return;
            }

            const wrong: number[] = [];
            qs.forEach((q: any, pos: number) => {
                const picked = answersJson[q.id];
                const correct = String(q.correct_answer ?? "").toUpperCase();
                if (!picked || String(picked).toUpperCase() !== correct) {
                    wrong.push(pos);
                }
            });

            if (wrong.length === 0) {
                setReviewError("You answered everything correctly — nothing to review.");
                return;
            }

            // ✅ Hand off to parent (which opens the MistakeReviewModal)
            onReviewMistakes(wrong);
        } catch (e: any) {
            setReviewError(e?.message || "Could not prepare review.");
        } finally {
            setReviewing(false);
        }
    };

    const handleRestart = async () => {
        if (!paperId || restarting) return;
        setRestarting(true);
        playSound("tap");
        try {
            await supabase.rpc("lm_reset_attempt", { p_paper_id: paperId });
            onRestart();
        } finally {
            setRestarting(false);
        }
    };

    return (
        <CenteredModal
            open={open}
            onClose={onClose}
            title={row ? "Paper complete" : "Result"}
            subtitle={row ? `${row.score_pct}% accuracy` : undefined}
            maxWidthClass="max-w-md"
            maxHeight="92dvh"
        >
            <div className="p-5 sm:p-6">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        <p className="mt-3 text-sm text-muted-foreground">Loading your result…</p>
                    </div>
                ) : err ? (
                    <div className="p-4 text-center">
                        <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
                        <p className="text-sm text-rose-600 dark:text-rose-400">{err}</p>
                        <button
                            onClick={onClose}
                            className="mt-4 h-10 px-5 rounded-xl bg-muted text-sm font-semibold"
                        >
                            Close
                        </button>
                    </div>
                ) : row ? (
                    <>
                        {/* Header block */}
                        <div className="text-center mb-5">
                            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500" strokeWidth={2.5} />
                            </div>
                            <h3 className="text-3xl font-black tabular-nums leading-none tracking-tight">
                                {row.score_correct}<span className="text-muted-foreground/50"> / </span>{row.score_total}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1.5 tabular-nums font-bold">
                                {row.score_pct}% accuracy
                            </p>

                            <div className="mt-3 h-2.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full transition-all duration-700 rounded-full",
                                        row.score_pct >= 80 ? "bg-emerald-500"
                                            : row.score_pct >= 60 ? "bg-amber-500"
                                                : "bg-rose-500"
                                    )}
                                    style={{ width: `${row.score_pct}%` }}
                                />
                            </div>
                        </div>

                        {/* Stat grid */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="rounded-xl bg-emerald-500/10 p-3 text-center">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                                <p className="text-base font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                                    {row.score_correct}
                                </p>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">
                                    Correct
                                </p>
                            </div>
                            <div className="rounded-xl bg-rose-500/10 p-3 text-center">
                                <X className="h-4 w-4 text-rose-600 dark:text-rose-400 mx-auto mb-1" />
                                <p className="text-base font-black tabular-nums text-rose-600 dark:text-rose-400">
                                    {wrongCount}
                                </p>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">
                                    Missed
                                </p>
                            </div>
                            <div className="rounded-xl bg-primary/10 p-3 text-center">
                                <Clock className="h-4 w-4 text-primary mx-auto mb-1" />
                                <p className="text-base font-black tabular-nums text-primary">
                                    {fmtDuration(row.duration_sec)}
                                </p>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">
                                    Time
                                </p>
                            </div>
                        </div>

                        {/* Weak topics */}
                        {weakTopics.length > 0 && (
                            <div className="mb-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-2 flex items-center gap-1.5">
                                    <TrendingUp className="h-3 w-3" />
                                    Weakest topics
                                </p>
                                <div className="space-y-1.5">
                                    {weakTopics.map(([topic, v]) => {
                                        const missPct = v.seen > 0 ? (v.missed / v.seen) * 100 : 0;
                                        return (
                                            <div key={topic} className="rounded-lg bg-muted/50 px-3 py-2">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <span className="text-[12px] font-bold truncate">{topic}</span>
                                                    <span className="text-[11px] tabular-nums text-rose-600 dark:text-rose-400 font-bold shrink-0">
                                                        {v.missed}/{v.seen}
                                                    </span>
                                                </div>
                                                <div className="h-1 rounded-full bg-background/60 overflow-hidden">
                                                    <div
                                                        className="h-full bg-rose-500/70 rounded-full"
                                                        style={{ width: `${missPct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Coach line */}
                        {row.coach_line && (
                            <div className="mb-4 rounded-xl bg-primary/8 dark:bg-primary/10 px-3.5 py-3 flex gap-2">
                                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <p className="text-[12px] sm:text-[13px] leading-relaxed text-foreground/90">
                                    {row.coach_line}
                                </p>
                            </div>
                        )}

                        {/* Review error banner — VISIBLE if anything fails */}
                        {reviewError && (
                            <div className="mb-3 rounded-xl bg-rose-500/10 border-0 px-3.5 py-2.5 flex gap-2">
                                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                                <p className="text-[12px] text-rose-700 dark:text-rose-400 leading-snug">
                                    {reviewError}
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-2">
                            {wrongCount > 0 && (
                                <button
                                    onClick={handleReview}
                                    disabled={reviewing}
                                    className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-bold active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                                >
                                    {reviewing ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Preparing review…</>
                                    ) : (
                                        <>
                                            Review my {wrongCount} mistake{wrongCount === 1 ? "" : "s"}
                                            <ChevronRight className="h-4 w-4" />
                                        </>
                                    )}
                                </button>
                            )}
                            <button
                                onClick={handleRestart}
                                disabled={restarting}
                                className="w-full h-10 rounded-xl bg-muted text-foreground text-sm font-semibold active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {restarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                {restarting ? "Resetting…" : "Restart paper from Q1"}
                            </button>
                            <button
                                onClick={() => { onClose(); navigate(`/last-minute/${slug}`, { replace: true }); }}
                                className="w-full h-10 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted/60 transition-colors flex items-center justify-center gap-1.5"
                            >
                                <BookOpen className="h-3.5 w-3.5" />
                                Back to paper
                            </button>
                            <button
                                onClick={() => navigate(home, { replace: true })}
                                className="w-full h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Go to dashboard
                            </button>
                        </div>
                    </>
                ) : null}
            </div>
        </CenteredModal>
    );
}