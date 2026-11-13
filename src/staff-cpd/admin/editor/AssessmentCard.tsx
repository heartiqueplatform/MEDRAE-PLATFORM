// src/staff-cpd/admin/editor/AssessmentCard.tsx
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
    useAssessmentQuestions, useAttachQuestion, useDetachQuestion,
} from "../../lib/admin-hooks";
import { tap } from "./editor-helpers";
import { QuestionPicker } from "./QuestionPicker";

const SecondaryBtn = "h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";
const DangerBtn = "h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400 flex items-center justify-center active:scale-[0.92] transition-transform";

export function AssessmentCard({ assessment, onDelete }: any) {
    const q = useAssessmentQuestions(assessment.id);
    const attach = useAttachQuestion();
    const detach = useDetachQuestion();
    const [picking, setPicking] = useState(false);

    const attached = (q.data ?? []) as any[];

    return (
        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <h3 className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                        {assessment.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Pass mark {assessment.pass_mark}% · {attached.length} question{attached.length === 1 ? "" : "s"}
                        {assessment.attempt_limit ? ` · max ${assessment.attempt_limit} attempts` : ""}
                    </p>
                </div>
                <button onClick={onDelete} className={DangerBtn} aria-label="Delete assessment"
                    style={{ touchAction: "manipulation" }}>
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>

            <div className="space-y-1.5">
                {attached.map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-[#0d1117] px-3 py-2">
                        <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-medium text-slate-900 dark:text-white truncate">
                                {row.question?.question}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold capitalize bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                                    {row.question?.question_type?.replace("_", " ")}
                                </span>
                                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                                    {row.points} pt
                                </span>
                            </div>
                        </div>
                        <button onClick={() => { tap("warning"); detach.mutate({ id: row.id, assessment_id: assessment.id }); }}
                            className={DangerBtn + " !h-8 !w-8"} aria-label="Detach question"
                            style={{ touchAction: "manipulation" }}>
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                ))}
            </div>

            {picking ? (
                <QuestionPicker
                    onCancel={() => setPicking(false)}
                    onPick={(questionId) => {
                        tap("success");
                        attach.mutate({
                            assessment_id: assessment.id,
                            question_id: questionId,
                            position: attached.length,
                            points: 1,
                        });
                        setPicking(false);
                    }}
                />
            ) : (
                <button onClick={() => { tap(); setPicking(true); }}
                    className={SecondaryBtn + " w-full !h-9"} style={{ touchAction: "manipulation" }}>
                    <Plus className="h-3.5 w-3.5" />
                    Attach question from bank
                </button>
            )}
        </section>
    );
}