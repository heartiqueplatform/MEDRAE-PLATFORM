// src/staff-cpd/admin/ActivityEditorPage.tsx
import { useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    ChevronLeft, Plus, Trash2, Upload, ShieldCheck, AlertCircle, GripVertical,
    Image as ImageIcon, CheckCircle2, Clock, Award, BookOpen,
} from "lucide-react";
import { useAdminActivity } from "../lib/admin-hooks";
import {
    useUpdateActivity, usePublishActivity,
    useCreateModule, useUpdateModule, useDeleteModule,
    useCreateContentItem, useDeleteContentItem,
    useCreateAssessment, useDeleteAssessment,
    useAssessmentQuestions, useAttachQuestion, useDetachQuestion,
    useUploadThumbnail,
} from "../lib/admin-hooks";
import { useAdminQuestions } from "../lib/admin-hooks";
import { ContentTypeChip, CpdEmptyState } from "../components";
import { CONTENT_LABEL, validateContentItem, fmtHours, fmtPoints } from "../lib";
import type { ContentType, ExternalProvider } from "../lib";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (p: number | number[] = 15) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};
const tap = (type: "light" | "success" | "warning" = "light") => {
    try { playSound("ui-tap"); } catch { /* no-op */ }
    if (type === "success") vibrate([15, 30, 15]);
    else if (type === "warning") vibrate(40);
    else vibrate(12);
};

/* ------------------------------------------------------------------ */
/*  Status tones                                                      */
/* ------------------------------------------------------------------ */

const STATUS_TONES: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300",
    review: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
    published: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
    archived: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400",
};

const getStatusTone = (status?: string) =>
    STATUS_TONES[(status ?? "").toLowerCase()] ?? STATUS_TONES.draft;

/* ------------------------------------------------------------------ */
/*  Shared styles                                                     */
/* ------------------------------------------------------------------ */

const InputBase = "w-full h-10 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none";
const TextareaBase = "w-full rounded-xl bg-white dark:bg-[#161b22] px-3 py-2 text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none resize-y";
const PrimaryBtn = "h-10 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";
const SecondaryBtn = "h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";
const DangerBtn = "h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400 flex items-center justify-center active:scale-[0.92] transition-transform";

const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
        {children}
    </label>
);

/* ═══════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════ */
export default function ActivityEditorPage() {
    const { id = "" } = useParams();
    const nav = useNavigate();
    const q = useAdminActivity(id);

    if (q.isLoading || !q.data) {
        return (
            <div className="px-4 pt-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                ))}
            </div>
        );
    }

    const { activity, modules, contentByModule, assessments } = q.data;

    return <ActivityEditorBody activity={activity} modules={modules} contentByModule={contentByModule} assessments={assessments} />;
}

function ActivityEditorBody({ activity, modules, contentByModule, assessments }: any) {
    const nav = useNavigate();
    const [tab, setTab] = useState<"basics" | "modules" | "assessments" | "publish">("basics");

    const tabs = [
        { id: "basics", label: "Basics" },
        { id: "modules", label: "Modules" },
        { id: "assessments", label: "Assessments" },
        { id: "publish", label: "Publish" },
    ] as const;

    return (
        <div className="px-4 pt-3 pb-16 space-y-3 max-w-[880px] mx-auto">
            {/* Header card */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
                <div className="flex items-start gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4" strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight truncate">
                            {activity.title || "Untitled Activity"}
                        </h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5
                                              text-[10px] font-bold capitalize ${getStatusTone(activity.status)}`}>
                                {activity.status}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium
                                             text-slate-500 dark:text-slate-400">
                                <Clock className="h-3 w-3" />
                                {fmtHours(activity.learning_hours)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium
                                             text-slate-500 dark:text-slate-400">
                                <Award className="h-3 w-3" />
                                {fmtPoints(activity.configured_cpd_points)} pts
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tab strip */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                {tabs.map((t) => {
                    const active = tab === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => { tap(); setTab(t.id); }}
                            className={`shrink-0 h-9 px-3 rounded-xl text-[11px] font-bold
                                        active:scale-[0.97] transition-transform
                                        ${active
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"
                                }`}
                            style={{ touchAction: "manipulation" }}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}
            {tab === "basics" && <BasicsTab activity={activity} />}
            {tab === "modules" && <ModulesTab activityId={activity.id} modules={modules} contentByModule={contentByModule} />}
            {tab === "assessments" && <AssessmentsTab activityId={activity.id} assessments={assessments} />}
            {tab === "publish" && <PublishTab activity={activity} />}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   BASICS
   ═══════════════════════════════════════════════════════════════ */
function BasicsTab({ activity }: { activity: any }) {
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
            {/* Thumbnail card */}
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
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white">
                            Cover image
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            JPG, PNG, WebP · Max 5 MB
                        </p>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
                        <button
                            onClick={() => { tap(); fileRef.current?.click(); }}
                            disabled={upload.isPending}
                            className={SecondaryBtn}
                            style={{ touchAction: "manipulation" }}
                        >
                            <Upload className="h-3.5 w-3.5" />
                            {upload.isPending ? "Uploading…" : "Upload image"}
                        </button>
                    </div>
                </div>
            </section>

            {/* Fields card */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                <div>
                    <Label>Title</Label>
                    <input
                        value={draft.title}
                        onChange={(e) => set({ title: e.target.value })}
                        placeholder="Activity title"
                        className={InputBase}
                    />
                </div>

                <div>
                    <Label>Short description</Label>
                    <input
                        value={draft.short_description}
                        onChange={(e) => set({ short_description: e.target.value })}
                        placeholder="A one-line summary"
                        className={InputBase}
                    />
                </div>

                <div>
                    <Label>Full description</Label>
                    <textarea
                        value={draft.description}
                        onChange={(e) => set({ description: e.target.value })}
                        placeholder="Detailed description of the activity…"
                        rows={5}
                        className={TextareaBase}
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label>Learning hours</Label>
                        <input
                            type="number"
                            step="0.25"
                            min={0}
                            value={draft.learning_hours}
                            onChange={(e) => set({ learning_hours: Number(e.target.value) })}
                            className={InputBase}
                        />
                    </div>
                    <div>
                        <Label>CPD points</Label>
                        <input
                            type="number"
                            step="0.25"
                            min={0}
                            value={draft.configured_cpd_points}
                            onChange={(e) => set({ configured_cpd_points: Number(e.target.value) })}
                            className={InputBase}
                        />
                    </div>
                    <div>
                        <Label>Category</Label>
                        <input
                            value={draft.category}
                            onChange={(e) => set({ category: e.target.value })}
                            placeholder="e.g. Infection Control"
                            className={InputBase}
                        />
                    </div>
                    <div>
                        <Label>Difficulty</Label>
                        <select
                            value={draft.difficulty}
                            onChange={(e) => set({ difficulty: e.target.value })}
                            className={InputBase}
                        >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                            <option value="expert">Expert</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Save bar */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3
                                flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {update.isPending
                        ? "Saving…"
                        : isDirty
                            ? "You have unsaved changes"
                            : "All changes saved"}
                </span>
                <button
                    onClick={handleSave}
                    disabled={!isDirty || update.isPending}
                    className={PrimaryBtn}
                    style={{ touchAction: "manipulation" }}
                >
                    {update.isPending ? "Saving…" : "Save changes"}
                </button>
            </section>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MODULES
   ═══════════════════════════════════════════════════════════════ */
function ModulesTab({ activityId, modules, contentByModule }: any) {
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
                style={{ touchAction: "manipulation" }}
            >
                <Plus className="h-3.5 w-3.5" />
                Add Module
            </button>

            {modules.length === 0 && (
                <CpdEmptyState
                    title="No modules yet"
                    hint="Add your first module to start attaching content items."
                />
            )}

            {modules.map((m: any, idx: number) => (
                <ModuleCard
                    key={m.id}
                    activityId={activityId}
                    module={m}
                    position={idx}
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

function ModuleCard({ activityId, module: m, contentItems, onDelete }: any) {
    const createItem = useCreateContentItem();
    const deleteItem = useDeleteContentItem();
    const [adding, setAdding] = useState(false);

    return (
        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
            {/* Header */}
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

            {/* Content items */}
            <div className="space-y-1.5">
                {contentItems.map((c: any) => (
                    <div
                        key={c.id}
                        className="flex items-center justify-between gap-2 rounded-xl
                                   bg-slate-50 dark:bg-[#0d1117] px-3 py-2"
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <ContentTypeChip type={c.content_type} />
                            <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">
                                    {c.title}
                                </p>
                                {c.external_url && (
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">
                                        {c.external_url}
                                    </p>
                                )}
                            </div>
                            {c.is_required && (
                                <span className="inline-flex items-center rounded-full px-1.5 py-0.5
                                                 text-[9px] font-bold shrink-0
                                                 bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400">
                                    REQ
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => { tap("warning"); deleteItem.mutate({ id: c.id, activity_id: activityId }); }}
                            className={DangerBtn + " !h-8 !w-8"}
                            aria-label="Delete content"
                            style={{ touchAction: "manipulation" }}
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add content */}
            {adding ? (
                <NewContentForm
                    onCancel={() => setAdding(false)}
                    onSubmit={(input) => {
                        createItem.mutate({
                            ...input,
                            module_id: m.id,
                            activity_id: activityId,
                            position: contentItems.length,
                        });
                        setAdding(false);
                    }}
                />
            ) : (
                <button
                    onClick={() => { tap(); setAdding(true); }}
                    className={SecondaryBtn + " w-full !h-9"}
                    style={{ touchAction: "manipulation" }}
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add content item
                </button>
            )}
        </section>
    );
}

function NewContentForm({ onSubmit, onCancel }: { onSubmit: (v: any) => void; onCancel: () => void }) {
    const [type, setType] = useState<ContentType>("video");
    const [provider, setProvider] = useState<ExternalProvider>("youtube");
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [duration, setDuration] = useState<number | "">("");
    const [required, setRequired] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const handleTypeChange = (t: ContentType) => {
        setType(t);
        if (t === "video") setProvider("youtube");
        else if (t === "podcast") setProvider("apple_podcasts");
        else if (t === "article" || t === "text" || t === "case_study") setProvider("internal");
        else if (t === "pdf" || t === "external_resource" || t === "webinar") setProvider("external");
        else if (t === "quiz" || t === "assessment") setProvider("internal");
    };

    const handle = () => {
        setErr(null);
        const payload: any = {
            content_type: type,
            external_provider: provider,
            title,
            external_url: url || null,
            duration_seconds: typeof duration === "number" ? duration : null,
            is_required: required,
        };
        const check = validateContentItem(payload);
        if (!check.ok) { setErr(check.reason ?? "Invalid"); return; }
        tap("success");
        onSubmit({ ...payload, ...(check.normalized ?? {}) });
    };

    return (
        <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
                <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value as ContentType)}
                    className={InputBase + " !h-9"}
                >
                    {Object.entries(CONTENT_LABEL).map(([k, label]) => (
                        <option key={k} value={k}>{label}</option>
                    ))}
                </select>
                <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as ExternalProvider)}
                    className={InputBase + " !h-9"}
                >
                    <option value="youtube">YouTube</option>
                    <option value="apple_podcasts">Apple Podcasts</option>
                    <option value="external">External URL</option>
                    <option value="internal">Internal (text)</option>
                </select>
            </div>

            <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Content title"
                className={InputBase + " !h-9"}
            />
            <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className={InputBase + " !h-9"}
            />

            <div className="grid grid-cols-2 gap-2 items-center">
                <input
                    type="number"
                    min={0}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Duration (s)"
                    className={InputBase + " !h-9"}
                />
                <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer px-1">
                    <input
                        type="checkbox"
                        checked={required}
                        onChange={(e) => setRequired(e.target.checked)}
                        className="w-4 h-4 accent-blue-600"
                    />
                    Required
                </label>
            </div>

            {err && (
                <p className="text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3 w-3" /> {err}
                </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
                <button
                    onClick={onCancel}
                    className={SecondaryBtn + " !h-9"}
                    style={{ touchAction: "manipulation" }}
                >
                    Cancel
                </button>
                <button
                    onClick={handle}
                    disabled={!title}
                    className={PrimaryBtn + " !h-9"}
                    style={{ touchAction: "manipulation" }}
                >
                    Add
                </button>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   ASSESSMENTS
   ═══════════════════════════════════════════════════════════════ */
function AssessmentsTab({ activityId, assessments }: any) {
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
                style={{ touchAction: "manipulation" }}
            >
                <Plus className="h-3.5 w-3.5" />
                Add Assessment
            </button>

            {assessments.length === 0 && (
                <CpdEmptyState
                    title="No assessment yet"
                    hint="Add an assessment so nurses can prove their knowledge at the end."
                />
            )}

            {assessments.map((a: any) => (
                <AssessmentCard
                    key={a.id}
                    assessment={a}
                    activityId={activityId}
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

function AssessmentCard({ assessment, activityId, onDelete }: any) {
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
                <button
                    onClick={onDelete}
                    className={DangerBtn}
                    aria-label="Delete assessment"
                    style={{ touchAction: "manipulation" }}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>

            <div className="space-y-1.5">
                {attached.map((row) => (
                    <div
                        key={row.id}
                        className="flex items-center justify-between gap-2 rounded-xl
                                   bg-slate-50 dark:bg-[#0d1117] px-3 py-2"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-medium text-slate-900 dark:text-white truncate">
                                {row.question?.question}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="inline-flex items-center rounded-full px-1.5 py-0.5
                                                 text-[9px] font-bold capitalize
                                                 bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                                    {row.question?.question_type?.replace("_", " ")}
                                </span>
                                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                                    {row.points} pt
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => { tap("warning"); detach.mutate({ id: row.id, assessment_id: assessment.id }); }}
                            className={DangerBtn + " !h-8 !w-8"}
                            aria-label="Detach question"
                            style={{ touchAction: "manipulation" }}
                        >
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
                <button
                    onClick={() => { tap(); setPicking(true); }}
                    className={SecondaryBtn + " w-full !h-9"}
                    style={{ touchAction: "manipulation" }}
                >
                    <Plus className="h-3.5 w-3.5" />
                    Attach question from bank
                </button>
            )}
        </section>
    );
}

function QuestionPicker({ onPick, onCancel }: { onPick: (id: string) => void; onCancel: () => void }) {
    const [search, setSearch] = useState("");
    const q = useAdminQuestions({ search });
    const items = q.data?.pages.flatMap(p => p.items) ?? [];

    return (
        <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-2">
            <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search question bank…"
                className={InputBase + " !h-9"}
            />

            <div className="max-h-64 overflow-y-auto no-scrollbar space-y-1.5">
                {items.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onPick(item.id)}
                        className="w-full text-left rounded-xl bg-white dark:bg-[#161b22] p-2.5
                                   active:bg-slate-100 dark:active:bg-white/[0.08]
                                   transition-colors"
                        style={{ touchAction: "manipulation" }}
                    >
                        <p className="text-[12px] font-medium text-slate-900 dark:text-white truncate">
                            {item.question}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize mt-0.5">
                            {item.question_type.replace("_", " ")}
                        </p>
                    </button>
                ))}
                {!items.length && !q.isLoading && (
                    <p className="text-[11px] text-slate-400 text-center py-4">No questions match.</p>
                )}
            </div>

            <div className="flex justify-end">
                <button
                    onClick={onCancel}
                    className={SecondaryBtn + " !h-9"}
                    style={{ touchAction: "manipulation" }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   PUBLISH
   ═══════════════════════════════════════════════════════════════ */
function PublishTab({ activity }: { activity: any }) {
    const publish = usePublishActivity();
    const update = useUpdateActivity();
    const [error, setError] = useState<string | null>(null);

    const handlePublish = async () => {
        setError(null);
        tap("success");
        try {
            await publish.mutateAsync(activity.id);
        } catch (e: any) {
            setError(e?.message ?? "Publish failed");
        }
    };

    return (
        <div className="space-y-3">
            {/* Status card */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-4 w-4" strokeWidth={2.4} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Current status
                        </p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 mt-0.5
                                          text-[10px] font-bold capitalize ${getStatusTone(activity.status)}`}>
                            {activity.status}
                        </span>
                    </div>
                </div>

                <div className="rounded-xl bg-blue-50 dark:bg-blue-400/10 p-3">
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Publishing validates: at least one module, at least one content item,
                        all external URLs start with http(s). On success, status becomes{" "}
                        <b className="text-blue-700 dark:text-blue-400">published</b> and the
                        activity appears in the nurse catalog.
                    </p>
                </div>

                {error && (
                    <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-400/10 p-3">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-snug">
                            {error}
                        </p>
                    </div>
                )}

                {activity.status === "published" && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-400/10 p-3">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                            Live in catalog since {new Date(activity.published_at).toLocaleDateString()}
                        </p>
                    </div>
                )}
            </section>

            {/* Actions card */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2">
                <button
                    onClick={handlePublish}
                    disabled={publish.isPending}
                    className={PrimaryBtn + " w-full"}
                    style={{ touchAction: "manipulation" }}
                >
                    {publish.isPending ? "Publishing…" : "Publish"}
                </button>
                <button
                    onClick={() => { tap(); update.mutate({ id: activity.id, patch: { status: "review" } }); }}
                    className={SecondaryBtn + " w-full"}
                    style={{ touchAction: "manipulation" }}
                >
                    Submit for review
                </button>
                <button
                    onClick={() => {
                        tap("warning");
                        update.mutate({
                            id: activity.id,
                            patch: { status: "archived", archived_at: new Date().toISOString() },
                        });
                    }}
                    className="w-full h-10 px-4 rounded-xl bg-rose-50 dark:bg-rose-400/10
                               text-rose-700 dark:text-rose-400 text-[13px] font-bold
                               active:scale-[0.97] transition-transform"
                    style={{ touchAction: "manipulation" }}
                >
                    Archive
                </button>
            </section>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Inline-editable module title
   ───────────────────────────────────────────────────────────── */
function ModuleTitleInput({ module: m, activityId }: { module: any; activityId: string }) {
    const update = useUpdateModule();
    const [local, setLocal] = useState(m.title);

    const lastIdRef = useRef(m.id);
    if (lastIdRef.current !== m.id) {
        lastIdRef.current = m.id;
        setLocal(m.title);
    }

    const commit = () => {
        const trimmed = local.trim();
        if (!trimmed || trimmed === m.title) return;
        update.mutate({ id: m.id, activity_id: activityId, patch: { title: trimmed } });
    };

    return (
        <input
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                    setLocal(m.title);
                    (e.target as HTMLInputElement).blur();
                }
            }}
            className="flex-1 h-9 rounded-lg bg-transparent px-2 text-[13px] font-bold
                       text-slate-900 dark:text-white
                       outline-none focus:bg-slate-50 dark:focus:bg-white/[0.06]
                       transition-colors max-w-md"
        />
    );
}