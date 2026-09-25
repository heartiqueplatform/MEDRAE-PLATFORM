// src/staff-cpd/pages.tsx
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Award, BookOpen, Clock, TrendingUp, GraduationCap, ChevronLeft, ShieldCheck,
    XCircle, CheckCircle2, ArrowRight, PlayCircle, FileText, Headphones, ExternalLink,
    Calendar, Search, Sparkles, Lock, ClipboardCheck, Trophy, HelpCircle, Download,
} from "lucide-react";
import {
    useDashboardStats, useActivities, useActivityTree, useMyEnrollment, useEnroll,
    useMyEnrollments, useProgressForEnrollment, useUpsertProgress,
    useAssessmentWithQuestions, useStartAttempt, useSubmitAttempt, useAttemptResults,
    useMyCompletions, useMyCertificates, useCertificate, useVerifyCertificate,
} from "./hooks";
import {
    CpdStatTile, CpdActivityCard, CpdCompletionRow, CpdCertificateCard,
    ContentRenderer, ContentTypeChip, CpdEmptyState, ChecklistRow,
} from "./components";
import { fmtDate, fmtHours, fmtPoints, fmtDuration, CONTENT_LABEL } from "./lib";
import { useEffect, useMemo, useState } from "react";
import type { CpdContentItem } from "./lib";
import { CpdCertificatePdf } from "./certificate-pdf";
import { supabase } from "@/lib/supabaseClient";
// ═══════════════════════════════════════════════════════════════
// SHARED — input + pill styling
// ═══════════════════════════════════════════════════════════════
const inputCls =
    "h-11 md:h-12 rounded-lg md:rounded-2xl bg-gray-100 dark:bg-gray-900 border-2 border-transparent text-sm md:text-base font-medium focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none shadow-inner";

const STATUS_TONES: Record<string, string> = {
    verified: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    revoked: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    not_started: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const getStatusTone = (s?: string) =>
    STATUS_TONES[(s ?? "").toLowerCase()] ?? STATUS_TONES.not_started;

// ═══════════════════════════════════════════════════════════════
// 1. DASHBOARD  /cpd
// ═══════════════════════════════════════════════════════════════
export function CpdDashboard() {
    const { data, isLoading } = useDashboardStats();

    return (
        <div className="min-h-screen w-full flex flex-col items-center">
            <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-4 md:space-y-6 px-0 sm:px-6 pt-4 sm:pt-8 pb-8">

                {/* HERO */}
                <Card className="relative overflow-hidden md:shadow-xl md:shadow-blue-500/5 transition-all rounded-none md:rounded-xl border-0 bg-transparent dark:bg-transparent border-b border-gray-100 dark:border-gray-800 md:border-b-0">
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative px-4 md:px-6 pt-4 md:pt-6 pb-4 md:pb-6">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                                    <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={2.4} />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                                        My <span className="text-blue-600">CPD</span>
                                    </h1>
                                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                        {data?.current_period
                                            ? `${data.current_period.name} · ends ${fmtDate(data.current_period.end_date)}`
                                            : "Continuing Professional Development"}
                                    </p>
                                </div>
                            </div>
                            <Button
                                asChild
                                className="h-11 md:h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/20 px-4 md:px-5"
                            >
                                <Link to="/cpd/catalog">
                                    <BookOpen className="h-4 w-4 mr-2" /> Browse Catalog
                                </Link>
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* STATS */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-[8px] sm:gap-3 md:gap-4 px-[4px] md:px-0">
                    <CpdStatTile label="CPD Points" value={isLoading ? "…" : fmtPoints(data?.total_points)} icon={Award} tone="amber" />
                    <CpdStatTile label="Learning Hours" value={isLoading ? "…" : fmtHours(data?.total_hours)} icon={Clock} tone="blue" />
                    <CpdStatTile label="Completed" value={isLoading ? "…" : data?.completed_count ?? 0} icon={CheckCircle2} tone="green" />
                    <CpdStatTile label="In Progress" value={isLoading ? "…" : data?.in_progress_count ?? 0} icon={TrendingUp} tone="violet" />
                    <CpdStatTile label="Certificates" value={isLoading ? "…" : data?.certificates_count ?? 0} icon={GraduationCap} tone="rose" />
                </div>

                {/* RECENT COMPLETIONS */}
                <div className="px-[4px] md:px-0">
                    <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70">
                        <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-5 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100">
                                Recent Completions
                            </CardTitle>
                            <Link
                                to="/cpd/progress"
                                className="inline-flex items-center gap-1 text-[11px] md:text-xs font-bold text-blue-600 dark:text-blue-400 hover:gap-2 transition-all"
                            >
                                View all <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </CardHeader>
                        <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
                            {data?.recent_completions?.length ? (
                                data.recent_completions.map((c) => <CpdCompletionRow key={c.id} completion={c} />)
                            ) : (
                                <CpdEmptyState title="No completions yet" hint="Enroll in a CPD activity from the catalog to get started." />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 2. CATALOG  /cpd/catalog
// ═══════════════════════════════════════════════════════════════
export function CpdCatalogPage() {
    const [search, setSearch] = useState("");
    const [debounced, setDebounced] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setDebounced(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const q = useActivities({ search: debounced || undefined });
    const items = useMemo(() => q.data?.pages.flatMap(p => p.items) ?? [], [q.data]);

    return (
        <div className="min-h-screen w-full flex flex-col items-center">
            <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-4 md:space-y-5 px-0 sm:px-6 pt-4 sm:pt-8 pb-8">

                {/* HERO */}
                <Card className="relative overflow-hidden md:shadow-xl md:shadow-blue-500/5 transition-all rounded-none md:rounded-xl border-0 bg-transparent dark:bg-transparent border-b border-gray-100 dark:border-gray-800 md:border-b-0">
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative px-4 md:px-6 pt-4 md:pt-6 pb-4 md:pb-6">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                                <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={2.4} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                                    CPD <span className="text-blue-600">Catalog</span>
                                </h1>
                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    Published activities you can enrol in and earn points from
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* SEARCH */}
                <div className="px-[4px] md:px-0">
                    <div className="relative w-full group">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search activities…"
                            className={`w-full pl-9 md:pl-11 pr-4 ${inputCls}`}
                        />
                        <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                    </div>
                </div>

                {/* GRID */}
                {q.isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[8px] sm:gap-4 px-[4px] md:px-0">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-64 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                        ))}
                    </div>
                ) : items.length ? (
                    <div className="space-y-4 px-[4px] md:px-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[8px] sm:gap-4">
                            {items.map((a) => <CpdActivityCard key={a.id} activity={a} />)}
                        </div>
                        {q.hasNextPage && (
                            <div className="flex justify-center pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => q.fetchNextPage()}
                                    disabled={q.isFetchingNextPage}
                                    className="h-11 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 font-bold text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all px-6"
                                >
                                    {q.isFetchingNextPage ? "Loading…" : "Load more"}
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="px-[4px] md:px-0">
                        <CpdEmptyState
                            title={debounced ? "No matching activities" : "No activities yet"}
                            hint={debounced ? "Try a different search term." : "Once staff publish CPD activities they'll appear here."}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 3. ACTIVITY DETAIL  /cpd/activity/:id
// ═══════════════════════════════════════════════════════════════
export function CpdActivityDetailPage() {
    const { id = "" } = useParams();
    const nav = useNavigate();
    const tree = useActivityTree(id);
    const enrollment = useMyEnrollment(id);
    const enroll = useEnroll();
    const progress = useProgressForEnrollment(enrollment.data?.id);

    if (tree.isLoading) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center">
                <div className="w-full md:max-w-full md:px-4 lg:px-6 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 space-y-3 px-[4px] md:px-0">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-32 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }
    if (!tree.data) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center">
                <div className="w-full md:max-w-full md:px-4 lg:px-6 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 px-[4px] md:px-0">
                    <CpdEmptyState title="Activity not found" hint="The activity may have been removed." />
                </div>
            </div>
        );
    }

    const { activity, modules, contentByModule, assessments } = tree.data;
    const progressByItem = new Map((progress.data ?? []).map(p => [p.content_item_id, p]));

    const allRequired: CpdContentItem[] = modules.flatMap(m =>
        (contentByModule[m.id] ?? []).filter(c => c.is_required)
    );
    const doneRequired = allRequired.filter(c => progressByItem.get(c.id)?.status === "completed").length;
    const allDone = allRequired.length === 0 || doneRequired === allRequired.length;

    const totalItems = modules.reduce((n, m) => n + (contentByModule[m.id]?.length ?? 0), 0);
    const doneItems = modules.reduce(
        (n, m) => n + (contentByModule[m.id] ?? []).filter(c => progressByItem.get(c.id)?.status === "completed").length,
        0
    );
    const fallbackProgress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
    const shownProgress = enrollment.data ? Math.max(enrollment.data.progress_percentage, fallbackProgress) : 0;

    const handleEnroll = async () => {
        await enroll.mutateAsync(activity.id);
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center">
            <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-4 md:space-y-5 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 px-[4px] md:px-0">

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => nav("/cpd/catalog")}
                    className="rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold -ml-2"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back to catalog
                </Button>

                {/* HERO CARD */}
                <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70 overflow-hidden p-0">
                    {activity.thumbnail_url ? (
                        <div className="relative aspect-[16/7]">
                            <img src={activity.thumbnail_url} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                                <h1 className="text-lg md:text-2xl font-bold text-white tracking-tight leading-tight">
                                    {activity.title}
                                </h1>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    {activity.category && (
                                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-gray-800 shadow-md">
                                            {activity.category}
                                        </span>
                                    )}
                                    {activity.difficulty && (
                                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white capitalize shadow-md">
                                            {activity.difficulty}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-600" />
                    )}

                    <CardContent className="p-4 md:p-6 space-y-4">
                        {!activity.thumbnail_url && (
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    {activity.title}
                                </h1>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 md:gap-3">
                            <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                <Clock className="w-3 h-3" />
                                {fmtHours(activity.learning_hours)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                <Award className="w-3 h-3" />
                                {fmtPoints(activity.configured_cpd_points)} points
                            </span>
                            {enrollment.data && (
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${getStatusTone(enrollment.data.status)}`}>
                                    {enrollment.data.status.replace("_", " ")}
                                </span>
                            )}
                        </div>

                        {activity.description && (
                            <p className="text-sm md:text-[15px] text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                                {activity.description}
                            </p>
                        )}

                        {!enrollment.data ? (
                            <Button
                                onClick={handleEnroll}
                                disabled={enroll.isPending}
                                className="w-full sm:w-auto h-12 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/20 px-6"
                            >
                                {enroll.isPending ? "Enrolling…" : "Enroll in this activity"}
                            </Button>
                        ) : (
                            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Progress</span>
                                    <span className="text-sm md:text-base font-bold text-gray-900 dark:text-white">{shownProgress}%</span>
                                </div>
                                <Progress value={shownProgress} className="h-2" />
                                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    {doneItems} of {totalItems} items completed
                                    {allRequired.length > 0 && ` · ${doneRequired}/${allRequired.length} required`}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* MODULES */}
                <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70">
                    <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-5">
                        <CardTitle className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            Modules
                            <span className="text-gray-400 dark:text-gray-500 font-medium">({modules.length})</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6 pb-4 md:pb-6 space-y-4">
                        {modules.length === 0 && <CpdEmptyState title="No modules yet" hint="Content hasn't been added to this activity." />}
                        {modules.map((m) => {
                            const items = contentByModule[m.id] ?? [];
                            return (
                                <div key={m.id} className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-sm md:text-[15px] font-bold text-gray-900 dark:text-gray-100">
                                            Module {m.position + 1} · {m.title}
                                        </h3>
                                        {m.estimated_minutes ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium flex-shrink-0">
                                                <Clock className="w-3 h-3" />
                                                {m.estimated_minutes} min
                                            </span>
                                        ) : null}
                                    </div>
                                    {m.description && (
                                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                            {m.description}
                                        </p>
                                    )}
                                    <div className="space-y-1">
                                        {items.length === 0 && (
                                            <p className="text-xs text-gray-400 px-3 py-2">No content yet.</p>
                                        )}
                                        {items.map((c) => {
                                            const p = progressByItem.get(c.id);
                                            const done = p?.status === "completed";
                                            const started = p?.status === "in_progress";
                                            return (
                                                <Link
                                                    key={c.id}
                                                    to={`/cpd/activity/${activity.id}/module/${m.id}?item=${c.id}`}
                                                    className="group flex items-center justify-between gap-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 px-3 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:ring-2 hover:ring-blue-500/30 transition-all"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                        <ContentTypeChip type={c.content_type} />
                                                        <span className={`text-sm font-medium truncate ${done ? "text-gray-400 line-through" : "text-gray-900 dark:text-gray-100"}`}>
                                                            {c.title}
                                                        </span>
                                                        {c.is_required && !done && (
                                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 flex-shrink-0">
                                                                REQUIRED
                                                            </span>
                                                        )}
                                                        {started && !done && (
                                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex-shrink-0">
                                                                IN PROGRESS
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {c.duration_seconds && (
                                                            <span className="text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                                                {fmtDuration(c.duration_seconds)}
                                                            </span>
                                                        )}
                                                        {done ? (
                                                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shadow-emerald-500/30">
                                                                <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2.6} />
                                                            </div>
                                                        ) : (
                                                            <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                                                        )}
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* ASSESSMENTS */}
                {assessments.length > 0 && (
                    <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70">
                        <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-5">
                            <CardTitle className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                                Assessments
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 md:px-6 pb-4 md:pb-6 space-y-3">
                            {assessments.map((a) => (
                                <div
                                    key={a.id}
                                    className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4 flex items-center justify-between gap-3 flex-wrap"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm md:text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
                                            {a.title}
                                        </p>
                                        <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                                            Pass mark: {a.pass_mark}%
                                            {a.attempt_limit ? ` · max ${a.attempt_limit} attempt${a.attempt_limit > 1 ? "s" : ""}` : ""}
                                        </p>
                                    </div>
                                    <Button
                                        disabled={!enrollment.data || !allDone}
                                        onClick={() => nav(`/cpd/activity/${activity.id}/assessment?assessment=${a.id}`)}
                                        className="flex-shrink-0 h-11 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/20 px-5 disabled:opacity-40 disabled:shadow-none"
                                    >
                                        {allDone ? (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Start Assessment
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="w-4 h-4 mr-2" />
                                                Complete required content
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 4. PLAYER  /cpd/activity/:id/module/:moduleId?item=:itemId
// ═══════════════════════════════════════════════════════════════
export function CpdPlayerPage() {
    const { id = "", moduleId = "" } = useParams();
    const [searchParams] = useSearchParams();
    const selectedItemId = searchParams.get("item");
    const nav = useNavigate();

    const tree = useActivityTree(id);
    const enrollment = useMyEnrollment(id);
    const progress = useProgressForEnrollment(enrollment.data?.id);
    const upsert = useUpsertProgress();

    const moduleObj = tree.data?.modules.find(m => m.id === moduleId);
    const items = tree.data?.contentByModule[moduleId] ?? [];
    const item = items.find(x => x.id === selectedItemId) ?? items[0];
    const itemIndex = item ? items.findIndex(x => x.id === item.id) : -1;
    const nextItem = itemIndex >= 0 ? items[itemIndex + 1] : undefined;

    useEffect(() => {
        if (!enrollment.data || !item) return;
        const existing = progress.data?.find(p => p.content_item_id === item.id);
        if (!existing || existing.status === "not_started") {
            upsert.mutate({
                enrollment_id: enrollment.data.id,
                content_item_id: item.id,
                status: "in_progress",
                progress_percentage: existing?.progress_percentage ?? 0,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enrollment.data?.id, item?.id]);

    if (tree.isLoading) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center">
                <div className="w-full md:max-w-full md:px-4 lg:px-6 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 px-[4px] md:px-0 space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="h-40 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }
    if (!tree.data) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center">
                <div className="w-full md:max-w-full md:px-4 lg:px-6 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 px-[4px] md:px-0">
                    <CpdEmptyState title="Activity not found" />
                </div>
            </div>
        );
    }
    if (!item) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center">
                <div className="w-full md:max-w-full md:px-4 lg:px-6 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 px-[4px] md:px-0">
                    <CpdEmptyState title="No content in this module" hint="Ask an admin to add content items." />
                </div>
            </div>
        );
    }

    const progressRow = progress.data?.find(p => p.content_item_id === item.id);
    const done = progressRow?.status === "completed";

    const handleMarkComplete = () => {
        if (!enrollment.data) return;
        upsert.mutate({
            enrollment_id: enrollment.data.id,
            content_item_id: item.id,
            status: "completed",
            progress_percentage: 100,
        });
        if (nextItem) {
            nav(`/cpd/activity/${id}/module/${moduleId}?item=${nextItem.id}`);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center">
            <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-4 md:space-y-5 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 px-[4px] md:px-0">

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => nav(`/cpd/activity/${id}`)}
                    className="rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold -ml-2"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back to activity
                </Button>

                {/* PLAYER CARD */}
                <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70 overflow-hidden p-0">
                    {/* Top accent bar */}
                    <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-600" />

                    <CardContent className="p-4 md:p-6 space-y-4 md:space-y-5">

                        {/* Module context */}
                        {moduleObj && (
                            <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Module {moduleObj.position + 1} · {moduleObj.title}
                            </p>
                        )}

                        {/* Meta chips */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <ContentTypeChip type={item.content_type} />
                            {item.external_provider && (
                                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 capitalize">
                                    {item.external_provider.replace("_", " ")}
                                </span>
                            )}
                            {item.duration_seconds && (
                                <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                    <Clock className="w-3 h-3" /> {fmtDuration(item.duration_seconds)}
                                </span>
                            )}
                            {item.is_required && (
                                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                    REQUIRED
                                </span>
                            )}
                        </div>

                        <h1 className="text-base md:text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
                            {item.title}
                        </h1>
                        {item.description && (
                            <p className="text-sm md:text-[15px] text-gray-600 dark:text-gray-400 leading-relaxed">
                                {item.description}
                            </p>
                        )}

                        {/* Thumbnail */}
                        {item.content_type !== "video" && item.content_type !== "podcast" && (item.metadata?.thumbnail || item.metadata?.artwork) && (
                            <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 shadow-sm">
                                <img
                                    src={item.metadata.thumbnail || item.metadata.artwork}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        {/* Content */}
                        <ContentRenderer item={item} />

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-3 gap-3 flex-wrap border-t border-gray-100 dark:border-gray-800">
                            <span className="inline-flex items-center gap-1.5 text-[11px] md:text-xs font-bold">
                                {done ? (
                                    <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span className="text-emerald-600 dark:text-emerald-400">Completed</span>
                                    </>
                                ) : (
                                    <span className="text-gray-500 dark:text-gray-400">Mark as complete to continue</span>
                                )}
                            </span>
                            <div className="flex items-center gap-2">
                                {nextItem && (
                                    <Button
                                        variant="outline"
                                        onClick={() => nav(`/cpd/activity/${id}/module/${moduleId}?item=${nextItem.id}`)}
                                        className="h-11 rounded-2xl font-bold border-2 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all px-5"
                                    >
                                        Skip <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                                    </Button>
                                )}
                                <Button
                                    onClick={handleMarkComplete}
                                    disabled={upsert.isPending || done}
                                    className={`h-11 rounded-2xl font-bold px-5 shadow-lg transition-all disabled:opacity-40 disabled:shadow-none ${done
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                                        : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-500/20"
                                        }`}
                                >
                                    {done ? (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 mr-2" /> Completed
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Complete
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* IN THIS MODULE */}
                {items.length > 1 && (
                    <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70">
                        <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-5">
                            <CardTitle className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100">
                                In this module <span className="text-gray-400 dark:text-gray-500 font-medium">({items.length})</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 md:px-6 pb-4 md:pb-6 space-y-1">
                            {items.map((c, idx) => {
                                const p = progress.data?.find(x => x.content_item_id === c.id);
                                const cDone = p?.status === "completed";
                                const isCurrent = c.id === item.id;
                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => nav(`/cpd/activity/${id}/module/${moduleId}?item=${c.id}`)}
                                        className={`w-full text-left flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-all ${isCurrent
                                            ? "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/30"
                                            : "bg-gray-50 dark:bg-gray-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <span className={`text-[10px] md:text-[11px] font-mono font-bold flex-shrink-0 ${isCurrent ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}>
                                                {String(idx + 1).padStart(2, "0")}
                                            </span>
                                            <ContentTypeChip type={c.content_type} />
                                            <span className={`text-sm font-medium truncate ${cDone ? "text-gray-400 line-through" : "text-gray-900 dark:text-gray-100"}`}>
                                                {c.title}
                                            </span>
                                        </div>
                                        {cDone && (
                                            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shadow-emerald-500/30 flex-shrink-0">
                                                <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 5. ASSESSMENT PAGE  /cpd/activity/:id/assessment?assessment=:assessmentId
// ═══════════════════════════════════════════════════════════════
export function CpdAssessmentPage() {
    const { id = "" } = useParams();
    const [sp] = useSearchParams();
    const assessmentId = sp.get("assessment") ?? "";
    const nav = useNavigate();

    const enrollment = useMyEnrollment(id);
    const bundle = useAssessmentWithQuestions(assessmentId);
    const startAttempt = useStartAttempt();
    const submitAttempt = useSubmitAttempt();

    const [attemptId, setAttemptId] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<string, any>>({});

    useEffect(() => {
        if (!enrollment.data || !assessmentId || attemptId) return;
        (async () => {
            try {
                const a = await startAttempt.mutateAsync({
                    assessmentId,
                    enrollmentId: enrollment.data!.id,
                });
                setAttemptId(a.id);
            } catch (e: any) {
                console.error("startAttempt failed", e);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enrollment.data?.id, assessmentId]);

    if (bundle.isLoading || !enrollment.data) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center">
                <div className="w-full md:max-w-full md:px-4 lg:px-6 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 px-[4px] md:px-0 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-24 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }
    if (!bundle.data) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center">
                <div className="w-full md:max-w-full md:px-4 lg:px-6 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 px-[4px] md:px-0">
                    <CpdEmptyState title="Assessment not found" />
                </div>
            </div>
        );
    }

    const { assessment, questions } = bundle.data;
    const totalQuestions = questions.length;
    const answered = questions.filter((q: any) => {
        const v = answers[q.id];
        if (q.question_type === "multiple_select") return Array.isArray(v) && v.length > 0;
        return v !== undefined && v !== null && v !== "";
    }).length;

    const submit = async () => {
        if (!attemptId) return;
        await submitAttempt.mutateAsync({ attemptId, answers });
        nav(`/cpd/activity/${id}/assessment/${attemptId}/results`);
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center">
            <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-4 md:space-y-5 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 px-[4px] md:px-0">

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => nav(`/cpd/activity/${id}`)}
                    className="rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold -ml-2"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>

                {/* STICKY PROGRESS HEADER */}
                <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70">
                    <CardContent className="p-4 md:p-6 space-y-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                                <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
                                    <ClipboardCheck className="w-5 h-5 text-white" strokeWidth={2.4} />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-base md:text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
                                        {assessment.title}
                                    </h1>
                                    <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                                        Pass mark {assessment.pass_mark}%
                                    </p>
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${answered === totalQuestions
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                }`}>
                                {answered} / {totalQuestions} answered
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-2">
                            <Progress
                                value={totalQuestions > 0 ? (answered / totalQuestions) * 100 : 0}
                                className="h-2"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* QUESTIONS */}
                <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70">
                    <CardContent className="p-4 md:p-6 space-y-5">
                        {questions.map((q: any, i: number) => {
                            const qAnswered = (() => {
                                const v = answers[q.id];
                                if (q.question_type === "multiple_select") return Array.isArray(v) && v.length > 0;
                                return v !== undefined && v !== null && v !== "";
                            })();

                            return (
                                <div key={q.id} className="space-y-3 pb-5 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] md:text-xs font-bold ${qAnswered
                                            ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30"
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                                            }`}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm md:text-[15px] font-bold text-gray-900 dark:text-gray-100 leading-snug">
                                                {q.question}
                                            </p>
                                            {q.points && q.points !== 1 && (
                                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 mt-1.5">
                                                    {q.points} pts
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2 pl-10">
                                        {q.options?.map((opt: any) => {
                                            const checked = q.question_type === "multiple_select"
                                                ? Array.isArray(answers[q.id]) && answers[q.id].includes(opt.id)
                                                : answers[q.id] === opt.id;
                                            return (
                                                <label
                                                    key={opt.id}
                                                    className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm cursor-pointer transition-all ${checked
                                                        ? "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/40"
                                                        : "bg-gray-50 dark:bg-gray-900/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                                                        }`}
                                                >
                                                    <input
                                                        type={q.question_type === "multiple_select" ? "checkbox" : "radio"}
                                                        name={`q_${q.id}`}
                                                        checked={checked}
                                                        onChange={(e) => {
                                                            if (q.question_type === "multiple_select") {
                                                                const prev = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                                                                const next = e.target.checked
                                                                    ? [...prev, opt.id]
                                                                    : prev.filter((x: string) => x !== opt.id);
                                                                setAnswers((a) => ({ ...a, [q.id]: next }));
                                                            } else {
                                                                setAnswers((a) => ({ ...a, [q.id]: opt.id }));
                                                            }
                                                        }}
                                                        className="w-4 h-4 accent-blue-600 flex-shrink-0"
                                                    />
                                                    <span className={`text-sm font-medium ${checked ? "text-blue-900 dark:text-blue-100" : "text-gray-700 dark:text-gray-300"}`}>
                                                        {opt.option_text}
                                                    </span>
                                                </label>
                                            );
                                        })}

                                        {q.question_type === "short_answer" && (
                                            <textarea
                                                value={answers[q.id] ?? ""}
                                                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                                                className="w-full rounded-xl bg-gray-50 dark:bg-gray-900/50 border-2 border-transparent p-3 text-sm font-medium focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-y shadow-inner"
                                                rows={3}
                                                placeholder="Type your answer…"
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* SUBMIT BAR */}
                <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70">
                    <CardContent className="p-4 md:p-6 flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-[11px] md:text-xs font-bold text-gray-500 dark:text-gray-400">
                            {answered < totalQuestions
                                ? `${totalQuestions - answered} unanswered`
                                : "All questions answered"}
                        </span>
                        <Button
                            onClick={submit}
                            disabled={submitAttempt.isPending || !attemptId}
                            className="h-12 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/20 px-6 disabled:opacity-40 disabled:shadow-none"
                        >
                            {submitAttempt.isPending ? "Submitting…" : "Submit Assessment"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 6. ATTEMPT RESULTS  /cpd/activity/:id/assessment/:attemptId/results
// ═══════════════════════════════════════════════════════════════
export function CpdAssessmentResultsPage() {
    const { id = "", attemptId = "" } = useParams();
    const nav = useNavigate();
    const q = useAttemptResults(attemptId);

    if (q.isLoading) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center">
                <div className="w-full md:max-w-full md:px-4 lg:px-6 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 px-[4px] md:px-0">
                    <div className="h-64 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                </div>
            </div>
        );
    }
    if (!q.data) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center">
                <div className="w-full md:max-w-full md:px-4 lg:px-6 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 px-[4px] md:px-0">
                    <CpdEmptyState title="Results not found" />
                </div>
            </div>
        );
    }

    const a: any = q.data;
    const passed = !!a.passed;
    const score = Math.round(a.score ?? 0);

    return (
        <div className="min-h-screen w-full flex flex-col items-center">
            <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-4 md:space-y-5 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 px-[4px] md:px-0">

                <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70 overflow-hidden p-0">
                    {/* Top accent bar */}
                    <div className={`h-1 w-full bg-gradient-to-r ${passed ? "from-emerald-500 to-teal-600" : "from-rose-500 to-pink-600"}`} />

                    <CardContent className="p-6 md:p-8 text-center space-y-4">
                        <div className={`w-16 h-16 md:w-20 md:h-20 mx-auto rounded-2xl flex items-center justify-center shadow-lg ${passed
                            ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30"
                            : "bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/30"
                            }`}>
                            {passed ? (
                                <Trophy className="w-8 h-8 md:w-10 md:h-10 text-white" strokeWidth={2.4} />
                            ) : (
                                <XCircle className="w-8 h-8 md:w-10 md:h-10 text-white" strokeWidth={2.4} />
                            )}
                        </div>

                        <div>
                            <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${passed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {passed ? "Passed" : "Not Yet"}
                            </h1>
                            <p className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mt-2">
                                {score}%
                            </p>
                        </div>

                        <p className="text-sm md:text-[15px] text-gray-500 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
                            {passed
                                ? "Great work — your completion and certificate have been recorded."
                                : "You can retry the assessment. Review the module content first."}
                        </p>

                        <div className="flex justify-center gap-2 pt-3 flex-wrap">
                            <Button
                                variant="outline"
                                onClick={() => nav(`/cpd/activity/${id}`)}
                                className="h-11 rounded-2xl font-bold border-2 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all px-5"
                            >
                                Back to Activity
                            </Button>
                            {!passed && (
                                <Button
                                    onClick={() => nav(`/cpd/activity/${id}/assessment?assessment=${a.assessment_id}`)}
                                    className="h-11 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/20 px-5"
                                >
                                    Retry
                                </Button>
                            )}
                            {passed && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => nav(`/cpd/certificates`)}
                                        className="h-11 rounded-2xl font-bold border-2 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-amber-400 hover:text-amber-600 transition-all px-5"
                                    >
                                        <Award className="h-4 w-4 mr-2" />
                                        View Certificates
                                    </Button>
                                    <Button
                                        onClick={() => nav(`/cpd/progress`)}
                                        className="h-11 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/20 px-5"
                                    >
                                        My Progress
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 7. MY PROGRESS  /cpd/progress
// ═══════════════════════════════════════════════════════════════
export function CpdMyProgressPage() {
    const q = useMyEnrollments();
    const items = useMemo(() => q.data?.pages.flatMap(p => p.items) ?? [], [q.data]);

    return (
        <div className="min-h-screen w-full flex flex-col items-center">
            <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-4 md:space-y-5 px-0 sm:px-6 pt-4 sm:pt-8 pb-8">

                {/* HERO */}
                <Card className="relative overflow-hidden md:shadow-xl md:shadow-blue-500/5 transition-all rounded-none md:rounded-xl border-0 bg-transparent dark:bg-transparent border-b border-gray-100 dark:border-gray-800 md:border-b-0">
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative px-4 md:px-6 pt-4 md:pt-6 pb-4 md:pb-6">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 flex-shrink-0">
                                    <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={2.4} />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                                        My <span className="text-violet-600">Progress</span>
                                    </h1>
                                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                        Every CPD activity you have enrolled in
                                    </p>
                                </div>
                            </div>
                            <Button
                                asChild
                                variant="outline"
                                className="h-11 md:h-12 rounded-2xl font-bold border-2 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all px-4 md:px-5"
                            >
                                <Link to="/cpd/catalog">
                                    <BookOpen className="h-4 w-4 mr-2" /> Browse catalog
                                </Link>
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* LIST */}
                {q.isLoading ? (
                    <div className="space-y-[8px] sm:space-y-2 px-[4px] md:px-0">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-24 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                        ))}
                    </div>
                ) : items.length ? (
                    <div className="space-y-[8px] sm:space-y-2 px-[4px] md:px-0">
                        {items.map((e) => (
                            <Link key={e.id} to={`/cpd/activity/${e.activity_id}`} className="block group">
                                <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70 hover:shadow-xl transition-all p-0">
                                    <CardContent className="p-4 md:p-5 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
                                                    {e.activity?.title ?? "Activity"}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${getStatusTone(e.status)}`}>
                                                        {e.status.replace("_", " ")}
                                                    </span>
                                                    {e.completed_at && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                                            <Calendar className="w-3 h-3" />
                                                            {fmtDate(e.completed_at)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-sm md:text-base font-bold text-gray-900 dark:text-white flex-shrink-0">
                                                {Math.round(e.progress_percentage)}%
                                            </span>
                                        </div>
                                        <Progress value={e.progress_percentage} className="h-2" />
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                        {q.hasNextPage && (
                            <div className="flex justify-center pt-3">
                                <Button
                                    variant="outline"
                                    onClick={() => q.fetchNextPage()}
                                    disabled={q.isFetchingNextPage}
                                    className="h-11 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 font-bold text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all px-6"
                                >
                                    {q.isFetchingNextPage ? "Loading…" : "Load more"}
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="px-[4px] md:px-0">
                        <CpdEmptyState
                            title="No enrollments yet"
                            hint="Browse the CPD catalog to get started."
                            icon={BookOpen}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 8. CERTIFICATES  /cpd/certificates
// ═══════════════════════════════════════════════════════════════
export function CpdCertificatesPage() {
    const q = useMyCertificates();
    const items = useMemo(() => q.data?.pages.flatMap(p => p.items) ?? [], [q.data]);

    return (
        <div className="min-h-screen w-full flex flex-col items-center">
            <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-4 md:space-y-5 px-0 sm:px-6 pt-4 sm:pt-8 pb-8">

                {/* HERO */}
                <Card className="relative overflow-hidden md:shadow-xl md:shadow-blue-500/5 transition-all rounded-none md:rounded-xl border-0 bg-transparent dark:bg-transparent border-b border-gray-100 dark:border-gray-800 md:border-b-0">
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-48 md:w-64 h-48 md:h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative px-4 md:px-6 pt-4 md:pt-6 pb-4 md:pb-6">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
                                <Award className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={2.4} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                                    My <span className="text-amber-600">Certificates</span>
                                </h1>
                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    Verified CPD certificates with public verification codes
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* GRID */}
                {q.isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[8px] sm:gap-3 px-[4px] md:px-0">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-28 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                        ))}
                    </div>
                ) : items.length ? (
                    <div className="space-y-4 px-[4px] md:px-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[8px] sm:gap-3">
                            {items.map((c) => <CpdCertificateCard key={c.id} certificate={c} />)}
                        </div>
                        {q.hasNextPage && (
                            <div className="flex justify-center pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => q.fetchNextPage()}
                                    disabled={q.isFetchingNextPage}
                                    className="h-11 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 font-bold text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all px-6"
                                >
                                    {q.isFetchingNextPage ? "Loading…" : "Load more"}
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="px-[4px] md:px-0">
                        <CpdEmptyState
                            title="No certificates yet"
                            hint="Complete a CPD activity to earn your first certificate."
                            icon={Award}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// 9. CERTIFICATE VIEW  /cpd/certificates/:id
// ═══════════════════════════════════════════════════════════════
export function CpdCertificateViewPage() {
    const { id = "" } = useParams();
    const q = useCertificate(id);
    const [profile, setProfile] = useState<any>(null);
    const [activity, setActivity] = useState<any>(null);
    const [completion, setCompletion] = useState<any>(null);

    // Fetch the nurse profile + activity + completion for the certificate
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;

            const [profileRes, completionRes] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("name, nck_number, specialization, institution, county")
                    .eq("user_id", user.id)
                    .maybeSingle(),
                q.data?.completion_id
                    ? supabase
                        .from("cpd_completions")
                        .select("*, activity:cpd_activities(*)")
                        .eq("id", q.data.completion_id)
                        .maybeSingle()
                    : Promise.resolve({ data: null, error: null } as any),
            ]);

            if (cancelled) return;
            if (profileRes.data) setProfile(profileRes.data);
            if (completionRes.data) {
                setCompletion(completionRes.data);
                if (completionRes.data.activity) setActivity(completionRes.data.activity);
            }
        })();
        return () => { cancelled = true; };
    }, [q.data?.completion_id]);

    if (q.isLoading) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center">
                <div className="w-full md:max-w-full md:px-4 lg:px-6 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 px-[4px] md:px-0">
                    <div className="h-96 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                </div>
            </div>
        );
    }
    if (!q.data) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center">
                <div className="w-full md:max-w-full md:px-4 lg:px-6 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 px-[4px] md:px-0">
                    <CpdEmptyState title="Certificate not found" />
                </div>
            </div>
        );
    }
    const c: any = q.data;

    const handleDownloadPdf = () => {
        window.print();
    };

    return (
        <>
            <div className="min-h-screen w-full flex flex-col items-center print:hidden">
                <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-4 md:space-y-5 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 px-[4px] md:px-0">

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.history.back()}
                        className="rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold -ml-2"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Back
                    </Button>

                    <Card className="border-0 shadow-xl rounded-xl bg-white dark:bg-muted/70 overflow-hidden p-0">
                        {/* Top accent bar */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 to-orange-600" />

                        <CardContent className="p-6 md:p-10 text-center space-y-5">
                            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                <Award className="w-8 h-8 md:w-10 md:h-10 text-white" strokeWidth={2.4} />
                            </div>

                            <div>
                                <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
                                    Certificate of Completion
                                </p>
                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                                    Medrae Nursing — Continuing Professional Development
                                </p>
                            </div>

                            {/* Recipient name — visible preview */}
                            <div className="border-t border-b border-gray-100 dark:border-gray-800 py-5 space-y-2">
                                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Awarded to
                                </p>
                                <p className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                    {profile?.name || "—"}
                                </p>
                                {(profile?.nck_number || profile?.institution) && (
                                    <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">
                                        {profile?.nck_number ? `NCK: ${profile.nck_number}` : ""}
                                        {profile?.nck_number && profile?.institution ? " · " : ""}
                                        {profile?.institution || ""}
                                    </p>
                                )}
                            </div>

                            {activity?.title && (
                                <div>
                                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Activity
                                    </p>
                                    <p className="text-base md:text-lg font-bold tracking-tight text-gray-900 dark:text-white mt-1">
                                        {activity.title}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-left">
                                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4">
                                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Issued
                                    </p>
                                    <p className="text-sm md:text-base font-bold text-gray-900 dark:text-white mt-1">
                                        {fmtDate(c.issued_at)}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4">
                                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Status
                                    </p>
                                    <p className="text-sm md:text-base font-bold text-gray-900 dark:text-white capitalize mt-1">
                                        {c.status}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4 space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                    Verification Code
                                </p>
                                <p className="text-sm md:text-base font-mono font-bold text-gray-900 dark:text-white break-all">
                                    {c.verification_code}
                                </p>
                                <p className="text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                    Anyone can verify at /cpd/verify/{c.verification_code}
                                </p>
                            </div>

                            <Button
                                onClick={handleDownloadPdf}
                                className="w-full sm:w-auto h-12 rounded-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20 px-6"
                            >
                                <Download className="h-4 w-4 mr-2" /> Download PDF
                            </Button>

                            <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                In the print dialog, choose <b>Save as PDF</b> and set layout to <b>Landscape</b>.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Print-only certificate — hidden in the browser, shown when printing */}
            <CpdCertificatePdf
                certificate={c}
                completion={completion}
                activity={activity}
                recipient={profile}
            />
        </>
    );
}
// ═══════════════════════════════════════════════════════════════
// 10. VERIFY  /cpd/verify/:code
// ═══════════════════════════════════════════════════════════════
export function CpdVerifyPage() {
    const { code = "" } = useParams();
    const q = useVerifyCertificate(code);

    return (
        <div className="min-h-screen w-full flex flex-col items-center">
            <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-4 md:space-y-5 px-0 sm:px-6 pt-4 sm:pt-8 pb-8 px-[4px] md:px-0 md:max-w-lg md:mx-auto">

                {/* HERO */}
                <Card className="relative overflow-hidden md:shadow-xl md:shadow-blue-500/5 transition-all rounded-none md:rounded-xl border-0 bg-transparent dark:bg-transparent border-b border-gray-100 dark:border-gray-800 md:border-b-0">
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative px-4 md:px-6 pt-4 md:pt-6 pb-4 md:pb-6">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                                <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={2.4} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                                    Certificate <span className="text-blue-600">Verification</span>
                                </h1>
                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    Verifying code: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{code}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {q.isLoading ? (
                    <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70">
                        <CardContent className="p-8 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
                            Checking…
                        </CardContent>
                    </Card>
                ) : q.data?.valid ? (
                    <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70 overflow-hidden p-0">
                        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-600" />
                        <CardContent className="p-6 md:p-8 text-center space-y-4">
                            <div className="w-14 h-14 md:w-16 md:h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                <CheckCircle2 className="w-7 h-7 md:w-8 md:h-8 text-white" strokeWidth={2.6} />
                            </div>
                            <p className="text-base md:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                Valid Certificate
                            </p>

                            <div className="text-left space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Activity
                                    </span>
                                    <span className="text-sm md:text-[15px] font-bold text-gray-900 dark:text-white text-right truncate">
                                        {q.data.activity?.title}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Issued
                                    </span>
                                    <span className="text-sm md:text-[15px] font-bold text-gray-900 dark:text-white">
                                        {fmtDate(q.data.certificate?.issued_at)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Points
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-sm md:text-[15px] font-bold text-amber-600 dark:text-amber-400">
                                        <Award className="w-4 h-4" />
                                        {fmtPoints(q.data.completion?.points_awarded)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Hours
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-sm md:text-[15px] font-bold text-blue-600 dark:text-blue-400">
                                        <Clock className="w-4 h-4" />
                                        {fmtHours(q.data.completion?.learning_hours_completed)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70 overflow-hidden p-0">
                        <div className="h-1 w-full bg-gradient-to-r from-rose-500 to-pink-600" />
                        <CardContent className="p-6 md:p-8 text-center space-y-4">
                            <div className="w-14 h-14 md:w-16 md:h-16 mx-auto rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                                <XCircle className="w-7 h-7 md:w-8 md:h-8 text-white" strokeWidth={2.6} />
                            </div>
                            <p className="text-base md:text-lg font-bold text-rose-600 dark:text-rose-400">
                                Certificate Not Found
                            </p>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                The verification code could not be matched to a valid certificate.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}