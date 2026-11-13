// src/staff-cpd/pages/CpdAssessmentResultsPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { Award, XCircle, Trophy } from "lucide-react";
import { useAttemptResults } from "../hooks";
import { CpdEmptyState } from "../components";
import { FullScreen, PageHeader, ScrollBody, tap } from "./shared";

export function CpdAssessmentResultsPage() {
    const { id = "", attemptId = "" } = useParams();
    const nav = useNavigate();
    const q = useAttemptResults(attemptId);

    if (q.isLoading) {
        return (
            <FullScreen>
                <PageHeader title="Loading…" onBack={() => nav(-1)} />
                <ScrollBody>
                    <div className="px-4 pt-4">
                        <div className="h-64 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                    </div>
                </ScrollBody>
            </FullScreen>
        );
    }
    if (!q.data) {
        return (
            <FullScreen>
                <PageHeader title="Results" onBack={() => nav(-1)} />
                <ScrollBody>
                    <div className="px-4 pt-4">
                        <CpdEmptyState title="Results not found" />
                    </div>
                </ScrollBody>
            </FullScreen>
        );
    }

    const a: any = q.data;
    const passed = !!a.passed;
    const score = Math.round(a.score ?? 0);

    return (
        <FullScreen>
            <PageHeader
                title="Assessment Result"
                subtitle={passed ? "You passed" : "Not yet"}
                onBack={() => nav(`/cpd/activity/${id}`)}
            />

            <ScrollBody>
                <div className="px-4 pt-4 space-y-3">
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center space-y-4">
                        <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center
                                        ${passed
                                ? "bg-emerald-50 dark:bg-emerald-400/10"
                                : "bg-rose-50 dark:bg-rose-400/10"}`}>
                            {passed ? (
                                <Trophy className="h-8 w-8 text-emerald-600 dark:text-emerald-400" strokeWidth={2.4} />
                            ) : (
                                <XCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" strokeWidth={2.4} />
                            )}
                        </div>

                        <div>
                            <h2 className={`text-lg font-bold ${passed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {passed ? "Passed" : "Not Yet"}
                            </h2>
                            <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums">
                                {score}%
                            </p>
                        </div>

                        <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {passed
                                ? "Great work — your completion and certificate have been recorded."
                                : "You can retry the assessment. Review the module content first."}
                        </p>

                        <div className="flex justify-center gap-2 pt-3 flex-wrap">
                            <button
                                onClick={() => { tap(); nav(`/cpd/activity/${id}`); }}
                                className="h-10 px-4 rounded-xl
                                           bg-slate-100 dark:bg-white/[0.06]
                                           text-slate-700 dark:text-slate-200
                                           text-[12px] font-bold
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                Back to Activity
                            </button>
                            {!passed && (
                                <button
                                    onClick={() => { tap(); nav(`/cpd/activity/${id}/assessment?assessment=${a.assessment_id}`); }}
                                    className="h-10 px-4 rounded-xl bg-blue-600 text-white
                                               text-[12px] font-bold
                                               active:scale-[0.97] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    Retry
                                </button>
                            )}
                            {passed && (
                                <>
                                    <button
                                        onClick={() => { tap(); nav("/cpd/certificates"); }}
                                        className="h-10 px-4 rounded-xl
                                                   bg-amber-50 dark:bg-amber-400/10
                                                   text-amber-700 dark:text-amber-400
                                                   text-[12px] font-bold
                                                   flex items-center gap-1.5
                                                   active:scale-[0.97] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <Award className="h-3.5 w-3.5" />
                                        Certificates
                                    </button>
                                    <button
                                        onClick={() => { tap(); nav("/cpd/progress"); }}
                                        className="h-10 px-4 rounded-xl bg-blue-600 text-white
                                                   text-[12px] font-bold
                                                   active:scale-[0.97] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        My Progress
                                    </button>
                                </>
                            )}
                        </div>
                    </section>
                </div>
            </ScrollBody>
        </FullScreen>
    );
}