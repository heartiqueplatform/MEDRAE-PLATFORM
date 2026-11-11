// src/staff-cpd/admin.tsx
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    ChevronLeft, Plus, Trash2, ShieldCheck, AlertCircle, BookOpen,
    ClipboardCheck, Calendar, ListChecks, Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    useAdminActivities, useAdminActivity, useCreateActivity, useUpdateActivity, usePublishActivity,
    useCreateModule, useDeleteModule, useCreateContentItem, useDeleteContentItem,
    useAdminQuestions, useCreateQuestion, useAdminCompletions, useAdminPeriods, useCreatePeriod,
} from "./hooks";
import { ContentTypeChip, CpdEmptyState } from "./components";
import { validateContentItem, fmtDate, fmtHours, fmtPoints, CONTENT_LABEL } from "./lib";
import type { ContentType, ExternalProvider } from "./lib";
import { playSound } from "@/lib/soundManager";
import { useHomeRoute } from "@/hooks/useHomeRoute";
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
/*  Shared shells                                                     */
/* ------------------------------------------------------------------ */

function FullScreen({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white"
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            {children}
        </div>
    );
}

function PageHeader({
    title,
    subtitle,
    onBack,
    rightSlot,
}: {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    rightSlot?: React.ReactNode;
}) {
    return (
        <header className="shrink-0 flex items-center gap-2 px-2 h-14
                           bg-white dark:bg-[#0d1117]
                           border-b border-slate-200/70 dark:border-white/[0.06]
                           z-30 safe-top">
            {onBack && (
                <button
                    onClick={onBack}
                    aria-label="Back"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
            )}
            <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {subtitle}
                    </p>
                )}
            </div>
            {rightSlot}
        </header>
    );
}

function ScrollBody({ children }: { children: React.ReactNode }) {
    return (
        <main
            className="flex-1 min-h-0 overflow-y-auto no-scrollbar"
            style={{ WebkitOverflowScrolling: "touch" }}
        >
            <div className="w-full max-w-[880px] mx-auto pb-16">{children}</div>
        </main>
    );
}

/* ------------------------------------------------------------------ */
/*  Common inputs (design-system)                                     */
/* ------------------------------------------------------------------ */

const InputBase = "w-full h-10 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none";

const TextareaBase = "w-full rounded-xl bg-white dark:bg-[#161b22] px-3 py-2 text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none resize-y";

const PrimaryBtn = "h-10 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50 disabled:active:scale-100";

const SecondaryBtn = "h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

const DangerBtn = "h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400 flex items-center justify-center active:scale-[0.92] transition-transform";

/* ═══════════════════════════════════════════════════════════════
   ADMIN — ACTIVITIES LIST  /cpd/admin/activities
   ═══════════════════════════════════════════════════════════════ */
export function CpdAdminActivitiesPage() {
    const [status, setStatus] = useState<string>("");
    const q = useAdminActivities({ status: status || undefined });
    const items = q.data?.pages.flatMap(p => p.items) ?? [];
    const create = useCreateActivity();
    const nav = useNavigate();

    const statuses = ["", "draft", "review", "published", "archived"];

    return (
        <FullScreen>
            <PageHeader
                title="CPD Activities"
                subtitle={`${items.length} total`}
                onBack={() => { tap(); nav(-1); }}
                rightSlot={
                    <button
                        onClick={async () => {
                            tap("success");
                            const a = await create.mutateAsync({ title: "Untitled Activity" });
                            nav(`/cpd/admin/activities/${a.id}`);
                        }}
                        disabled={create.isPending}
                        className={PrimaryBtn + " shrink-0"}
                        style={{ touchAction: "manipulation" }}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        New
                    </button>
                }
            />

            <ScrollBody>
                <div className="px-4 pt-4 space-y-3">
                    {/* Filter pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        {statuses.map((s) => {
                            const active = status === s;
                            const label = s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1);
                            return (
                                <button
                                    key={s || "all"}
                                    onClick={() => { tap(); setStatus(s); }}
                                    className={`shrink-0 h-8 px-3 rounded-full text-[11px] font-bold
                                                active:scale-[0.97] transition-transform
                                                ${active
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"
                                        }`}
                                    style={{ touchAction: "manipulation" }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {/* List */}
                    {q.isLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-16 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                            ))}
                        </div>
                    ) : items.length ? (
                        <>
                            <div className="space-y-2">
                                {items.map((a: any) => (
                                    <Link
                                        key={a.id}
                                        to={`/cpd/admin/activities/${a.id}`}
                                        onClick={() => tap()}
                                        className="block rounded-2xl bg-white dark:bg-[#161b22] p-4
                                                   active:scale-[0.99] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                                                    {a.title}
                                                </p>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                                    {fmtHours(a.learning_hours)} · {fmtPoints(a.configured_cpd_points)} pts · created {fmtDate(a.created_at)}
                                                </p>
                                            </div>
                                            <span className="inline-flex items-center rounded-full px-2 py-0.5 shrink-0
                                                             text-[10px] font-bold capitalize
                                                             bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                                                {a.status}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            {q.hasNextPage && (
                                <div className="flex justify-center pt-2">
                                    <button
                                        onClick={() => { tap(); q.fetchNextPage(); }}
                                        disabled={q.isFetchingNextPage}
                                        className={SecondaryBtn}
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {q.isFetchingNextPage ? "Loading…" : "Load more"}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <CpdEmptyState title="No activities yet" hint="Tap 'New' to create your first CPD activity." />
                    )}
                </div>
            </ScrollBody>
        </FullScreen>
    );
}

/* ═══════════════════════════════════════════════════════════════
   ADMIN — ACTIVITY EDITOR  /cpd/admin/activities/:id
   ═══════════════════════════════════════════════════════════════ */
export function CpdAdminActivityEditorPage() {
    const { id = "" } = useParams();
    const q = useAdminActivity(id);
    const update = useUpdateActivity();
    const publish = usePublishActivity();
    const createModule = useCreateModule();
    const deleteModule = useDeleteModule();
    const createItem = useCreateContentItem();
    const deleteItem = useDeleteContentItem();
    const nav = useNavigate();
    const home = useHomeRoute();
    const [tab, setTab] = useState<"basics" | "modules" | "assessments" | "publish">("basics");
    const [publishError, setPublishError] = useState<string | null>(null);

    if (q.isLoading || !q.data) {
        return (
            <FullScreen>
                <PageHeader title="Loading…" onBack={() => { tap(); nav(home); }} />
                <ScrollBody>
                    <div className="px-4 pt-4">
                        <div className="h-64 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                    </div>
                </ScrollBody>
            </FullScreen>
        );
    }
    const { activity, modules, contentByModule, assessments } = q.data;

    const patch = (p: any) => update.mutate({ id: activity.id, patch: p });

    const handlePublish = async () => {
        setPublishError(null);
        tap("success");
        try {
            await publish.mutateAsync(activity.id);
        } catch (e: any) {
            setPublishError(e?.message ?? "Publish failed");
        }
    };

    const tabs = [
        { id: "basics", label: "Basics" },
        { id: "modules", label: "Modules" },
        { id: "assessments", label: "Assessments" },
        { id: "publish", label: "Publish" },
    ] as const;

    return (
        <FullScreen>
            <PageHeader
                title={activity.title || "Untitled Activity"}
                subtitle={activity.status?.toUpperCase() || "DRAFT"}
                onBack={() => { tap(); nav("/cpd/admin/activities"); }}
                rightSlot={
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 shrink-0
                                     text-[10px] font-bold capitalize
                                     bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                        {activity.status}
                    </span>
                }
            />

            <ScrollBody>
                <div className="px-4 pt-3 space-y-3">
                    {/* Tab bar */}
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

                    {/* BASICS */}
                    {tab === "basics" && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2.5">
                            <input
                                value={activity.title}
                                onChange={(e) => patch({ title: e.target.value })}
                                placeholder="Title"
                                className={InputBase}
                            />
                            <input
                                value={activity.short_description ?? ""}
                                onChange={(e) => patch({ short_description: e.target.value })}
                                placeholder="Short description"
                                className={InputBase}
                            />
                            <textarea
                                value={activity.description ?? ""}
                                onChange={(e) => patch({ description: e.target.value })}
                                placeholder="Full description"
                                rows={5}
                                className={TextareaBase}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
                                        Learning hours
                                    </label>
                                    <input
                                        type="number"
                                        step="0.25"
                                        value={activity.learning_hours}
                                        onChange={(e) => patch({ learning_hours: Number(e.target.value) })}
                                        className={InputBase}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
                                        CPD points
                                    </label>
                                    <input
                                        type="number"
                                        step="0.25"
                                        value={activity.configured_cpd_points}
                                        onChange={(e) => patch({ configured_cpd_points: Number(e.target.value) })}
                                        className={InputBase}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
                                        Category
                                    </label>
                                    <input
                                        value={activity.category ?? ""}
                                        onChange={(e) => patch({ category: e.target.value })}
                                        placeholder="e.g. Clinical"
                                        className={InputBase}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
                                        Difficulty
                                    </label>
                                    <select
                                        value={activity.difficulty ?? "intermediate"}
                                        onChange={(e) => patch({ difficulty: e.target.value })}
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
                    )}

                    {/* MODULES */}
                    {tab === "modules" && (
                        <section className="space-y-3">
                            <button
                                onClick={() => {
                                    tap("success");
                                    createModule.mutate({
                                        activity_id: activity.id,
                                        title: `Module ${modules.length + 1}`,
                                        position: modules.length,
                                    });
                                }}
                                className={PrimaryBtn + " w-full"}
                                style={{ touchAction: "manipulation" }}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Module
                            </button>

                            {modules.length === 0 && (
                                <CpdEmptyState title="No modules yet" hint="Add a module to start adding content." />
                            )}

                            {modules.map((m) => (
                                <div key={m.id} className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                                            {m.title}
                                        </h3>
                                        <button
                                            onClick={() => { tap("warning"); deleteModule.mutate({ id: m.id, activityId: activity.id }); }}
                                            className={DangerBtn}
                                            aria-label="Delete module"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {(contentByModule[m.id] ?? []).map((c) => (
                                        <div
                                            key={c.id}
                                            className="flex items-center justify-between gap-2 rounded-xl
                                                       bg-slate-50 dark:bg-[#0d1117] px-3 py-2"
                                        >
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <ContentTypeChip type={c.content_type} />
                                                <span className="text-[12px] font-medium text-slate-900 dark:text-white truncate">
                                                    {c.title}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => { tap("warning"); deleteItem.mutate({ id: c.id, activityId: activity.id }); }}
                                                className={DangerBtn + " !h-8 !w-8"}
                                                aria-label="Delete content"
                                                style={{ touchAction: "manipulation" }}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}

                                    <NewContentItemForm
                                        onSubmit={(input) => createItem.mutate({ ...input, module_id: m.id, activity_id: activity.id })}
                                    />
                                </div>
                            ))}
                        </section>
                    )}

                    {/* ASSESSMENTS */}
                    {tab === "assessments" && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                            <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                Assessment authoring lives on a dedicated page. {assessments.length} configured.
                            </p>
                            <Link
                                to="/cpd/admin/questions"
                                onClick={() => tap()}
                                className={SecondaryBtn + " w-full"}
                                style={{ touchAction: "manipulation" }}
                            >
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                Manage Question Bank
                            </Link>
                        </section>
                    )}

                    {/* PUBLISH */}
                    {tab === "publish" && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                                <p className="text-[12px] text-slate-600 dark:text-slate-400">
                                    Current status: <span className="font-bold text-slate-900 dark:text-white capitalize">{activity.status}</span>
                                </p>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                Publishing runs content validation (YouTube/Apple IDs), checks required fields, and sets published_at.
                            </p>
                            {publishError && (
                                <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-400/10 p-3">
                                    <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-rose-700 dark:text-rose-300">
                                        {publishError}
                                    </p>
                                </div>
                            )}
                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    onClick={handlePublish}
                                    disabled={publish.isPending}
                                    className={PrimaryBtn}
                                    style={{ touchAction: "manipulation" }}
                                >
                                    {publish.isPending ? "Publishing…" : "Publish Activity"}
                                </button>
                                <button
                                    onClick={() => { tap(); patch({ status: "review" }); }}
                                    className={SecondaryBtn}
                                    style={{ touchAction: "manipulation" }}
                                >
                                    Submit for Review
                                </button>
                                <button
                                    onClick={() => { tap("warning"); patch({ status: "archived", archived_at: new Date().toISOString() }); }}
                                    className="h-10 px-4 rounded-xl bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-400 text-[13px] font-bold active:scale-[0.97] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    Archive
                                </button>
                            </div>
                        </section>
                    )}
                </div>
            </ScrollBody>
        </FullScreen>
    );
}

/* ─────────────────────────────────────────────────────────────
   New content item form (inline)
   ───────────────────────────────────────────────────────────── */
function NewContentItemForm({ onSubmit }: { onSubmit: (v: any) => void }) {
    const [type, setType] = useState<ContentType>("video");
    const [provider, setProvider] = useState<ExternalProvider>("youtube");
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [err, setErr] = useState<string | null>(null);

    const handle = () => {
        setErr(null);
        const payload: any = { content_type: type, external_provider: provider, title, external_url: url };
        const check = validateContentItem(payload);
        if (!check.ok) { setErr(check.reason ?? "Invalid"); return; }
        tap("success");
        onSubmit({ ...payload, ...(check.normalized ?? {}) });
        setTitle(""); setUrl("");
    };

    return (
        <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ContentType)}
                    className={InputBase + " !h-9"}
                >
                    {Object.keys(CONTENT_LABEL).map(k => (
                        <option key={k} value={k}>{CONTENT_LABEL[k as ContentType]}</option>
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
            {err && <p className="text-[10px] text-rose-600 dark:text-rose-400">{err}</p>}
            <button
                onClick={handle}
                disabled={!title}
                className={SecondaryBtn + " w-full !h-9"}
                style={{ touchAction: "manipulation" }}
            >
                <Plus className="h-3.5 w-3.5" />
                Add Content
            </button>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   ADMIN — QUESTION BANK  /cpd/admin/questions
   ═══════════════════════════════════════════════════════════════ */
export function CpdAdminQuestionsPage() {
    const [search, setSearch] = useState("");
    const q = useAdminQuestions({ search });
    const items = q.data?.pages.flatMap(p => p.items) ?? [];
    const create = useCreateQuestion();

    const [qText, setQText] = useState("");
    const [qType, setQType] = useState("multiple_choice");
    const [options, setOptions] = useState<{ option_text: string; is_correct: boolean }[]>([
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
    ]);

    const addOption = () => setOptions(o => [...o, { option_text: "", is_correct: false }]);
    const removeOption = (i: number) => setOptions(o => o.filter((_, idx) => idx !== i));

    const submit = async () => {
        tap("success");
        await create.mutateAsync({
            question: qText,
            question_type: qType as any,
            options: options.filter(o => o.option_text.trim()),
        });
        setQText("");
        setOptions([{ option_text: "", is_correct: false }, { option_text: "", is_correct: false }]);
    };

    return (
        <FullScreen>
            <PageHeader
                title="Question Bank"
                subtitle="Reusable across all CPD assessments"
                onBack={() => window.history.back()}
            />

            <ScrollBody>
                <div className="px-4 pt-4 space-y-3">
                    {/* New question */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            New Question
                        </p>
                        <textarea
                            value={qText}
                            onChange={(e) => setQText(e.target.value)}
                            placeholder="Question text"
                            rows={2}
                            className={TextareaBase}
                        />
                        <select
                            value={qType}
                            onChange={(e) => setQType(e.target.value)}
                            className={InputBase}
                        >
                            <option value="multiple_choice">Multiple Choice</option>
                            <option value="multiple_select">Multiple Select</option>
                            <option value="true_false">True / False</option>
                            <option value="short_answer">Short Answer</option>
                        </select>

                        {(qType === "multiple_choice" || qType === "multiple_select" || qType === "true_false") && (
                            <div className="space-y-2">
                                {options.map((o, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={o.is_correct}
                                            onChange={(e) => setOptions(prev => prev.map((x, idx) => idx === i ? { ...x, is_correct: e.target.checked } : x))}
                                            className="w-4 h-4 accent-blue-600 shrink-0"
                                        />
                                        <input
                                            value={o.option_text}
                                            onChange={(e) => setOptions(prev => prev.map((x, idx) => idx === i ? { ...x, option_text: e.target.value } : x))}
                                            placeholder={`Option ${i + 1}`}
                                            className={InputBase + " !h-9"}
                                        />
                                        <button
                                            onClick={() => removeOption(i)}
                                            className={DangerBtn + " !h-8 !w-8"}
                                            aria-label="Remove option"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={addOption}
                                    className={SecondaryBtn + " w-full !h-9"}
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <Plus className="h-3 w-3" />
                                    Add option
                                </button>
                            </div>
                        )}

                        <button
                            onClick={submit}
                            disabled={!qText || create.isPending}
                            className={PrimaryBtn + " w-full"}
                            style={{ touchAction: "manipulation" }}
                        >
                            {create.isPending ? "Saving…" : "Save Question"}
                        </button>
                    </section>

                    {/* Search */}
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search questions…"
                        className={InputBase}
                    />

                    {/* List */}
                    <div className="space-y-2">
                        {items.map((qq: any) => (
                            <div key={qq.id} className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[12px] font-medium text-slate-900 dark:text-white truncate">
                                        {qq.question}
                                    </p>
                                    <span className="inline-flex items-center rounded-full px-2 py-0.5 shrink-0
                                                     text-[10px] font-bold capitalize
                                                     bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                                        {qq.question_type.replace("_", " ")}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {q.hasNextPage && (
                            <div className="flex justify-center pt-2">
                                <button
                                    onClick={() => { tap(); q.fetchNextPage(); }}
                                    className={SecondaryBtn}
                                    style={{ touchAction: "manipulation" }}
                                >
                                    Load more
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </ScrollBody>
        </FullScreen>
    );
}

/* ═══════════════════════════════════════════════════════════════
   ADMIN — COMPLETIONS  /cpd/admin/completions
   ═══════════════════════════════════════════════════════════════ */
export function CpdAdminCompletionsPage() {
    const [status, setStatus] = useState<string>("");
    const q = useAdminCompletions({ status: status || undefined });
    const items = q.data?.pages.flatMap(p => p.items) ?? [];

    const statuses = ["", "verified", "pending", "revoked"];

    return (
        <FullScreen>
            <PageHeader
                title="CPD Completions"
                subtitle={`${items.length} records`}
                onBack={() => window.history.back()}
            />

            <ScrollBody>
                <div className="px-4 pt-4 space-y-3">
                    {/* Filter pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        {statuses.map((s) => {
                            const active = status === s;
                            const label = s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1);
                            return (
                                <button
                                    key={s || "all"}
                                    onClick={() => { tap(); setStatus(s); }}
                                    className={`shrink-0 h-8 px-3 rounded-full text-[11px] font-bold
                                                active:scale-[0.97] transition-transform
                                                ${active
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"
                                        }`}
                                    style={{ touchAction: "manipulation" }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {/* List */}
                    <div className="space-y-2">
                        {items.map((c: any) => (
                            <div key={c.id} className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                                            {c.activity?.title ?? "Activity"}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                            {c.nurse?.name ?? c.nurse_id} · {fmtDate(c.completed_at)} · {fmtPoints(c.points_awarded)} pts
                                        </p>
                                    </div>
                                    <span className="inline-flex items-center rounded-full px-2 py-0.5 shrink-0
                                                     text-[10px] font-bold capitalize
                                                     bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                                        {c.completion_status}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {q.hasNextPage && (
                            <div className="flex justify-center pt-2">
                                <button
                                    onClick={() => { tap(); q.fetchNextPage(); }}
                                    className={SecondaryBtn}
                                    style={{ touchAction: "manipulation" }}
                                >
                                    Load more
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </ScrollBody>
        </FullScreen>
    );
}

/* ═══════════════════════════════════════════════════════════════
   ADMIN — PERIODS  /cpd/admin/periods
   ═══════════════════════════════════════════════════════════════ */
export function CpdAdminPeriodsPage() {
    const q = useAdminPeriods();
    const create = useCreatePeriod();

    const [form, setForm] = useState({ name: "", start_date: "", end_date: "" });

    const submit = async () => {
        tap("success");
        await create.mutateAsync(form);
        setForm({ name: "", start_date: "", end_date: "" });
    };

    return (
        <FullScreen>
            <PageHeader
                title="CPD Periods"
                subtitle="Professional development cycles"
                onBack={() => window.history.back()}
            />

            <ScrollBody>
                <div className="px-4 pt-4 space-y-3">
                    {/* New period */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            New Period
                        </p>
                        <input
                            value={form.name}
                            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Name (e.g. CPD 2026)"
                            className={InputBase}
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
                                    Start
                                </label>
                                <input
                                    type="date"
                                    value={form.start_date}
                                    onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
                                    className={InputBase}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
                                    End
                                </label>
                                <input
                                    type="date"
                                    value={form.end_date}
                                    onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))}
                                    className={InputBase}
                                />
                            </div>
                        </div>
                        <button
                            onClick={submit}
                            disabled={!form.name || !form.start_date || !form.end_date || create.isPending}
                            className={PrimaryBtn + " w-full"}
                            style={{ touchAction: "manipulation" }}
                        >
                            {create.isPending ? "Creating…" : "Create Period"}
                        </button>
                    </section>

                    {/* List */}
                    <div className="space-y-2">
                        {q.data?.map((p) => (
                            <div key={p.id} className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                                            {p.name}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                            {fmtDate(p.start_date)} → {fmtDate(p.end_date)}
                                        </p>
                                    </div>
                                    <span className="inline-flex items-center rounded-full px-2 py-0.5 shrink-0
                                                     text-[10px] font-bold capitalize
                                                     bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                                        {p.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </ScrollBody>
        </FullScreen>
    );
}