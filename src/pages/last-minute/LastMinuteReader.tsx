"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ChevronLeft, ChevronRight, BookOpen, Loader2, Lock, AlertCircle,
    Timer, GraduationCap, X, CheckCircle2, ArrowUp, Sparkles, CircleDot,
    Heart, MessageCircle, Share2, Send, Trash2, CornerDownRight, History,
    RotateCcw,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import { playSound } from "@/lib/soundManager";
import { cn } from "@/lib/utils";
import FinishGateModal from "@/components/last-minute/FinishGateModal";
import ResultModal from "@/components/last-minute/ResultModal";
import PastResultsPanel from "@/components/last-minute/PastResultsPanel";
import MistakeReviewModal from "@/components/last-minute/MistakeReviewModal";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type Q = {
    id: string;
    paper_id: string;
    question_order: number;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    topic: string | null;
    difficulty: string | null;
    audio_url: string | null;
    likes_count: number;
    comments_count: number;
    shares_count: number;
};

type Reveal = { is_correct: boolean; correct_answer: string; explanation: string };
type EntitlementRow = { expires_at: string; is_active: boolean } | null;

type Comment = {
    id: string;
    question_id: string;
    paper_id: string;
    user_id: string;
    body: string;
    parent_id: string | null;
    created_at: string;
    author_name: string | null;
    author_avatar: string | null;
};

const BATCH = 20;
const REASON_OPTIONS = ["Misread question", "Concept gap", "Rushed", "Guess"];

async function checkEntitlement(userId: string | undefined, paperId: string): Promise<EntitlementRow> {
    if (!userId) return null;
    const { data: hasAccess, error } = await supabase.rpc("lm_has_access", {
        p_user_id: userId, p_paper_id: paperId,
    });
    if (error || !hasAccess) return null;
    const { data: ent } = await supabase
        .from("lm_entitlements")
        .select("expires_at")
        .eq("user_id", userId).eq("paper_id", paperId).eq("is_active", true)
        .gt("expires_at", new Date().toISOString()).maybeSingle();
    if (ent?.expires_at) return { expires_at: ent.expires_at, is_active: true };
    const { data: sub } = await supabase
        .from("subscriptions").select("expires_at")
        .eq("user_id", userId).eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false }).limit(1).maybeSingle();
    if (!sub?.expires_at) return null;
    return { expires_at: sub.expires_at, is_active: true };
}

export default function LastMinuteReader() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const home = useHomeRoute();
    const user = useUser();

    // Paper
    const [paperId, setPaperId] = useState<string | null>(null);
    const [paperTitle, setPaperTitle] = useState("");
    const [total, setTotal] = useState(0);
    const [expiresAt, setExpiresAt] = useState<string | null>(null);

    // Questions
    const [batch, setBatch] = useState<Q[]>([]);
    const [batchStart, setBatchStart] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingBatch, setLoadingBatch] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Answer state
    const [idx, setIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [reveals, setReveals] = useState<Record<string, Reveal>>({});
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [explanationFor, setExplanationFor] = useState<string | null>(null);
    const [reflectionFor, setReflectionFor] = useState<string | null>(null);
    const [pendingReflection, setPendingReflection] = useState<Record<string, boolean>>({});
    const [selectedReason, setSelectedReason] = useState<Record<string, string | null>>({});

    // Finish / result flow
    const [showFinishGate, setShowFinishGate] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [showPast, setShowPast] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [missingIdxs, setMissingIdxs] = useState<number[]>([]);
    const [orderedIds, setOrderedIds] = useState<string[]>([]);
    const [hasCompletedResult, setHasCompletedResult] = useState(false);

    // Retake screen
    const [attemptCompleted, setAttemptCompleted] = useState(false);
    const [completedSummary, setCompletedSummary] = useState<{ correct: number; total: number; pct: number } | null>(null);
    const [retaking, setRetaking] = useState(false);

    // Engagement
    const [qLikes, setQLikes] = useState<Record<string, number>>({});
    const [qComments, setQComments] = useState<Record<string, number>>({});
    const [qShares, setQShares] = useState<Record<string, number>>({});
    const [qLiked, setQLiked] = useState<Record<string, boolean>>({});
    const [showQComments, setShowQComments] = useState(false);
    const [qCommentsList, setQCommentsList] = useState<Comment[]>([]);
    const [qCommentsLoading, setQCommentsLoading] = useState(false);
    const [qCommentBody, setQCommentBody] = useState("");
    const [qCommentSending, setQCommentSending] = useState(false);
    const [qReplyTo, setQReplyTo] = useState<Comment | null>(null);

    // Refs
    const [showScrollTop, setShowScrollTop] = useState(false);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const topRef = useRef<HTMLDivElement | null>(null);
    const stripRef = useRef<HTMLDivElement | null>(null);
    const bootstrappedRef = useRef<string | null>(null);

    const isMuted = useMemo(
        () => typeof window !== "undefined" && localStorage.getItem("quizMuted") === "true",
        []
    );

    const current = batch[idx - batchStart];
    const answered = current ? answers[current.id] : undefined;
    const reveal = current ? reveals[current.id] : undefined;

    // ─────────────────────────────────────────────────────────────
    // Bootstrap
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!slug || !user?.id) return;

        const bootKey = `${user.id}:${slug}`;
        if (bootstrappedRef.current === bootKey) return;
        bootstrappedRef.current = bootKey;

        (async () => {
            setLoading(true); setErr(null);

            const { data: p } = await supabase
                .from("lm_papers").select("id,title,question_count")
                .eq("slug", slug).eq("is_published", true).eq("is_deleted", false).maybeSingle();
            if (!p) { setErr("Paper not found."); setLoading(false); return; }
            setPaperId(p.id); setPaperTitle(p.title); setTotal(p.question_count ?? 0);

            const ent = await checkEntitlement(user.id, p.id);
            if (!ent) { setErr("You don't have access to this paper yet."); setLoading(false); return; }
            setExpiresAt(ent.expires_at);

            // Attempt row — includes completed_at
            const { data: attemptRow } = await supabase
                .from("lm_attempts")
                .select("answers_json,completed_at")
                .eq("paper_id", p.id).eq("user_id", user.id).maybeSingle();
            const savedAnswers: Record<string, string> =
                (attemptRow?.answers_json as Record<string, string>) ?? {};
            const wasCompleted = !!attemptRow?.completed_at;

            // All ordered question IDs
            const { data: allIds, error: allIdsErr } = await supabase
                .from("lm_questions").select("id,question_order")
                .eq("paper_id", p.id).eq("is_deleted", false)
                .order("question_order", { ascending: true });
            if (allIdsErr) { setErr(allIdsErr.message); setLoading(false); return; }

            const oIds: string[] = (allIds ?? []).map((r: any) => String(r.id));
            setOrderedIds(oIds);
            setAnswers(savedAnswers);
            setTotal(p.question_count ?? oIds.length);

            // Existing result?
            const { data: existingResult } = await supabase.rpc("lm_get_my_results", {
                p_paper_id: p.id,
            });
            setHasCompletedResult(!!existingResult);

            // ── Already finished → show retake screen ──
            if (wasCompleted && existingResult) {
                const r: any = existingResult;
                setCompletedSummary({
                    correct: r.score_correct ?? 0,
                    total: r.score_total ?? 0,
                    pct: r.score_pct ?? 0,
                });
                setAttemptCompleted(true);
                setLoading(false);
                return;
            }

            // Resume at first unanswered
            const firstUnansweredIdx = oIds.findIndex((qid) => !savedAnswers[qid]);
            const targetIdx = firstUnansweredIdx === -1 ? 0 : firstUnansweredIdx;

            const start = Math.floor(targetIdx / BATCH) * BATCH;
            const { data: rows, error } = await supabase.rpc("lm_get_batch", {
                p_paper_id: p.id, p_offset: start, p_limit: BATCH,
            });
            if (error) { setErr(error.message); setLoading(false); return; }

            const batchIds = (rows ?? []).map((r: any) => String(r.id));
            const answeredInBatch = batchIds.filter((id) => savedAnswers[id]);
            const newReveals: Record<string, Reveal> = {};
            if (answeredInBatch.length > 0) {
                const results = await Promise.all(
                    answeredInBatch.map((qid) =>
                        supabase.rpc("lm_submit_answer", { p_question_id: qid, p_selected: savedAnswers[qid] })
                            .then(({ data }) => ({ qid, data }))
                    )
                );
                for (const { qid, data } of results) {
                    if (data?.[0]) newReveals[qid] = data[0] as Reveal;
                }
            }

            setBatch((rows ?? []) as Q[]);
            setBatchStart(start);
            setReveals(newReveals);
            setIdx(targetIdx);
            setLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug, user?.id]);

    // ─────────────────────────────────────────────────────────────
    // Batch change
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!paperId) return;
        const start = Math.floor(idx / BATCH) * BATCH;
        if (start === batchStart) return;
        let live = true;
        setLoadingBatch(true);
        (async () => {
            const { data, error } = await supabase.rpc("lm_get_batch", {
                p_paper_id: paperId, p_offset: start, p_limit: BATCH,
            });
            if (!live) return;
            if (!error) {
                const freshRows = (data ?? []) as Q[];
                setBatch(freshRows); setBatchStart(start);
                const batchIds = freshRows.map((q) => q.id);
                const answeredInBatch = batchIds.filter((id) => answers[id]);
                const missing = answeredInBatch.filter((id) => !reveals[id]);
                if (missing.length > 0) {
                    const results = await Promise.all(
                        missing.map((qid) =>
                            supabase.rpc("lm_submit_answer", { p_question_id: qid, p_selected: answers[qid] })
                                .then(({ data }) => ({ qid, data }))
                        )
                    );
                    if (!live) return;
                    const newReveals: Record<string, Reveal> = {};
                    for (const { qid, data } of results) {
                        if (data?.[0]) newReveals[qid] = data[0] as Reveal;
                    }
                    if (Object.keys(newReveals).length > 0) {
                        setReveals((prev) => ({ ...prev, ...newReveals }));
                    }
                }
            }
            setLoadingBatch(false);
        })();
        return () => { live = false; };
    }, [idx, paperId, batchStart, answers, reveals]);

    // ─────────────────────────────────────────────────────────────
    // Scroll affordance
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onScroll = () => setShowScrollTop(el.scrollTop > 400);
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, []);

    // ─────────────────────────────────────────────────────────────
    // Question transition — scroll page to top + strip to current chip
    // (fires every time `idx` changes — includes the auto-scroll to
    // the last-answered question on initial bootstrap)
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (loading || !current) return;
        requestAnimationFrame(() => {
            topRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
            const strip = stripRef.current;
            if (strip) {
                const chip = strip.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
                chip?.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
            }
        });
        setShowQComments(false);
        setQCommentsList([]);
        setQCommentBody("");
        setQReplyTo(null);
    }, [idx, loading, current]);

    // ─────────────────────────────────────────────────────────────
    // Per-question engagement
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!current) return;
        const qid = current.id;
        let live = true;
        (async () => {
            const { data: meta } = await supabase
                .from("lm_question_meta").select("likes_count,comments_count,shares_count")
                .eq("id", qid).maybeSingle();
            if (live && meta) {
                setQLikes((p) => ({ ...p, [qid]: meta.likes_count ?? 0 }));
                setQComments((p) => ({ ...p, [qid]: meta.comments_count ?? 0 }));
                setQShares((p) => ({ ...p, [qid]: meta.shares_count ?? 0 }));
            }
            const { data: liked } = await supabase
                .from("lm_question_my_likes").select("question_id")
                .eq("question_id", qid).maybeSingle();
            if (live) setQLiked((p) => ({ ...p, [qid]: !!liked }));
        })();
        return () => { live = false; };
    }, [current?.id]);

    // ─────────────────────────────────────────────────────────────
    // Persist progress
    // ─────────────────────────────────────────────────────────────
    const persistProgress = useCallback(
        async (nextAnswers: Record<string, string>, nextReveals: Record<string, Reveal>) => {
            if (!paperId) return;
            const correct = Object.values(nextReveals).filter((r) => r.is_correct).length;
            await supabase.rpc("lm_save_attempt_progress", {
                p_paper_id: paperId,
                p_answers: nextAnswers,
                p_total: total,
                p_correct: correct,
            });
        }, [paperId, total]);

    // ─────────────────────────────────────────────────────────────
    // Submit answer
    // ─────────────────────────────────────────────────────────────
    const submit = useCallback(
        async (letter: "A" | "B" | "C" | "D") => {
            if (!current || answers[current.id] || submitting) return;
            setSubmitting(current.id);
            const nextAnswers = { ...answers, [current.id]: letter };
            setAnswers(nextAnswers);

            const { data, error } = await supabase.rpc("lm_submit_answer", {
                p_question_id: current.id, p_selected: letter,
            });
            if (error || !data || !data[0]) {
                setAnswers((prev) => {
                    const c = { ...prev }; delete c[current.id]; return c;
                });
                setErr(error?.message || "Could not submit answer");
                setSubmitting(null);
                return;
            }
            const r = data[0] as Reveal;
            const nextReveals = { ...reveals, [current.id]: r };
            setReveals(nextReveals);

            if (!isMuted) playSound(r.is_correct ? "tap-correct" : "tap-wrong");
            if (navigator.vibrate) navigator.vibrate(r.is_correct ? 50 : [100, 50, 100]);

            setExplanationFor(current.id);
            if (!r.is_correct) setPendingReflection((prev) => ({ ...prev, [current.id]: true }));

            persistProgress(nextAnswers, nextReveals).catch(() => { });
            setSubmitting(null);
        }, [current, answers, reveals, submitting, isMuted, persistProgress]
    );

    // ─────────────────────────────────────────────────────────────
    // Finish flow
    // ─────────────────────────────────────────────────────────────
    const handleFinishClick = useCallback(() => {
        if (loading) {
            alert("Still loading — wait one second and try again.");
            return;
        }
        if (err) {
            alert(`Cannot finish: ${err}`);
            return;
        }
        const n = total || Object.keys(answers).length;
        if (n === 0) {
            alert("No questions loaded. Reload the page.");
            return;
        }

        const missing: number[] = [];
        if (orderedIds.length === total) {
            orderedIds.forEach((qid, i) => {
                if (!answers[qid]) missing.push(i);
            });
        } else {
            const answeredCount = Object.keys(answers).length;
            if (answeredCount < total) {
                setMissingIdxs([]);
                setShowFinishGate(true);
                return;
            }
        }

        if (missing.length > 0) {
            setMissingIdxs(missing);
            setShowFinishGate(true);
        } else {
            finalizeAndShow();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderedIds, answers, total, loading, err]);

    const finalizeAndShow = async () => {
        if (!paperId || finalizing) return;
        setFinalizing(true);
        try {
            const { error } = await supabase.rpc("lm_finalize_result", { p_paper_id: paperId });
            if (error) throw error;
            setHasCompletedResult(true);
            setShowFinishGate(false);
            setShowResult(true);
            if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
        } catch (e: any) {
            setErr(e?.message || "Could not save result");
        } finally {
            setFinalizing(false);
        }
    };

    const jumpToIdx = (i: number) => {
        setIdx(i);
        setShowFinishGate(false);
        requestAnimationFrame(() => {
            topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    };

    // ─────────────────────────────────────────────────────────────
    // Review / result handoff
    // ─────────────────────────────────────────────────────────────
    const handleReviewMistakes = (_wrongIndices: number[]) => {
        setShowResult(false);
        setTimeout(() => setShowReview(true), 350);
    };

    // ─────────────────────────────────────────────────────────────
    // Retake
    // ─────────────────────────────────────────────────────────────
    const handleRetake = async () => {
        if (!paperId || retaking) return;
        setRetaking(true);
        playSound("tap");
        if (navigator.vibrate) navigator.vibrate(30);
        try {
            const { error } = await supabase.rpc("lm_reset_attempt", { p_paper_id: paperId });
            if (error) throw error;
            window.location.reload();
        } catch (e: any) {
            setErr(e?.message || "Could not reset attempt");
            setRetaking(false);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Engagement actions
    // ─────────────────────────────────────────────────────────────
    const toggleQuestionLike = async () => {
        if (!current) return;
        const qid = current.id;
        const next = !qLiked[qid];
        setQLiked((p) => ({ ...p, [qid]: next }));
        setQLikes((p) => ({ ...p, [qid]: Math.max(0, (p[qid] ?? 0) + (next ? 1 : -1)) }));
        if (navigator.vibrate) navigator.vibrate(30);
        await supabase.rpc("lm_toggle_question_like", { p_question_id: qid });
        const { data: meta } = await supabase
            .from("lm_question_meta").select("likes_count").eq("id", qid).maybeSingle();
        if (meta) setQLikes((p) => ({ ...p, [qid]: meta.likes_count ?? 0 }));
    };

    const loadQuestionComments = useCallback(async () => {
        if (!current) return;
        setQCommentsLoading(true);
        const { data, error } = await supabase
            .from("lm_question_comments_with_user").select("*")
            .eq("question_id", current.id)
            .order("created_at", { ascending: false }).limit(60);
        if (!error) setQCommentsList((data ?? []) as Comment[]);
        setQCommentsLoading(false);
    }, [current]);

    useEffect(() => {
        if (showQComments) loadQuestionComments();
    }, [showQComments, loadQuestionComments]);

    const submitQuestionComment = async () => {
        if (!current || !paperId || !qCommentBody.trim() || qCommentSending) return;
        setQCommentSending(true);
        const { error } = await supabase.rpc("lm_add_question_comment", {
            p_question_id: current.id, p_paper_id: paperId,
            p_body: qCommentBody.trim(), p_parent_id: qReplyTo?.id ?? null,
        });
        if (!error) {
            setQCommentBody(""); setQReplyTo(null);
            setQComments((p) => ({ ...p, [current.id]: (p[current.id] ?? 0) + 1 }));
            await loadQuestionComments();
        }
        setQCommentSending(false);
    };

    const shareQuestion = async () => {
        if (!current || !paperId) return;
        const url = `${window.location.origin}/last-minute/${slug}#q${current.question_order}`;
        try {
            if (navigator.share) await navigator.share({ title: paperTitle, url });
            else await navigator.clipboard.writeText(url);
            await supabase.rpc("lm_record_question_share", { p_question_id: current.id });
            setQShares((p) => ({ ...p, [current.id]: (p[current.id] ?? 0) + 1 }));
        } catch { /* cancelled */ }
    };

    const deleteQuestionComment = async (id: string) => {
        await supabase.rpc("lm_delete_question_comment", { p_comment_id: id });
        setQCommentsList((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
        if (current) {
            setQComments((p) => ({ ...p, [current.id]: Math.max(0, (p[current.id] ?? 0) - 1) }));
        }
    };

    const handleRestart = () => window.location.reload();

    // ─────────────────────────────────────────────────────────────
    // Derived
    // ─────────────────────────────────────────────────────────────
    const answeredCount = Object.keys(answers).length;
    const dayLeft = expiresAt
        ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))
        : 0;
    const progressPct = useMemo(
        () => (total ? Math.min(100, ((idx + 1) / total) * 100) : 0),
        [idx, total]
    );
    const topLevelComments = qCommentsList.filter((c) => !c.parent_id);
    const repliesFor = (id: string) => qCommentsList.filter((c) => c.parent_id === id);

    // ─────────────────────────────────────────────────────────────
    // RETAKE SCREEN — shown when the attempt is already completed
    // ─────────────────────────────────────────────────────────────
    if (attemptCompleted) {
        return (
            <div className="fixed inset-0 flex flex-col bg-background">
                <header className="shrink-0 w-full flex items-center gap-3 px-3 sm:px-6 py-2.5 sm:py-3
                    border-b border-border bg-background/95 backdrop-blur-sm z-30">
                    <button
                        onClick={() => { playSound("tap"); navigate(-1); }}
                        aria-label="Back"
                        className="p-2 -ml-1 rounded-full hover:bg-muted transition-colors shrink-0"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">
                            {paperTitle}
                        </h1>
                        <p className="text-[11px] text-muted-foreground truncate">
                            Completed · Retake available
                        </p>
                    </div>
                </header>

                <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    <div className="max-w-md mx-auto px-3 py-6 pb-24">
                        <div className="rounded-2xl bg-white dark:bg-muted/40 p-6 text-center">
                            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500" strokeWidth={2.5} />
                            </div>
                            <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400 mb-1 font-black">
                                Paper completed
                            </p>
                            <h3 className="text-base font-bold mb-1">
                                You already finished this paper
                            </h3>
                            {completedSummary && (
                                <p className="text-sm text-muted-foreground mb-5 tabular-nums font-semibold">
                                    Last score:{" "}
                                    <span className="text-foreground font-black">
                                        {completedSummary.correct}/{completedSummary.total}
                                    </span>
                                    {" · "}{completedSummary.pct}%
                                </p>
                            )}

                            <div className="space-y-2">
                                <button
                                    onClick={handleRetake}
                                    disabled={retaking}
                                    className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-bold active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                                >
                                    {retaking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                    {retaking ? "Resetting…" : "Retake paper from Q1"}
                                </button>
                                <button
                                    onClick={() => setShowResult(true)}
                                    className="w-full h-10 rounded-xl bg-muted text-foreground text-sm font-semibold active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                                >
                                    View result
                                </button>
                                <button
                                    onClick={() => setShowReview(true)}
                                    className="w-full h-10 rounded-xl bg-primary/8 dark:bg-primary/10 text-foreground text-sm font-semibold active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                                >
                                    Review my mistakes
                                </button>
                                <button
                                    onClick={() => navigate(home, { replace: true })}
                                    className="w-full h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Back to dashboard
                                </button>
                            </div>

                            <p className="mt-4 text-[10px] text-muted-foreground leading-relaxed">
                                Retaking wipes your answers and starts fresh. Your previous score stays saved in history.
                            </p>
                        </div>
                    </div>
                </main>

                {/* Modals still accessible from the retake screen */}
                <ResultModal
                    open={showResult}
                    paperId={paperId}
                    slug={slug ?? ""}
                    onClose={() => setShowResult(false)}
                    onReviewMistakes={handleReviewMistakes}
                    onRestart={handleRestart}
                />
                <MistakeReviewModal
                    open={showReview}
                    paperId={paperId}
                    onClose={() => setShowReview(false)}
                />
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // NORMAL READER
    // ─────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 flex flex-col bg-background">
            <header className="shrink-0 w-full border-b border-border bg-background/95 backdrop-blur-sm z-30">
                <div className="w-full px-3 md:px-5 py-2.5 md:py-3 space-y-2">
                    <div className="flex items-start gap-2 min-w-0">
                        <button
                            onClick={() => { playSound("tap"); navigate(-1); }}
                            aria-label="Back"
                            className="p-2 -ml-1 rounded-full hover:bg-muted transition-colors shrink-0"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <h1 className="break-words text-base md:text-lg font-bold tracking-tight truncate">
                                {paperTitle}
                            </h1>
                            <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 tabular-nums">
                                Question {idx + 1} of {total || "?"} · {answeredCount} answered
                            </p>
                        </div>
                        <button
                            onClick={() => { playSound("tap"); setShowPast(true); }}
                            aria-label="Past results"
                            className="p-2 rounded-full hover:bg-muted transition-colors shrink-0"
                        >
                            <History className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 px-2.5 py-1.5 rounded-lg shrink-0">
                            <Timer className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                            <span className="text-[11px] font-bold tabular-nums text-red-600 dark:text-red-400">
                                {dayLeft}d left
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                            <div
                                ref={stripRef}
                                className="flex items-center gap-1.5 min-w-0 flex-1 justify-start h-11 overflow-x-auto scrollbar-hide scroll-smooth select-none"
                            >
                                {Array.from({ length: total || 0 }).map((_, i) => {
                                    const batchQ = batch[i - batchStart];
                                    const isAnswered = batchQ ? !!answers[batchQ.id] : false;
                                    const isCurrent = i === idx;
                                    const isCorrect = batchQ ? reveals[batchQ.id]?.is_correct : false;
                                    const isWrong = batchQ ? !!reveals[batchQ.id] && !reveals[batchQ.id].is_correct : false;
                                    return (
                                        <button
                                            key={i}
                                            data-idx={i}
                                            onClick={() => setIdx(i)}
                                            className={cn(
                                                "shrink-0 flex items-center justify-center rounded-full transition-all duration-300 tabular-nums text-[10px] font-bold",
                                                isCurrent
                                                    ? "w-8 h-8 bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                                                    : "w-6 h-6",
                                                !isCurrent && isWrong
                                                    ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                                                    : !isCurrent && (isCorrect || isAnswered)
                                                        ? "bg-emerald-500 text-white"
                                                        : !isCurrent
                                                            ? "bg-muted text-muted-foreground hover:bg-muted/70"
                                                            : ""
                                            )}
                                        >
                                            {i + 1}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={handleFinishClick}
                                className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary hover:opacity-90 text-primary-foreground transition-all active:scale-95"
                                aria-label="Finish"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="h-[2px] bg-muted -mx-3 md:-mx-5 mt-1">
                        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }} />
                    </div>
                </div>
            </header>

            <main ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <div ref={topRef} className="w-full px-2 md:px-3 lg:px-6 py-3 md:py-5 pb-32">
                    {loading ? (
                        <div className="max-w-6xl mx-auto space-y-3">
                            <div className="h-32 bg-muted/50 rounded-xl animate-pulse" />
                            <div className="h-14 bg-muted/50 rounded-xl animate-pulse" />
                            <div className="h-14 bg-muted/50 rounded-xl animate-pulse" />
                        </div>
                    ) : err ? (
                        <div className="max-w-6xl mx-auto rounded-2xl bg-rose-500/5 p-6 text-center">
                            <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-3" />
                            <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{err}</p>
                            <button
                                onClick={() => navigate(`/last-minute/${slug}`, { replace: true })}
                                className="mt-4 h-10 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold active:scale-95 transition-all"
                            >
                                Back to paper
                            </button>
                        </div>
                    ) : !current ? (
                        <div className="max-w-6xl mx-auto rounded-2xl bg-muted/40 p-10 text-center">
                            <BookOpen className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No more questions.</p>
                        </div>
                    ) : (
                        <div className="max-w-6xl mx-auto">
                            {loadingBatch && (
                                <div className="mb-2 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Loading next batch…
                                </div>
                            )}
                            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-4 lg:gap-6 items-start">
                                {/* LEFT */}
                                <div className="flex flex-col px-2 py-3 md:py-4 rounded-xl bg-white dark:bg-muted/40 text-slate-900 dark:text-slate-100">
                                    <div className="flex items-center gap-2 mb-2 text-[10px] md:text-[11px] font-bold uppercase tracking-wider flex-wrap">
                                        <span className="text-primary">Q{idx + 1}</span>
                                        {current.topic && (<><span className="h-1 w-1 rounded-full bg-border" /><span className="text-muted-foreground">{current.topic}</span></>)}
                                        {current.difficulty && (<><span className="h-1 w-1 rounded-full bg-border" /><span className="text-muted-foreground">{current.difficulty}</span></>)}
                                    </div>

                                    <p className="font-bold leading-relaxed text-sm md:text-base mb-3 md:mb-4">
                                        {current.question_text}
                                    </p>

                                    {current.audio_url && (
                                        <div className="mb-4 rounded-lg bg-muted/60 px-3 py-2 flex items-center gap-2">
                                            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                                            <span className="text-[11px] text-muted-foreground">Audio available</span>
                                        </div>
                                    )}

                                    <div className="space-y-1.5 md:space-y-2 text-sm">
                                        {(["A", "B", "C", "D"] as const).map((letter) => {
                                            const text = current[`option_${letter.toLowerCase() as "a" | "b" | "c" | "d"}`];
                                            return (
                                                <button
                                                    key={letter}
                                                    onClick={() => {
                                                        if (answered) return;
                                                        if (!isMuted) playSound("tap");
                                                        submit(letter);
                                                    }}
                                                    disabled={!!answered}
                                                    className={cn(
                                                        "w-full text-left px-0 md:px-4 py-2.5 md:py-3 rounded-none md:rounded-md font-semibold transition-all duration-150",
                                                        answered ? "cursor-default opacity-95" : "cursor-pointer"
                                                    )}
                                                >
                                                    <div
                                                        className={cn(
                                                            "flex justify-between items-center gap-2 min-h-[48px] md:min-h-[52px] py-2 px-3 md:px-4 rounded-lg transition-all duration-200",
                                                            !answered ? "bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/60" : "bg-white dark:bg-slate-800",
                                                            answered && reveal?.correct_answer !== letter && answered !== letter ? "opacity-50" : "opacity-100"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2 md:gap-3">
                                                            <span
                                                                className={cn(
                                                                    "text-xs font-bold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-md transition-colors duration-300",
                                                                    answered && reveal?.correct_answer === letter
                                                                        ? "bg-emerald-500 text-white"
                                                                        : answered === letter && reveal?.correct_answer !== letter
                                                                            ? "bg-rose-500 text-white"
                                                                            : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                                                                )}
                                                            >
                                                                {letter}
                                                            </span>
                                                            <span className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-200">{text}</span>
                                                        </div>
                                                        <div className="flex items-center ml-3 md:ml-4">
                                                            {answered && reveal?.correct_answer === letter && (
                                                                <div className="flex items-center gap-1 md:gap-1.5 animate-[pop_0.3s_ease-out]">
                                                                    <span className="text-[9px] md:text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Correct</span>
                                                                    <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-400" />
                                                                </div>
                                                            )}
                                                            {answered && answered === letter && reveal?.correct_answer !== letter && (
                                                                <div className="flex items-center gap-1 md:gap-1.5 animate-[shake_0.4s_ease-in-out]">
                                                                    <span className="text-[9px] md:text-[10px] text-rose-600 dark:text-rose-400 uppercase tracking-tight">Wrong</span>
                                                                    <X className="w-3.5 h-3.5 md:w-4 md:h-4 text-rose-500 dark:text-rose-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {hasCompletedResult && (
                                        <button
                                            onClick={() => {
                                                playSound("tap");
                                                if (navigator.vibrate) navigator.vibrate(15);
                                                setShowReview(true);
                                            }}
                                            className="mt-3 w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl
                                                       bg-primary/8 dark:bg-primary/10
                                                       hover:bg-primary/12 dark:hover:bg-primary/15
                                                       transition-colors"
                                        >
                                            <span className="flex items-center gap-2 min-w-0">
                                                <span className="shrink-0 h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center">
                                                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                                                </span>
                                                <span className="text-[12px] md:text-[13px] font-bold text-foreground truncate">
                                                    Review past mistakes
                                                </span>
                                            </span>
                                            <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                                        </button>
                                    )}

                                    <div className="flex items-center justify-center gap-2 md:gap-3 w-full mt-3 md:mt-4">
                                        <button
                                            onClick={() => setIdx((i) => Math.max(0, i - 1))}
                                            disabled={idx === 0}
                                            className="inline-flex items-center justify-center gap-1 md:gap-2 px-4 md:px-6 h-10 md:h-11 rounded-lg md:rounded-xl bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-semibold disabled:opacity-30 disabled:cursor-not-allowed text-xs md:text-sm"
                                        >
                                            <ChevronLeft size={16} /> Previous
                                        </button>
                                        {idx >= total - 1 ? (
                                            <button
                                                onClick={handleFinishClick}
                                                className="inline-flex items-center justify-center gap-1 md:gap-2 px-6 md:px-8 h-10 md:h-11 rounded-lg md:rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all font-semibold active:scale-[0.98] text-xs md:text-sm"
                                            >
                                                Finish paper <ChevronRight size={16} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
                                                className="inline-flex items-center justify-center gap-1 md:gap-2 px-6 md:px-8 h-10 md:h-11 rounded-lg md:rounded-xl bg-primary hover:opacity-90 text-primary-foreground transition-all font-semibold active:scale-[0.98] text-xs md:text-sm"
                                            >
                                                Next <ChevronRight size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* RIGHT */}
                                <aside className="flex flex-col gap-3 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100dvh-140px)] lg:overflow-y-auto custom-scrollbar">
                                    {reveal && explanationFor === current.id && (
                                        <div className={cn("rounded-xl px-4 py-3.5 animate-[fadeIn_180ms_ease-out]",
                                            reveal.is_correct ? "bg-emerald-500/8 dark:bg-emerald-500/10" : "bg-rose-500/8 dark:bg-rose-500/10")}>
                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    {reveal.is_correct ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <CircleDot className="h-4 w-4 text-rose-500" />}
                                                    <p className={cn("text-[11px] font-bold uppercase tracking-wider",
                                                        reveal.is_correct ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                                        {reveal.is_correct ? "Correct" : `Correct answer: ${reveal.correct_answer}`}
                                                    </p>
                                                </div>
                                                <button onClick={() => setExplanationFor(null)} aria-label="Close" className="p-1 rounded hover:bg-muted/60 transition-colors">
                                                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                                                </button>
                                            </div>
                                            {reveal.explanation && (
                                                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{reveal.explanation}</p>
                                            )}
                                        </div>
                                    )}

                                    {reveal && !reveal.is_correct && reflectionFor === current.id && !selectedReason[current.id] && (
                                        <div className="rounded-xl bg-amber-500/5 dark:bg-amber-500/10 px-4 py-3.5 animate-[fadeIn_180ms_ease-out]">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2">
                                                Why did you miss this?
                                            </p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {REASON_OPTIONS.map((reason) => (
                                                    <button
                                                        key={reason}
                                                        onClick={() => {
                                                            setSelectedReason((prev) => ({ ...prev, [current.id]: reason }));
                                                            setPendingReflection((prev) => {
                                                                const next = { ...prev }; delete next[current.id]; return next;
                                                            });
                                                            setReflectionFor(null);
                                                        }}
                                                        className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 active:scale-[0.98] transition-all"
                                                    >
                                                        {reason}
                                                    </button>
                                                ))}
                                            </div>
                                            <button onClick={() => setReflectionFor(null)} className="mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                                                Skip
                                            </button>
                                        </div>
                                    )}

                                    <div className="rounded-xl bg-card/40 px-2 py-2">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={toggleQuestionLike}
                                                className={cn("flex items-center gap-1.5 h-9 px-3 rounded-full text-[12px] font-semibold transition-colors",
                                                    qLiked[current.id] ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}
                                            >
                                                <Heart size={15} fill={qLiked[current.id] ? "currentColor" : "none"} />
                                                <span className="tabular-nums">{qLikes[current.id] ?? 0}</span>
                                            </button>
                                            <button
                                                onClick={() => setShowQComments((s) => !s)}
                                                className={cn("flex items-center gap-1.5 h-9 px-3 rounded-full text-[12px] font-semibold transition-colors",
                                                    showQComments ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}
                                            >
                                                <MessageCircle size={15} />
                                                <span className="tabular-nums">{qComments[current.id] ?? 0}</span>
                                            </button>
                                            <button
                                                onClick={shareQuestion}
                                                className="flex items-center gap-1.5 h-9 px-3 rounded-full text-[12px] font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                                            >
                                                <Share2 size={15} />
                                                <span className="tabular-nums">{qShares[current.id] ?? 0}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {showQComments && (
                                        <div className="rounded-xl bg-card/40 px-3 py-3 animate-[fadeIn_180ms_ease-out]">
                                            <div className="flex items-start gap-2 mb-3">
                                                <div className="shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold uppercase text-muted-foreground">
                                                    {(user?.email?.[0] ?? "U").toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    {qReplyTo && (
                                                        <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                            <CornerDownRight className="h-3 w-3" />
                                                            Replying to {qReplyTo.author_name ?? "user"}
                                                            <button onClick={() => setQReplyTo(null)} className="ml-1 text-rose-600 hover:underline">cancel</button>
                                                        </div>
                                                    )}
                                                    <textarea
                                                        value={qCommentBody}
                                                        onChange={(e) => setQCommentBody(e.target.value)}
                                                        placeholder={qReplyTo ? `Reply to ${qReplyTo.author_name ?? "user"}…` : "Add a comment…"}
                                                        rows={2}
                                                        maxLength={1000}
                                                        className="w-full bg-muted/40 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-primary/40 resize-none"
                                                    />
                                                    <div className="flex items-center justify-end gap-2 mt-1.5">
                                                        <button onClick={() => { setQCommentBody(""); setQReplyTo(null); }} className="h-8 px-3 rounded-lg text-[12px] font-semibold text-muted-foreground hover:bg-muted">
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={submitQuestionComment}
                                                            disabled={!qCommentBody.trim() || qCommentSending}
                                                            className="h-8 px-3 rounded-lg text-[12px] font-bold bg-primary text-primary-foreground disabled:opacity-40 flex items-center gap-1"
                                                        >
                                                            {qCommentSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                                            Post
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            {qCommentsLoading ? (
                                                <div className="py-6 text-center text-[12px] text-muted-foreground">
                                                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                                </div>
                                            ) : topLevelComments.length === 0 ? (
                                                <p className="py-4 text-center text-[12px] text-muted-foreground">No comments yet. Be the first.</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {topLevelComments.map((c) => (
                                                        <div key={c.id} className="flex items-start gap-2">
                                                            <div className="shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold uppercase text-muted-foreground overflow-hidden">
                                                                {c.author_avatar ? <img src={c.author_avatar} alt="" className="w-full h-full object-cover" /> : (c.author_name?.[0] ?? "U").toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[12px] font-bold truncate">{c.author_name ?? "User"}</span>
                                                                    <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                                                                    {c.user_id === user?.id && (
                                                                        <button onClick={() => deleteQuestionComment(c.id)} className="ml-auto p-1 rounded hover:bg-muted text-muted-foreground" aria-label="Delete">
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <p className="text-[13px] leading-relaxed mt-0.5 whitespace-pre-line break-words">{c.body}</p>
                                                                <button onClick={() => setQReplyTo(c)} className="mt-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">Reply</button>
                                                                {repliesFor(c.id).map((r) => (
                                                                    <div key={r.id} className="mt-2 pl-3 border-l border-border/40 flex items-start gap-2">
                                                                        <div className="shrink-0 h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold uppercase text-muted-foreground overflow-hidden">
                                                                            {r.author_avatar ? <img src={r.author_avatar} alt="" className="w-full h-full object-cover" /> : (r.author_name?.[0] ?? "U").toUpperCase()}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[11px] font-bold truncate">{r.author_name ?? "User"}</span>
                                                                                <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                                                                            </div>
                                                                            <p className="text-[12px] leading-relaxed mt-0.5 whitespace-pre-line break-words">{r.body}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {answered && (
                                        <button
                                            onClick={() => setExplanationFor(current.id)}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card/40 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <BookOpen className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                                            {explanationFor === current.id ? "Hide rationale" : "Show rationale"}
                                        </button>
                                    )}
                                </aside>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {showScrollTop && (
                <button
                    onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                    aria-label="Scroll to top"
                    className="fixed bottom-24 right-4 z-40 h-10 w-10 rounded-full bg-foreground text-background hover:scale-110 active:scale-95 transition-transform"
                >
                    <ArrowUp className="h-4 w-4 mx-auto" />
                </button>
            )}

            {/* ═════ MODALS ═════ */}
            <FinishGateModal
                open={showFinishGate}
                missingIdxs={missingIdxs}
                total={total}
                busy={finalizing}
                onJump={jumpToIdx}
                onFinishAnyway={finalizeAndShow}
                onClose={() => setShowFinishGate(false)}
            />

            <ResultModal
                open={showResult}
                paperId={paperId}
                slug={slug ?? ""}
                onClose={() => setShowResult(false)}
                onReviewMistakes={handleReviewMistakes}
                onRestart={handleRestart}
            />

            <PastResultsPanel
                open={showPast}
                paperId={paperId}
                onClose={() => setShowPast(false)}
                onOpenResult={() => { setShowPast(false); setShowResult(true); }}
            />

            <MistakeReviewModal
                open={showReview}
                paperId={paperId}
                onClose={() => setShowReview(false)}
            />

            <span className="hidden"><Lock /></span>
        </div>
    );
}