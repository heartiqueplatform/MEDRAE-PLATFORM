// src/staff-cpd/admin.tsx
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronLeft, Plus, Trash2, Upload, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import {
    useAdminActivities, useAdminActivity, useCreateActivity, useUpdateActivity, usePublishActivity,
    useCreateModule, useDeleteModule, useCreateContentItem, useDeleteContentItem,
    useAdminQuestions, useCreateQuestion, useAdminCompletions, useAdminPeriods, useCreatePeriod,
} from "./hooks";
import { ContentTypeChip, CpdEmptyState } from "./components";
import { validateContentItem, fmtDate, fmtHours, fmtPoints, CONTENT_LABEL } from "./lib";
import type { ContentType, ExternalProvider } from "./lib";

// ═══════════════════════════════════════════════════════════════
// ADMIN — ACTIVITIES LIST  /cpd/admin/activities
// ═══════════════════════════════════════════════════════════════
export function CpdAdminActivitiesPage() {
    const [status, setStatus] = useState<string>("");
    const q = useAdminActivities({ status: status || undefined });
    const items = q.data?.pages.flatMap(p => p.items) ?? [];
    const create = useCreateActivity();
    const nav = useNavigate();

    return (
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">CPD Activities</h1>
                    <p className="text-sm text-muted-foreground">Author, publish, and manage CPD content</p>
                </div>
                <Button
                    onClick={async () => {
                        const a = await create.mutateAsync({ title: "Untitled Activity" });
                        nav(`/cpd/admin/activities/${a.id}`);
                    }}
                    disabled={create.isPending}
                >
                    <Plus className="h-4 w-4 mr-2" /> New Activity
                </Button>
            </div>

            <div className="flex items-center gap-2">
                <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {q.isLoading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
            ) : items.length ? (
                <div className="space-y-2">
                    {items.map((a: any) => (
                        <Link key={a.id} to={`/cpd/admin/activities/${a.id}`}>
                            <Card className="border-0 shadow-sm hover:shadow-md transition-all">
                                <CardContent className="p-4 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold truncate">{a.title}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {fmtHours(a.learning_hours)} · {fmtPoints(a.configured_cpd_points)} pts · created {fmtDate(a.created_at)}
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="capitalize flex-shrink-0">{a.status}</Badge>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                    {q.hasNextPage && (
                        <div className="flex justify-center pt-3">
                            <Button variant="outline" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>Load more</Button>
                        </div>
                    )}
                </div>
            ) : (
                <CpdEmptyState title="No activities yet" hint="Click 'New Activity' to create your first CPD activity." />
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN — ACTIVITY EDITOR  /cpd/admin/activities/:id
// ═══════════════════════════════════════════════════════════════
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

    const [publishError, setPublishError] = useState<string | null>(null);

    if (q.isLoading || !q.data) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
    const { activity, modules, contentByModule, assessments } = q.data;

    const patch = (p: any) => update.mutate({ id: activity.id, patch: p });

    const handlePublish = async () => {
        setPublishError(null);
        try {
            await publish.mutateAsync(activity.id);
        } catch (e: any) {
            setPublishError(e?.message ?? "Publish failed");
        }
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
            <Button variant="ghost" size="sm" onClick={() => nav("/cpd/admin/activities")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>

            <Tabs defaultValue="basics">
                <TabsList>
                    <TabsTrigger value="basics">Basics</TabsTrigger>
                    <TabsTrigger value="modules">Modules & Content</TabsTrigger>
                    <TabsTrigger value="assessments">Assessments</TabsTrigger>
                    <TabsTrigger value="publish">Publish</TabsTrigger>
                </TabsList>

                {/* BASICS */}
                <TabsContent value="basics" className="mt-4 space-y-3">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-5 space-y-3">
                            <Input
                                value={activity.title}
                                onChange={(e) => patch({ title: e.target.value })}
                                placeholder="Title"
                            />
                            <Input
                                value={activity.short_description ?? ""}
                                onChange={(e) => patch({ short_description: e.target.value })}
                                placeholder="Short description"
                            />
                            <Textarea
                                value={activity.description ?? ""}
                                onChange={(e) => patch({ description: e.target.value })}
                                placeholder="Full description"
                                rows={5}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    type="number" step="0.25"
                                    value={activity.learning_hours}
                                    onChange={(e) => patch({ learning_hours: Number(e.target.value) })}
                                    placeholder="Learning hours"
                                />
                                <Input
                                    type="number" step="0.25"
                                    value={activity.configured_cpd_points}
                                    onChange={(e) => patch({ configured_cpd_points: Number(e.target.value) })}
                                    placeholder="CPD points"
                                />
                                <Input
                                    value={activity.category ?? ""}
                                    onChange={(e) => patch({ category: e.target.value })}
                                    placeholder="Category"
                                />
                                <Select
                                    value={activity.difficulty ?? "intermediate"}
                                    onValueChange={(v) => patch({ difficulty: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="beginner">Beginner</SelectItem>
                                        <SelectItem value="intermediate">Intermediate</SelectItem>
                                        <SelectItem value="advanced">Advanced</SelectItem>
                                        <SelectItem value="expert">Expert</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* MODULES */}
                <TabsContent value="modules" className="mt-4 space-y-4">
                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            onClick={() => createModule.mutate({
                                activity_id: activity.id,
                                title: `Module ${modules.length + 1}`,
                                position: modules.length,
                            })}
                        >
                            <Plus className="h-4 w-4 mr-1" /> Add Module
                        </Button>
                    </div>

                    {modules.length === 0 && <CpdEmptyState title="No modules yet" hint="Add a module to start adding content." />}

                    {modules.map((m) => (
                        <Card key={m.id} className="border-0 shadow-sm">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm">{m.title}</CardTitle>
                                <Button size="sm" variant="ghost" onClick={() => deleteModule.mutate({ id: m.id, activityId: activity.id })}>
                                    <Trash2 className="h-4 w-4 text-rose-600" />
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {(contentByModule[m.id] ?? []).map((c) => (
                                    <div key={c.id} className="flex items-center justify-between border rounded-lg p-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <ContentTypeChip type={c.content_type} />
                                            <span className="text-sm truncate">{c.title}</span>
                                        </div>
                                        <Button size="sm" variant="ghost" onClick={() => deleteItem.mutate({ id: c.id, activityId: activity.id })}>
                                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                                        </Button>
                                    </div>
                                ))}

                                <NewContentItemForm
                                    onSubmit={(input) => createItem.mutate({ ...input, module_id: m.id, activity_id: activity.id })}
                                />
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>

                {/* ASSESSMENTS */}
                <TabsContent value="assessments" className="mt-4">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-5 space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Assessment authoring lives on a dedicated page. Assessment: {assessments.length} configured.
                            </p>
                            <Button asChild variant="outline">
                                <Link to="/cpd/admin/questions">Manage Question Bank</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PUBLISH */}
                <TabsContent value="publish" className="mt-4 space-y-3">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm">Current status: <Badge variant="secondary" className="capitalize">{activity.status}</Badge></p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Publishing runs content validation (YouTube/Apple IDs), checks required fields, and sets published_at.
                            </p>
                            {publishError && (
                                <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 rounded-lg p-3">
                                    <AlertCircle className="h-4 w-4" /> {publishError}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button onClick={handlePublish} disabled={publish.isPending}>
                                    {publish.isPending ? "Publishing…" : "Publish Activity"}
                                </Button>
                                <Button variant="outline" onClick={() => patch({ status: "review" })}>Submit for Review</Button>
                                <Button variant="outline" onClick={() => patch({ status: "archived", archived_at: new Date().toISOString() })}>Archive</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// New content item form (inline)
// ─────────────────────────────────────────────────────────────
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
        onSubmit({ ...payload, ...(check.normalized ?? {}) });
        setTitle(""); setUrl("");
    };

    return (
        <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="grid grid-cols-2 gap-2">
                <Select value={type} onValueChange={(v) => setType(v as ContentType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {Object.keys(CONTENT_LABEL).map(k => (
                            <SelectItem key={k} value={k}>{CONTENT_LABEL[k as ContentType]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={provider} onValueChange={(v) => setProvider(v as ExternalProvider)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="apple_podcasts">Apple Podcasts</SelectItem>
                        <SelectItem value="external">External URL</SelectItem>
                        <SelectItem value="internal">Internal (text)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Content title" />
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            {err && <p className="text-[11px] text-rose-600">{err}</p>}
            <div className="flex justify-end">
                <Button size="sm" onClick={handle} disabled={!title}>Add Content</Button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN — QUESTION BANK  /cpd/admin/questions
// ═══════════════════════════════════════════════════════════════
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
        await create.mutateAsync({
            question: qText, question_type: qType as any,
            options: options.filter(o => o.option_text.trim()),
        });
        setQText("");
        setOptions([{ option_text: "", is_correct: false }, { option_text: "", is_correct: false }]);
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>
                <p className="text-sm text-muted-foreground">Reusable questions across all CPD assessments</p>
            </div>

            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-base">New Question</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    <Textarea value={qText} onChange={(e) => setQText(e.target.value)} placeholder="Question text" rows={2} />
                    <Select value={qType} onValueChange={setQType}>
                        <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                            <SelectItem value="multiple_select">Multiple Select</SelectItem>
                            <SelectItem value="true_false">True / False</SelectItem>
                            <SelectItem value="short_answer">Short Answer</SelectItem>
                        </SelectContent>
                    </Select>

                    {(qType === "multiple_choice" || qType === "multiple_select" || qType === "true_false") && (
                        <div className="space-y-2">
                            {options.map((o, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <input
                                        type="checkbox" checked={o.is_correct}
                                        onChange={(e) => setOptions(prev => prev.map((x, idx) => idx === i ? { ...x, is_correct: e.target.checked } : x))}
                                    />
                                    <Input
                                        value={o.option_text}
                                        onChange={(e) => setOptions(prev => prev.map((x, idx) => idx === i ? { ...x, option_text: e.target.value } : x))}
                                        placeholder={`Option ${i + 1}`}
                                    />
                                    <Button size="sm" variant="ghost" onClick={() => removeOption(i)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                            <Button size="sm" variant="outline" onClick={addOption}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add option
                            </Button>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button onClick={submit} disabled={!qText || create.isPending}>
                            {create.isPending ? "Saving…" : "Save Question"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions…" className="max-w-md" />

            <div className="space-y-2">
                {items.map((qq: any) => (
                    <Card key={qq.id} className="border-0 shadow-sm">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm truncate">{qq.question}</p>
                                <Badge variant="secondary" className="text-[10px] capitalize flex-shrink-0">{qq.question_type.replace("_", " ")}</Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {q.hasNextPage && (
                    <div className="flex justify-center pt-2">
                        <Button variant="outline" onClick={() => q.fetchNextPage()}>Load more</Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN — COMPLETIONS  /cpd/admin/completions
// ═══════════════════════════════════════════════════════════════
export function CpdAdminCompletionsPage() {
    const [status, setStatus] = useState<string>("");
    const q = useAdminCompletions({ status: status || undefined });
    const items = q.data?.pages.flatMap(p => p.items) ?? [];

    return (
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">CPD Completions</h1>
                <p className="text-sm text-muted-foreground">Authoritative record of every verified completion</p>
            </div>

            <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
            </Select>

            <div className="space-y-2">
                {items.map((c: any) => (
                    <Card key={c.id} className="border-0 shadow-sm">
                        <CardContent className="p-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{c.activity?.title ?? "Activity"}</p>
                                <p className="text-[11px] text-muted-foreground">
                                    {c.nurse?.name ?? c.nurse_id} · {fmtDate(c.completed_at)} · {fmtPoints(c.points_awarded)} pts
                                </p>
                            </div>
                            <Badge variant="secondary" className="capitalize flex-shrink-0">{c.completion_status}</Badge>
                        </CardContent>
                    </Card>
                ))}
                {q.hasNextPage && (
                    <div className="flex justify-center pt-2">
                        <Button variant="outline" onClick={() => q.fetchNextPage()}>Load more</Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN — PERIODS  /cpd/admin/periods
// ═══════════════════════════════════════════════════════════════
export function CpdAdminPeriodsPage() {
    const q = useAdminPeriods();
    const create = useCreatePeriod();

    const [form, setForm] = useState({ name: "", start_date: "", end_date: "" });

    const submit = async () => {
        await create.mutateAsync(form);
        setForm({ name: "", start_date: "", end_date: "" });
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">CPD Periods</h1>
                <p className="text-sm text-muted-foreground">Professional development cycles (e.g. 2026, 2027)</p>
            </div>

            <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name (e.g. CPD 2026)" />
                        <Input type="date" value={form.start_date} onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))} />
                        <Input type="date" value={form.end_date} onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))} />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={submit} disabled={!form.name || !form.start_date || !form.end_date || create.isPending}>
                            Create Period
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-2">
                {q.data?.map((p) => (
                    <Card key={p.id} className="border-0 shadow-sm">
                        <CardContent className="p-3 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold">{p.name}</p>
                                <p className="text-[11px] text-muted-foreground">{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</p>
                            </div>
                            <Badge variant="secondary" className="capitalize">{p.status}</Badge>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}