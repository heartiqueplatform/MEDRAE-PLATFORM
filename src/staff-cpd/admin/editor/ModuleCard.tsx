// src/staff-cpd/admin/editor/ModuleCard.tsx
import { useState } from "react";
import { Plus, Trash2, GripVertical, Pencil } from "lucide-react";
import {
    useCreateContentItem,
    useUpdateContentItem,
    useDeleteContentItem,
} from "../../lib/admin-hooks";
import { ContentTypeChip } from "../../components";
import { tap } from "./editor-helpers";
import { ModuleTitleInput } from "./ModuleTitleInput";
import { NewContentForm } from "./NewContentForm";

const SecondaryBtn =
    "h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";
const DangerBtn =
    "h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400 flex items-center justify-center active:scale-[0.92] transition-transform";

export function ModuleCard({
    activityId,
    module: m,
    contentItems,
    onDelete,
}: any) {
    const createItem = useCreateContentItem();
    const updateItem = useUpdateContentItem();
    const deleteItem = useDeleteContentItem();

    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    return (
        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <GripVertical className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                    <ModuleTitleInput module={m} activityId={activityId} />
                </div>
                <button
                    onClick={onDelete}
                    className={DangerBtn}
                    aria-label="Delete module"
                    style={{ touchAction: "manipulation" }}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>

            {m.description && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {m.description}
                </p>
            )}

            <div className="space-y-1.5">
                {contentItems.map((c: any) => {
                    const isEditingThis = editingId === c.id;
                    return (
                        <div key={c.id}>
                            {!isEditingThis && (
                                <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-[#0d1117] px-3 py-2">
                                    <button
                                        onClick={() => {
                                            tap();
                                            setEditingId(c.id);
                                        }}
                                        className="flex items-center gap-2 min-w-0 flex-1 text-left active:opacity-70 transition-opacity"
                                        style={{
                                            touchAction: "manipulation",
                                        }}
                                    >
                                        <ContentTypeChip
                                            type={c.content_type}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">
                                                {c.title}
                                            </p>
                                            {c.external_url && (
                                                <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">
                                                    {c.external_url}
                                                </p>
                                            )}
                                            {c.body && (
                                                <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">
                                                    {(c.body as string).slice(
                                                        0,
                                                        60
                                                    )}
                                                    …
                                                </p>
                                            )}
                                        </div>
                                        {c.is_required && (
                                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold shrink-0 bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400">
                                                REQ
                                            </span>
                                        )}
                                    </button>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => {
                                                tap();
                                                setEditingId(c.id);
                                            }}
                                            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-[0.92] transition-transform"
                                            aria-label="Edit content"
                                            style={{
                                                touchAction: "manipulation",
                                            }}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (
                                                    !confirm(
                                                        `Delete "${c.title}"?`
                                                    )
                                                )
                                                    return;
                                                tap("warning");
                                                deleteItem.mutate({
                                                    id: c.id,
                                                    activity_id: activityId,
                                                });
                                            }}
                                            className={
                                                DangerBtn + " !h-8 !w-8"
                                            }
                                            aria-label="Delete content"
                                            style={{
                                                touchAction: "manipulation",
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isEditingThis && (
                                <NewContentForm
                                    activityId={activityId}
                                    initialItem={{
                                        id: c.id,
                                        title: c.title,
                                        content_type: c.content_type,
                                        external_provider:
                                            c.external_provider,
                                        external_url: c.external_url,
                                        duration_seconds: c.duration_seconds,
                                        is_required: c.is_required,
                                        body: c.body,
                                    }}
                                    submitLabel="Save changes"
                                    onCancel={() => setEditingId(null)}
                                    onSubmit={(patch) => {
                                        updateItem.mutate(
                                            {
                                                id: c.id,
                                                activity_id: activityId,
                                                patch,
                                            },
                                            {
                                                onSuccess: () =>
                                                    setEditingId(null),
                                            }
                                        );
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {adding ? (
                <NewContentForm
                    activityId={activityId}
                    onCancel={() => setAdding(false)}
                    onSubmit={(input) => {
                        createItem.mutate(
                            {
                                ...input,
                                module_id: m.id,
                                activity_id: activityId,
                                position: contentItems.length,
                            },
                            { onSuccess: () => setAdding(false) }
                        );
                    }}
                />
            ) : (
                <button
                    onClick={() => {
                        tap();
                        setAdding(true);
                    }}
                    className={SecondaryBtn + " w-full !h-9"}
                    style={{ touchAction: "manipulation" }}
                >
                    <Plus className="h-3.5 w-3.5" /> Add content item
                </button>
            )}
        </section>
    );
}