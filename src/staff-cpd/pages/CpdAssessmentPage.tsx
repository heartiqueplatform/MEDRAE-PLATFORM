// src/staff-cpd/pages/CpdAssessmentPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import {
    useMyEnrollment, useAssessmentWithQuestions, useStartAttempt, useSubmitAttempt,
} from "../hooks";
import { CpdEmptyState } from "../components";
import { FullScreen, PageHeader, ScrollBody, tap } from "./shared";

export function CpdAssessmentPage() {
    const { id = "" } = useParams();
    const [sp] = useSearchParams();
    const assessmentId = sp.get("assessment") ?? "";
    const nav = useNavigate();

    const enrollment = useMyEnrollment(id);
    const bundle = useAssessmentWithQuestions(assessmentId);
    const startAttempt = useStartAttempt();
    const submitAttempt = useSubmitAttempt();

    const [attemptId, setAttemptId] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<string, any>>({});

    useEffect(() => {
        if (!enrollment.data || !assessmentId || attemptId) return;
        (async () => {
            try {
                const a = await startAttempt.mutateAsync({
                    assessmentId,
                    enrollmentId: enrollment.data!.id,
                });
                setAttemptId(a.id);
            } catch (e: any) {
                console.error("startAttempt failed", e);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enrollment.data?.id, assessmentId]);

    if (bundle.isLoading || !enrollment.data) {
        return (
            <FullScreen>
                <PageHeader title="Loading…" onBack={() => nav(-1)} />
                <ScrollBody>
                    <div className="px-4 pt-4 space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-24 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                        ))}
                    </div>
                </ScrollBody>
            </FullScreen>
        );
    }
    if (!bundle.data) {
        return (
            <FullScreen>
                <PageHeader title="Assessment" onBack={() => nav(-1)} />
                <ScrollBody>
                    <div className="px-4 pt-4">
                        <CpdEmptyState title="Assessment not found" />
                    </div>
                </ScrollBody>
            </FullScreen>
        );
    }

    const { assessment, questions } = bundle.data;
    const totalQuestions = questions.length;
    const answered = questions.filter((q: any) => {
        const v = answers[q.id];
        if (q.question_type === "multiple_select") return Array.isArray(v) && v.length > 0;
        return v !== undefined && v !== null && v !== "";
    }).length;

    const submit = async () => {
        if (!attemptId) return;
        tap("success");
        await submitAttempt.mutateAsync({ attemptId, answers });
        nav(`/cpd/activity/${id}/assessment/${attemptId}/results`);
    };

    return (
        <FullScreen>
            <PageHeader
                title={assessment.title}
                subtitle={`Pass mark ${assessment.pass_mark}% · ${answered}/${totalQuestions} answered`}
                onBack={() => { tap(); nav(`/cpd/activity/${id}`); }}
            />

            <ScrollBody>
                <div className="px-4 pt-4 space-y-3">
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
                        <Progress
                            value={totalQuestions > 0 ? (answered / totalQuestions) * 100 : 0}
                            className="h-1.5"
                        />
                    </section>

                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-5">
                        {questions.map((q: any, i: number) => {
                            const qAnswered = (() => {
                                const v = answers[q.id];
                                if (q.question_type === "multiple_select") return Array.isArray(v) && v.length > 0;
                                return v !== undefined && v !== null && v !== "";
                            })();

                            return (
                                <div key={q.id} className="space-y-3 pb-5 border-b border-slate-100 dark:border-white/[0.04] last:border-0 last:pb-0">
                                    <div className="flex items-start gap-2">
                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0
                                                        text-[11px] font-bold
                                                        ${qAnswered
                                                ? "bg-emerald-500 text-white"
                                                : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"}`}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug">
                                                {q.question}
                                            </p>
                                            {q.points && q.points !== 1 && (
                                                <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full
                                                                 bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
                                                    {q.points} pts
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 pl-8">
                                        {q.options?.map((opt: any) => {
                                            const checked = q.question_type === "multiple_select"
                                                ? Array.isArray(answers[q.id]) && answers[q.id].includes(opt.id)
                                                : answers[q.id] === opt.id;
                                            return (
                                                <label
                                                    key={opt.id}
                                                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5
                                                                text-[12px] cursor-pointer
                                                                transition-colors
                                                                ${checked
                                                            ? "bg-blue-50 dark:bg-blue-400/10 text-blue-900 dark:text-blue-100"
                                                            : "bg-slate-50 dark:bg-[#0d1117] text-slate-700 dark:text-slate-300 active:bg-slate-100 dark:active:bg-white/[0.08]"}`}
                                                    style={{ touchAction: "manipulation" }}
                                                >
                                                    <input
                                                        type={q.question_type === "multiple_select" ? "checkbox" : "radio"}
                                                        name={`q_${q.id}`}
                                                        checked={checked}
                                                        onChange={(e) => {
                                                            if (q.question_type === "multiple_select") {
                                                                const prev = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                                                                const next = e.target.checked
                                                                    ? [...prev, opt.id]
                                                                    : prev.filter((x: string) => x !== opt.id);
                                                                setAnswers((a) => ({ ...a, [q.id]: next }));
                                                            } else {
                                                                setAnswers((a) => ({ ...a, [q.id]: opt.id }));
                                                            }
                                                        }}
                                                        className="w-4 h-4 accent-blue-600 shrink-0"
                                                    />
                                                    <span className="font-medium">
                                                        {opt.option_text}
                                                    </span>
                                                </label>
                                            );
                                        })}

                                        {q.question_type === "short_answer" && (
                                            <textarea
                                                value={answers[q.id] ?? ""}
                                                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                                                className="w-full rounded-xl bg-slate-50 dark:bg-[#0d1117]
                                                           p-3 text-[12px] font-medium
                                                           text-slate-900 dark:text-white
                                                           outline-none resize-y"
                                                rows={3}
                                                placeholder="Type your answer…"
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </section>

                    <div className="sticky bottom-2">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3
                                        flex items-center justify-between gap-2 flex-wrap
                                        border border-slate-200/70 dark:border-white/[0.06]">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                {answered < totalQuestions
                                    ? `${totalQuestions - answered} unanswered`
                                    : "All questions answered"}
                            </span>
                            <button
                                onClick={submit}
                                disabled={submitAttempt.isPending || !attemptId}
                                className="h-10 px-4 rounded-xl bg-blue-600 text-white
                                           text-[12px] font-bold
                                           active:scale-[0.97] transition-transform
                                           disabled:opacity-40"
                                style={{ touchAction: "manipulation" }}
                            >
                                {submitAttempt.isPending ? "Submitting…" : "Submit"}
                            </button>
                        </div>
                    </div>
                </div>
            </ScrollBody>
        </FullScreen>
    );
}