// src/staff-cpd/admin/editor/ModulesTab.tsx
import { Plus } from "lucide-react";
import { useCreateModule, useDeleteModule } from "../../lib/admin-hooks";
import { CpdEmptyState } from "../../components";
import { tap } from "./editor-helpers";
import { ModuleCard } from "./ModuleCard";

const PrimaryBtn = "h-10 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

export function ModulesTab({ activityId, modules, contentByModule }: any) {
    const createModule = useCreateModule();
    const deleteModule = useDeleteModule();

    return (
        <div className="space-y-3">
            <button
                onClick={() => {
                    tap("success");
                    createModule.mutate({
                        activity_id: activityId,
                        title: `Module ${modules.length + 1}`,
                        position: modules.length,
                    });
                }}
                disabled={createModule.isPending}
                className={PrimaryBtn + " w-full"}
                style={{ touchAction: "manipulation" }}>
                <Plus className="h-3.5 w-3.5" />
                Add Module
            </button>

            {modules.length === 0 && (
                <CpdEmptyState title="No modules yet" hint="Add your first module to start attaching content items." />
            )}

            {modules.map((m: any) => (
                <ModuleCard
                    key={m.id}
                    activityId={activityId}
                    module={m}
                    contentItems={contentByModule[m.id] ?? []}
                    onDelete={() => {
                        if (confirm(`Delete "${m.title}"? All content inside will be removed.`)) {
                            tap("warning");
                            deleteModule.mutate({ id: m.id, activity_id: activityId });
                        }
                    }}
                />
            ))}
        </div>
    );
}