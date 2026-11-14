// src/pages/contribute/index.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { toast } from "sonner";
import { playSound } from "@/lib/soundManager";
import { useHomeRoute } from "@/hooks/useHomeRoute";

import type { Step, DraftQuiz, DraftQuestion, EnrollmentStatus } from "./types";
import { Gate } from "./components/Gate";
import { StepIndicator } from "./components/StepIndicator";
import { QuizMetaStep } from "./components/QuizMetaStep";
import { QuestionsStep } from "./components/QuestionsStep";
import { ReviewStep } from "./components/ReviewStep";
import { ContributionSkeleton } from "./components/ContributionSkeleton";

/* ------------------------------------------------------------------ */
/*  Initial draft                                                     */
/* ------------------------------------------------------------------ */

function emptyQuestion(n: number): DraftQuestion {
    return {
        tempId: `tmp_${Date.now()}_${n}`,
        question_text: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_answer: "A",
        explanation: "",
        additional: "",
        difficulty: "medium",
        course_tag: "General",
    };
}

function emptyDraft(): DraftQuiz {
    return {
        title: "",
        description: "",
        course: "",
        unit: "",
        unit_code: "",
        topic: "",
        quiz_type: "mcq",
        is_free: false,
        image_url: "",
        accent_color: "blue",
        questions: [emptyQuestion(1)],
    };
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function ContributePage() {
    const user = useUser();
    const navigate = useNavigate();
    const home = useHomeRoute();

    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<EnrollmentStatus | null>(null);
    const [enrollmentNotes, setEnrollmentNotes] = useState<string | null>(null);

    const [step, setStep] = useState<Step>("meta");
    const [draft, setDraft] = useState<DraftQuiz>(emptyDraft());
    const [publishing, setPublishing] = useState(false);

    /* ── Load enrollment status ── */
    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from("medrae_stu_enrollments")
                    .select("status, notes")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (cancelled) return;
                if (error) throw error;

                setStatus((data?.status as EnrollmentStatus) ?? null);
                setEnrollmentNotes(data?.notes ?? null);
            } catch (err) {
                console.warn("[Contribute] enrollment check failed:", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [user?.id]);

    /* ── Derived: can the user publish? ── */
    const canPublish = status === "approved";

    /* ── Validation per step ── */
    const isMetaValid =
        draft.title.trim().length >= 4 &&
        draft.course.trim().length > 0 &&
        draft.unit.trim().length > 0;

    const completedQuestions = draft.questions.filter(
        (q) =>
            q.question_text.trim() &&
            q.option_a.trim() &&
            q.option_b.trim() &&
            q.option_c.trim() &&
            q.option_d.trim() &&
            q.explanation.trim()
    ).length;

    const isQuestionsValid =
        draft.questions.length > 0 &&
        completedQuestions === draft.questions.length;

    /* ── Handlers ── */
    const updateDraft = (patch: Partial<DraftQuiz>) =>
        setDraft((d) => ({ ...d, ...patch }));

    const updateQuestions = (qs: DraftQuestion[]) =>
        setDraft((d) => ({ ...d, questions: qs }));

    const goNext = () => {
        playSound("ui-tap");
        if (step === "meta") {
            if (!isMetaValid) {
                toast.error("Please fill in the required fields");
                return;
            }
            setStep("questions");
        } else if (step === "questions") {
            if (!isQuestionsValid) {
                toast.error("Complete all questions first", {
                    description: `${completedQuestions} of ${draft.questions.length} ready`,
                });
                return;
            }
            setStep("review");
        }
    };

    const goBack = () => {
        playSound("ui-tap");
        if (step === "review") setStep("questions");
        else if (step === "questions") setStep("meta");
        else navigate(home, { replace: true });
    };

    /* ── Publish ── */
    const handlePublish = useCallback(async () => {
        if (!user?.id || !canPublish || publishing) return;
        setPublishing(true);

        try {
            // 1. Insert the quiz
            const { data: quiz, error: quizErr } = await supabase
                .from("quizzes")
                .insert({
                    created_by: user.id,
                    title: draft.title.trim(),
                    description: draft.description.trim() || null,
                    course: draft.course.trim() || null,
                    unit: draft.unit.trim(),
                    unit_code: draft.unit_code.trim() || null,
                    topic: draft.topic.trim() || null,
                    quiz_type: draft.quiz_type,
                    is_free: draft.is_free,
                    is_active: true,
                    is_public: true,
                    image_url: draft.image_url || null,
                    accent_color: draft.accent_color,
                    question_count: draft.questions.length,
                })
                .select("id")
                .single();

            if (quizErr || !quiz) throw quizErr || new Error("Quiz insert failed");

            // 2. Insert all questions (batch)
            const rows = draft.questions.map((q, idx) => ({
                quiz_id: quiz.id,
                question_text: q.question_text.trim(),
                option_a: q.option_a.trim(),
                option_b: q.option_b.trim(),
                option_c: q.option_c.trim(),
                option_d: q.option_d.trim(),
                correct_answer: q.correct_answer,
                explanation: q.explanation.trim(),
                additional: q.additional.trim() || null,
                difficulty: q.difficulty,
                course_tag: q.course_tag,
                question_order: idx + 1,
                is_free: draft.is_free,
            }));

            const { error: qErr } = await supabase
                .from("quiz_questions")
                .insert(rows);

            if (qErr) throw qErr;

            toast.success("Quiz published! 🎉", {
                description: `Your quiz "${draft.title}" is now live with ${rows.length} questions.`,
            });
            playSound("notification");

            // 3. Reset + go back to Medrae-quizzes
            setDraft(emptyDraft());
            setStep("meta");
            navigate("/Medrae-quizzes", { replace: true });
        } catch (err: any) {
            console.error("[Contribute] publish failed:", err);
            toast.error("Could not publish", { description: err?.message });
        } finally {
            setPublishing(false);
        }
    }, [user?.id, canPublish, publishing, draft, navigate]);

    /* ── Render ── */
    if (loading) return <ContributionSkeleton />;

    const showGate = !canPublish;

    return (
        <div className="h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-[#0d1117] overflow-hidden">
            {/* Header */}
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={goBack}
                    aria-label="Go back"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5
                               transition-colors"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
                        Contribute a quiz
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        Create a quiz unit · Earn coins when students engage
                    </p>
                </div>
            </header>

            {/* Body */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
                <div className="w-full max-w-2xl mx-auto px-3 pt-4 pb-24 space-y-4">

                    {/* Gate — the entire page becomes a wall if not approved */}
                    {showGate ? (
                        <Gate status={status} notes={enrollmentNotes} />
                    ) : (
                        <>
                            <StepIndicator current={step} />

                            {step === "meta" && (
                                <QuizMetaStep draft={draft} onChange={updateDraft} />
                            )}
                            {step === "questions" && (
                                <QuestionsStep draft={draft} onChange={updateQuestions} />
                            )}
                            {step === "review" && (
                                <ReviewStep
                                    draft={draft}
                                    submitting={publishing}
                                    onSubmit={handlePublish}
                                />
                            )}

                            {/* Step navigation */}
                            {step !== "review" && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={goBack}
                                        className="h-11 px-4 rounded-xl
                                                   bg-slate-100 dark:bg-white/[0.06]
                                                   text-slate-700 dark:text-slate-300
                                                   text-[13px] font-bold
                                                   active:scale-[0.97] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={goNext}
                                        disabled={step === "meta" ? !isMetaValid : !isQuestionsValid}
                                        className="flex-1 h-11 rounded-xl bg-blue-600 text-white
                                                   text-[13px] font-bold
                                                   flex items-center justify-center gap-1.5
                                                   active:scale-[0.97] transition-transform
                                                   disabled:opacity-50"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        Continue
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}