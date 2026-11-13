// src/staff-cpd/admin/editor/AssessmentsTab.tsx
import { Plus } from "lucide-react";
import { useCreateAssessment, useDeleteAssessment } from "../../lib/admin-hooks";
import { CpdEmptyState } from "../../components";
import { tap } from "./editor-helpers";
import { AssessmentCard } from "./AssessmentCard";

const PrimaryBtn = "h-10 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

export function AssessmentsTab({ activityId, assessments }: any) {
    const createAssessment = useCreateAssessment();
    const deleteAssessment = useDeleteAssessment();

    return (
        <div className="space-y-3">
            <button
                onClick={() => {
                    tap("success");
                    createAssessment.mutate({
                        activity_id: activityId,
                        title: "Final Assessment",
                        pass_mark: 70,
                        attempt_limit: null,
                        randomize_questions: true,
                    });
                }}
                disabled={createAssessment.isPending}
                className={PrimaryBtn + " w-full"}
                style={{ touchAction: "manipulation" }}>
                <Plus className="h-3.5 w-3.5" />
                Add Assessment
            </button>

            {assessments.length === 0 && (
                <CpdEmptyState title="No assessment yet" hint="Add an assessment so nurses can prove their knowledge at the end." />
            )}

            {assessments.map((a: any) => (
                <AssessmentCard
                    key={a.id}
                    assessment={a}
                    onDelete={() => {
                        if (confirm("Delete this assessment?")) {
                            tap("warning");
                            deleteAssessment.mutate({ id: a.id, activity_id: activityId });
                        }
                    }}
                />
            ))}
        </div>
    );
}