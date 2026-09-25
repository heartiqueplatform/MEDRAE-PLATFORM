// src/staff-cpd/admin/ActivityEditorPage.tsx
import { useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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

// Status pill tones — mirrors ActivitiesListPage
const STATUS_TONES: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    archived: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const getStatusTone = (status?: string) =>
    STATUS_TONES[(status ?? "").toLowerCase()] ?? STATUS_TONES.draft;

// Shared input styling for consistency
const inputCls =
    "h-11 md:h-12 rounded-lg md:rounded-2xl bg-gray-100 dark:bg-gray-900 border-2 border-transparent text-sm md:text-base font-medium focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none shadow-inner";

export default function ActivityEditorPage() {
    const { id = "" } = useParams();
    const nav = useNavigate();
    const q = useAdminActivity(id);

    if (q.isLoading || !q.data) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center">
                <div className="w-full md:max-w-full md:px-4 lg:px-6 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 space-y-3 px-[4px] md:px-0">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-24 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    const { activity, modules, contentByModule, assessments } = q.data;

    return (
        <div className="min-h-screen w-full flex flex-col items-center">
            <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-4 md:space-y-5 px-0 sm:px-6 pt-4 sm:pt-8 pb-8">

                {/* BACK LINK */}
                <div className="px-[4px] md:px-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => nav("/cpd/admin/activities")}
                        className="rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold -ml-2"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        All activities
                    </Button>
                </div>

                {/* HERO HEADER CARD */}
                <Card className="relative overflow-hidden md:shadow-xl md:shadow-blue-500/5 transition-all rounded-none md:rounded-xl border-0 bg-transparent dark:bg-transparent border-b border-gray-100 dark:border-gray-800 md:border-b-0">
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative px-4 md:px-6 pt-4 md:pt-6 pb-4 md:pb-6">
                        <div className="flex items-start gap-3 md:gap-4 min-w-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                                <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={2.4} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight truncate">
                                    {activity.title || "Untitled Activity"}
                                </h1>
                                <div className="flex items-center gap-2 md:gap-3 mt-1.5 flex-wrap">
                                    <span
                                        className={`text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full capitalize ${getStatusTone(activity.status)}`}
                                    >
                                        {activity.status}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        <Clock className="w-3 h-3" />
                                        {fmtHours(activity.learning_hours)}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        <Award className="w-3 h-3" />
                                        {fmtPoints(activity.configured_cpd_points)} pts
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* TABS */}
                <Tabs defaultValue="basics" className="px-[4px] md:px-0">
                    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                        <TabsList className="inline-flex w-auto h-11 md:h-12 rounded-xl md:rounded-2xl bg-gray-100 dark:bg-gray-900 border-2 border-transparent p-1 gap-1">
                            <TabsTrigger
                                value="basics"
                                className="rounded-lg md:rounded-xl px-3 md:px-4 h-full text-xs md:text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                            >
                                Basics
                            </TabsTrigger>
                            <TabsTrigger
                                value="modules"
                                className="rounded-lg md:rounded-xl px-3 md:px-4 h-full text-xs md:text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                            >
                                Modules & Content
                            </TabsTrigger>
                            <TabsTrigger
                                value="assessments"
                                className="rounded-lg md:rounded-xl px-3 md:px-4 h-full text-xs md:text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                            >
                                Assessments
                            </TabsTrigger>
                            <TabsTrigger
                                value="publish"
                                className="rounded-lg md:rounded-xl px-3 md:px-4 h-full text-xs md:text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                            >
                                Publish
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="basics" className="mt-4 md:mt-5">
                        <BasicsTab activity={activity} />
                    </TabsContent>

                    <TabsContent value="modules" className="mt-4 md:mt-5">
                        <ModulesTab activityId={activity.id} modules={modules} contentByModule={contentByModule} />
                    </TabsContent>

                    <TabsContent value="assessments" className="mt-4 md:mt-5">
                        <AssessmentsTab activityId={activity.id} assessments={assessments} />
                    </TabsContent>

                    <TabsContent value="publish" className="mt-4 md:mt-5">
                        <PublishTab activity={activity} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// BASICS
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// BASICS
// ═══════════════════════════════════════════════════════════════
function BasicsTab({ activity }: { activity: any }) {
    const update = useUpdateActivity();
    const upload = useUploadThumbnail();
    const fileRef = useRef<HTMLInputElement>(null);

    // ── Local draft state — no network calls while typing ──
    const [draft, setDraft] = useState({
        title: activity.title ?? "",
        short_description: activity.short_description ?? "",
        description: activity.description ?? "",
        category: activity.category ?? "",
        difficulty: activity.difficulty ?? "intermediate",
        learning_hours: activity.learning_hours ?? 0,
        configured_cpd_points: activity.configured_cpd_points ?? 0,
    });

    // Reset draft if the underlying activity id changes (switching activities)
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

    const set = (patch: Partial<typeof draft>) =>
        setDraft((d) => ({ ...d, ...patch }));

    const handleSave = async () => {
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
        const url = await upload.mutateAsync({ file, activityId: activity.id });
        await update.mutateAsync({ id: activity.id, patch: { thumbnail_url: url } });
    };

    return (
        <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70">
            <CardContent className="p-4 md:p-6 space-y-4 md:space-y-5">

                {/* Thumbnail */}
                <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="w-full sm:w-40 h-32 sm:h-24 rounded-xl bg-gray-100 dark:bg-gray-900 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {activity.thumbnail_url ? (
                            <img src={activity.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-white/70" />
                            </div>
                        )}
                    </div>
                    <div className="space-y-2 flex-1 min-w-0">
                        <p className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100">Cover image</p>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">JPG, PNG, WebP. Max 5 MB.</p>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fileRef.current?.click()}
                            disabled={upload.isPending}
                            className="h-10 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 font-bold text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all"
                        >
                            <Upload className="h-3.5 w-3.5 mr-1" />
                            {upload.isPending ? "Uploading…" : "Upload image"}
                        </Button>
                    </div>
                </div>

                {/* Fields */}
                <div className="space-y-3 md:space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div>
                        <label className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</label>
                        <Input
                            value={draft.title}
                            onChange={(e) => set({ title: e.target.value })}
                            placeholder="Activity title"
                            className={`mt-1.5 ${inputCls}`}
                        />
                    </div>

                    <div>
                        <label className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Short description</label>
                        <Input
                            value={draft.short_description}
                            onChange={(e) => set({ short_description: e.target.value })}
                            placeholder="A one-line summary"
                            className={`mt-1.5 ${inputCls}`}
                        />
                    </div>

                    <div>
                        <label className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Full description</label>
                        <Textarea
                            value={draft.description}
                            onChange={(e) => set({ description: e.target.value })}
                            placeholder="Detailed description of the activity…"
                            rows={5}
                            className="mt-1.5 rounded-lg md:rounded-2xl bg-gray-100 dark:bg-gray-900 border-2 border-transparent text-sm md:text-base font-medium focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none shadow-inner resize-y"
                        />
                    </div>
                </div>

                {/* Meta grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div>
                        <label className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Learning hours</label>
                        <Input
                            type="number" step="0.25" min={0}
                            value={draft.learning_hours}
                            onChange={(e) => set({ learning_hours: Number(e.target.value) })}
                            className={`mt-1.5 ${inputCls}`}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">CPD points</label>
                        <Input
                            type="number" step="0.25" min={0}
                            value={draft.configured_cpd_points}
                            onChange={(e) => set({ configured_cpd_points: Number(e.target.value) })}
                            className={`mt-1.5 ${inputCls}`}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</label>
                        <Input
                            value={draft.category}
                            onChange={(e) => set({ category: e.target.value })}
                            placeholder="e.g. Infection Control"
                            className={`mt-1.5 ${inputCls}`}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Difficulty</label>
                        <Select value={draft.difficulty} onValueChange={(v) => set({ difficulty: v })}>
                            <SelectTrigger className={`mt-1.5 ${inputCls}`}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-0 shadow-xl">
                                <SelectItem value="beginner">Beginner</SelectItem>
                                <SelectItem value="intermediate">Intermediate</SelectItem>
                                <SelectItem value="advanced">Advanced</SelectItem>
                                <SelectItem value="expert">Expert</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Sticky Save bar */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800 flex-wrap gap-3">
                    <span className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
                        {update.isPending
                            ? "Saving…"
                            : isDirty
                                ? "You have unsaved changes"
                                : "All changes saved"}
                    </span>
                    <Button
                        onClick={handleSave}
                        disabled={!isDirty || update.isPending}
                        className="h-11 md:h-12 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/20 px-5 disabled:opacity-40 disabled:shadow-none"
                    >
                        {update.isPending ? "Saving…" : "Save changes"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════
// MODULES & CONTENT
// ═══════════════════════════════════════════════════════════════
function ModulesTab({ activityId, modules, contentByModule }: any) {
    const createModule = useCreateModule();
    const deleteModule = useDeleteModule();

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button
                    onClick={() => createModule.mutate({
                        activity_id: activityId,
                        title: `Module ${modules.length + 1}`,
                        position: modules.length,
                    })}
                    disabled={createModule.isPending}
                    className="h-11 md:h-12 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/20 px-4 md:px-5 flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" /> Add Module
                </Button>
            </div>

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
        <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70 overflow-hidden">
            <CardHeader className="pb-3 px-4 md:px-5 pt-4 md:pt-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <ModuleTitleInput module={m} activityId={activityId} />
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onDelete}
                        className="h-9 w-9 p-0 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 flex-shrink-0"
                    >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                </div>
                {m.description && (
                    <CardDescription className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {m.description}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="space-y-2 px-4 md:px-5 pb-4 md:pb-5">
                {contentItems.map((c: any) => (
                    <div
                        key={c.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 p-3 border-0"
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <ContentTypeChip type={c.content_type} />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{c.title}</p>
                                {c.external_url && (
                                    <p className="text-[10px] md:text-[11px] text-gray-400 dark:text-gray-500 truncate">{c.external_url}</p>
                                )}
                            </div>
                            {c.is_required && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 flex-shrink-0">
                                    REQUIRED
                                </span>
                            )}
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 flex-shrink-0"
                            onClick={() => deleteItem.mutate({ id: c.id, activity_id: activityId })}
                        >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                        </Button>
                    </div>
                ))}

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
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAdding(true)}
                        className="h-10 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 font-bold text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all w-full"
                    >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add content item
                    </Button>
                )}
            </CardContent>
        </Card>
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
        onSubmit({ ...payload, ...(check.normalized ?? {}) });
    };

    return (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-3 md:p-4 space-y-3 border-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                <Select value={type} onValueChange={(v) => handleTypeChange(v as ContentType)}>
                    <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl border-0 shadow-xl">
                        {Object.entries(CONTENT_LABEL).map(([k, label]) => (
                            <SelectItem key={k} value={k}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={provider} onValueChange={(v) => setProvider(v as ExternalProvider)}>
                    <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl border-0 shadow-xl">
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="apple_podcasts">Apple Podcasts</SelectItem>
                        <SelectItem value="external">External URL</SelectItem>
                        <SelectItem value="internal">Internal (text)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Content title"
                className={inputCls}
            />
            <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className={inputCls}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 items-center">
                <Input
                    type="number" min={0}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Duration (seconds, optional)"
                    className={inputCls}
                />
                <label className="flex items-center gap-2 text-xs md:text-sm font-medium cursor-pointer px-1">
                    <input
                        type="checkbox"
                        checked={required}
                        onChange={(e) => setRequired(e.target.checked)}
                        className="rounded"
                    />
                    Required to complete activity
                </label>
            </div>

            {err && (
                <p className="text-[11px] md:text-xs text-rose-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3 w-3" /> {err}
                </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onCancel}
                    className="h-10 rounded-xl font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    Cancel
                </Button>
                <Button
                    size="sm"
                    onClick={handle}
                    disabled={!title}
                    className="h-10 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 px-5"
                >
                    Add
                </Button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ASSESSMENTS
// ═══════════════════════════════════════════════════════════════
function AssessmentsTab({ activityId, assessments }: any) {
    const createAssessment = useCreateAssessment();
    const deleteAssessment = useDeleteAssessment();

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button
                    onClick={() => createAssessment.mutate({
                        activity_id: activityId,
                        title: "Final Assessment",
                        pass_mark: 70,
                        attempt_limit: null,
                        randomize_questions: true,
                    })}
                    disabled={createAssessment.isPending}
                    className="h-11 md:h-12 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/20 px-4 md:px-5 flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" /> Add Assessment
                </Button>
            </div>

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
        <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70 overflow-hidden">
            <CardHeader className="pb-3 px-4 md:px-5 pt-4 md:pt-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <CardTitle className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                            {assessment.title}
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Pass mark {assessment.pass_mark}% · {attached.length} question{attached.length === 1 ? "" : "s"}
                            {assessment.attempt_limit ? ` · max ${assessment.attempt_limit} attempts` : ""}
                        </CardDescription>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onDelete}
                        className="h-9 w-9 p-0 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 flex-shrink-0"
                    >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-2 px-4 md:px-5 pb-4 md:pb-5">
                {attached.map((row) => (
                    <div
                        key={row.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 p-3 border-0"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {row.question?.question}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 capitalize">
                                    {row.question?.question_type?.replace("_", " ")}
                                </span>
                                <span className="text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                    {row.points} pt
                                </span>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 flex-shrink-0"
                            onClick={() => detach.mutate({ id: row.id, assessment_id: assessment.id })}
                        >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                        </Button>
                    </div>
                ))}

                {picking ? (
                    <QuestionPicker
                        onCancel={() => setPicking(false)}
                        onPick={(questionId) => {
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
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPicking(true)}
                        className="h-10 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 font-bold text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all w-full"
                    >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Attach question from bank
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

function QuestionPicker({ onPick, onCancel }: { onPick: (id: string) => void; onCancel: () => void }) {
    const [search, setSearch] = useState("");
    const q = useAdminQuestions({ search });
    const items = q.data?.pages.flatMap(p => p.items) ?? [];

    return (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-3 md:p-4 space-y-3 border-0">
            <div className="relative group">
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search question bank…"
                    className={`pl-9 md:pl-11 ${inputCls}`}
                />
                <svg
                    className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                </svg>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5">
                {items.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onPick(item.id)}
                        className="w-full text-left rounded-xl bg-white dark:bg-gray-800 border-0 p-3 text-sm hover:shadow-md hover:ring-2 hover:ring-blue-500/30 transition-all"
                    >
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.question}</p>
                        <p className="text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 capitalize mt-1">
                            {item.question_type.replace("_", " ")}
                        </p>
                    </button>
                ))}
                {!items.length && !q.isLoading && (
                    <p className="text-xs text-gray-400 text-center py-6">No questions match.</p>
                )}
            </div>

            <div className="flex justify-end">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onCancel}
                    className="h-10 rounded-xl font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    Cancel                </Button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// PUBLISH
// ═══════════════════════════════════════════════════════════════
function PublishTab({ activity }: { activity: any }) {
    const publish = usePublishActivity();
    const update = useUpdateActivity();
    const [error, setError] = useState<string | null>(null);

    const handlePublish = async () => {
        setError(null);
        try {
            await publish.mutateAsync(activity.id);
        } catch (e: any) {
            setError(e?.message ?? "Publish failed");
        }
    };

    return (
        <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70">
            <CardContent className="p-4 md:p-6 space-y-4 md:space-y-5">

                <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
                        <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.4} />
                    </div>
                    <div>
                        <p className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Current status
                        </p>
                        <span
                            className={`inline-block text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full capitalize mt-0.5 ${getStatusTone(activity.status)}`}
                        >
                            {activity.status}
                        </span>
                    </div>
                </div>

                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4">
                    <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        Publishing validates: at least one module, at least one content item,
                        all external URLs start with http(s). On success, status becomes{" "}
                        <b className="text-blue-700 dark:text-blue-300">published</b> and the
                        activity appears in the nurse catalog.
                    </p>
                </div>

                {error && (
                    <div className="flex items-start gap-2 text-xs md:text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/20 rounded-xl p-3 md:p-4">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                <div className="flex gap-2 flex-wrap pt-1">
                    <Button
                        onClick={handlePublish}
                        disabled={publish.isPending}
                        className="h-11 md:h-12 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/20 px-5"
                    >
                        {publish.isPending ? "Publishing…" : "Publish"}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => update.mutate({ id: activity.id, patch: { status: "review" } })}
                        className="h-11 md:h-12 rounded-2xl font-bold border-2 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-amber-400 hover:text-amber-600 transition-all px-5"
                    >
                        Submit for review
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => update.mutate({
                            id: activity.id,
                            patch: { status: "archived", archived_at: new Date().toISOString() },
                        })}
                        className="h-11 md:h-12 rounded-2xl font-bold border-2 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-rose-400 hover:text-rose-600 transition-all px-5"
                    >
                        Archive
                    </Button>
                </div>

                {activity.status === "published" && (
                    <div className="flex items-center gap-2 text-xs md:text-sm text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3">
                        <CheckCircle2 className="h-4 w-4" />
                        Live in catalog since {new Date(activity.published_at).toLocaleDateString()}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
// ─────────────────────────────────────────────────────────────
// Inline-editable module title — saves on blur / Enter
// ─────────────────────────────────────────────────────────────
function ModuleTitleInput({ module: m, activityId }: { module: any; activityId: string }) {
    const update = useUpdateModule();
    const [local, setLocal] = useState(m.title);

    // Sync when switching between modules or when server data changes
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
        <Input
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
            className="h-10 md:h-11 text-sm md:text-base font-bold rounded-xl bg-gray-100 dark:bg-gray-900 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none shadow-inner max-w-md"
        />
    );
}