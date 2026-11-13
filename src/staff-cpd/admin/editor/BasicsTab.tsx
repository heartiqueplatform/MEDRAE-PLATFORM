// src/staff-cpd/admin/editor/BasicsTab.tsx
import { useRef, useState } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";
import { useUpdateActivity, useUploadThumbnail } from "../../lib/admin-hooks";
import SelectField from "@/components/ui/SelectField";
import { tap } from "./editor-helpers";

const InputBase = "w-full h-10 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none";
const TextareaBase = "w-full rounded-xl bg-white dark:bg-[#161b22] px-3 py-2 text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none resize-y";
const PrimaryBtn = "h-10 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";
const SecondaryBtn = "h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

const LabelClass = "block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1";

export function BasicsTab({ activity }: { activity: any }) {
    const update = useUpdateActivity();
    const upload = useUploadThumbnail();
    const fileRef = useRef<HTMLInputElement>(null);
    const [draft, setDraft] = useState({
        title: activity.title ?? "",
        short_description: activity.short_description ?? "",
        description: activity.description ?? "",
        category: activity.category ?? "",
        difficulty: activity.difficulty ?? "intermediate",
        learning_hours: activity.learning_hours ?? 0,
        configured_cpd_points: activity.configured_cpd_points ?? 0,
    });

    const lastIdRef = useRef<string>(activity.id);
    if (lastIdRef.current !== activity.id) {
        lastIdRef.current = activity.id;
        setDraft({
            title: activity.title ?? "",
            short_description: activity.short_description ?? "",
            description: activity.description ?? "",
            category: activity.category ?? "",
            difficulty: activity.difficulty ?? "intermediate",
            learning_hours: activity.learning_hours ?? 0,
            configured_cpd_points: activity.configured_cpd_points ?? 0,
        });
    }

    const isDirty =
        draft.title !== (activity.title ?? "") ||
        draft.short_description !== (activity.short_description ?? "") ||
        draft.description !== (activity.description ?? "") ||
        draft.category !== (activity.category ?? "") ||
        draft.difficulty !== (activity.difficulty ?? "intermediate") ||
        Number(draft.learning_hours) !== Number(activity.learning_hours ?? 0) ||
        Number(draft.configured_cpd_points) !== Number(activity.configured_cpd_points ?? 0);

    const set = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));

    const handleSave = async () => {
        tap("success");
        await update.mutateAsync({
            id: activity.id,
            patch: {
                title: draft.title.trim() || "Untitled Activity",
                short_description: draft.short_description || null,
                description: draft.description || null,
                category: draft.category || null,
                difficulty: draft.difficulty,
                learning_hours: Number(draft.learning_hours) || 0,
                configured_cpd_points: Number(draft.configured_cpd_points) || 0,
            },
        });
    };

    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        tap();
        const url = await upload.mutateAsync({ file, activityId: activity.id });
        await update.mutateAsync({ id: activity.id, patch: { thumbnail_url: url } });
    };

    return (
        <div className="space-y-3">
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                <div className="flex flex-col sm:flex-row items-start gap-3">
                    <div className="w-full sm:w-36 h-28 sm:h-24 rounded-xl bg-slate-100 dark:bg-white/[0.06] overflow-hidden flex items-center justify-center shrink-0">
                        {activity.thumbnail_url ? (
                            <img src={activity.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <ImageIcon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                        )}
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white">Cover image</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">JPG, PNG, WebP · Max 5 MB</p>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
                        <button onClick={() => { tap(); fileRef.current?.click(); }}
                            disabled={upload.isPending} className={SecondaryBtn}
                            style={{ touchAction: "manipulation" }}>
                            <Upload className="h-3.5 w-3.5" />
                            {upload.isPending ? "Uploading…" : "Upload image"}
                        </button>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                <div>
                    <label className={LabelClass}>Title</label>
                    <input value={draft.title} onChange={(e) => set({ title: e.target.value })}
                        placeholder="Activity title" className={InputBase} />
                </div>
                <div>
                    <label className={LabelClass}>Short description</label>
                    <input value={draft.short_description}
                        onChange={(e) => set({ short_description: e.target.value })}
                        placeholder="A one-line summary" className={InputBase} />
                </div>
                <div>
                    <label className={LabelClass}>Full description</label>
                    <textarea value={draft.description}
                        onChange={(e) => set({ description: e.target.value })}
                        placeholder="Detailed description of the activity…"
                        rows={5} className={TextareaBase} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className={LabelClass}>Learning hours</label>
                        <input type="number" step="0.25" min={0}
                            value={draft.learning_hours}
                            onChange={(e) => set({ learning_hours: Number(e.target.value) })}
                            className={InputBase} />
                    </div>
                    <div>
                        <label className={LabelClass}>CPD points</label>
                        <input type="number" step="0.25" min={0}
                            value={draft.configured_cpd_points}
                            onChange={(e) => set({ configured_cpd_points: Number(e.target.value) })}
                            className={InputBase} />
                    </div>
                    <div>
                        <label className={LabelClass}>Category</label>
                        <input value={draft.category}
                            onChange={(e) => set({ category: e.target.value })}
                            placeholder="e.g. Infection Control" className={InputBase} />
                    </div>
                    <div>
                        <label className={LabelClass}>Difficulty</label>
                        <SelectField value={draft.difficulty}
                            onValueChange={(v) => set({ difficulty: v })}
                            options={[
                                { value: "beginner", label: "Beginner" },
                                { value: "intermediate", label: "Intermediate" },
                                { value: "advanced", label: "Advanced" },
                                { value: "expert", label: "Expert" },
                            ]} />
                    </div>
                </div>
            </section>

            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3
                                flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {update.isPending ? "Saving…"
                        : isDirty ? "You have unsaved changes"
                            : "All changes saved"}
                </span>
                <button onClick={handleSave} disabled={!isDirty || update.isPending}
                    className={PrimaryBtn} style={{ touchAction: "manipulation" }}>
                    {update.isPending ? "Saving…" : "Save changes"}
                </button>
            </section>
        </div>
    );
}