// src/staff-cpd/pages.tsx
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Award, BookOpen, Clock, TrendingUp, GraduationCap, ChevronLeft, ShieldCheck,
    XCircle, CheckCircle2, ArrowRight, Sparkles, Lock, ClipboardCheck, Trophy,
    Search, Calendar, Download, Coins, Loader2, TrendingDown, UserCheck,
    ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
import {
    useDashboardStats, useActivities, useActivityTree, useMyEnrollment, useEnroll,
    useMyEnrollments, useProgressForEnrollment, useUpsertProgress,
    useAssessmentWithQuestions, useStartAttempt, useSubmitAttempt, useAttemptResults,
    useMyCompletions, useMyCertificates, useCertificate, useVerifyCertificate,
} from "./hooks";
import { useMedraeCoinConfig } from "./lib/admin-hooks";
import {
    CpdStatTile, CpdActivityCard, CpdCompletionRow, CpdCertificateCard,
    ContentRenderer, ContentTypeChip, CpdEmptyState, ChecklistRow,
} from "./components";
import { fmtDate, fmtHours, fmtPoints, fmtDuration, CONTENT_LABEL } from "./lib";
import { useEffect, useMemo, useState } from "react";
import type { CpdContentItem } from "./lib";
import { CpdCertificatePdf } from "./certificate-pdf";
import { supabase } from "@/lib/supabaseClient";
import { playSound } from "@/lib/soundManager";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import { ContributorEarningsCard } from "./components/ContributorEarningsCard";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 15) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
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
    verified: "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
    pending: "bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400",
    revoked: "bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-400",
    not_started: "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300",
    in_progress: "bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400",
    completed: "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
};

const getStatusTone = (s?: string) =>
    STATUS_TONES[(s ?? "").toLowerCase()] ?? STATUS_TONES.not_started;

/* ------------------------------------------------------------------ */
/*  PageHeader                                                        */
/* ------------------------------------------------------------------ */

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

function FullScreen({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white"
            style={{ WebkitTapHighlightColor: "transparent" }}>
            {children}
        </div>
    );
}

function ScrollBody({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar"
            style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="w-full max-w-[880px] mx-auto pb-16">
                {children}
            </div>
        </main>
    );
}


export function CpdDashboard() {
    const { data, isLoading } = useDashboardStats();
    const nav = useNavigate();
    const home = useHomeRoute();

    return (
        <FullScreen>
            <PageHeader
                title="My CPD"
                subtitle={
                    data?.current_period
                        ? `${data.current_period.name} · ends ${fmtDate(data.current_period.end_date)}`
                        : "Continuing Professional Development"
                }
                onBack={() => { tap(); nav(home); }}
                rightSlot={
                    <Link
                        to="/cpd/catalog"
                        onClick={() => tap()}
                        className="h-9 px-3 rounded-xl shrink-0
                                   bg-blue-600 text-white text-[11px] font-bold
                                   flex items-center gap-1.5
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        <BookOpen className="h-3.5 w-3.5" />
                        Catalog
                    </Link>
                }
            />

            <ScrollBody>
                <div className="px-4 pt-4 space-y-4">
                    {/* 🆕 Contributor earnings — only for verified contributors */}
                    <ContributorEarningsCard />

                    {/* Stats grid */}
                    <section className="grid grid-cols-2 gap-2">
                        <CpdStatTile label="CPD Points" value={isLoading ? "…" : fmtPoints(data?.total_points)} icon={Award} tone="amber" />
                        <CpdStatTile label="Learning Hours" value={isLoading ? "…" : fmtHours(data?.total_hours)} icon={Clock} tone="blue" />
                        <CpdStatTile label="Completed" value={isLoading ? "…" : data?.completed_count ?? 0} icon={CheckCircle2} tone="green" />
                        <CpdStatTile label="In Progress" value={isLoading ? "…" : data?.in_progress_count ?? 0} icon={TrendingUp} tone="violet" />
                        <CpdStatTile label="Certificates" value={isLoading ? "…" : data?.certificates_count ?? 0} icon={GraduationCap} tone="rose" />
                    </section>

                    {/* Recent completions */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-[10px] font-bold uppercase tracking-wider
                                           text-slate-500 dark:text-slate-400">
                                Recent Completions
                            </h2>
                            <Link
                                to="/cpd/progress"
                                onClick={() => tap()}
                                className="inline-flex items-center gap-1 text-[11px] font-bold
                                           text-blue-600 dark:text-blue-400
                                           active:scale-[0.97] transition-transform"
                            >
                                View all <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>
                        {data?.recent_completions?.length ? (
                            <div className="space-y-2">
                                {data.recent_completions.map((c) => (
                                    <CpdCompletionRow key={c.id} completion={c} />
                                ))}
                            </div>
                        ) : (
                            <CpdEmptyState title="No completions yet" hint="Enroll in a CPD activity from the catalog to get started." />
                        )}
                    </section>
                </div>
            </ScrollBody>
        </FullScreen>
    );
}

/* ═══════════════════════════════════════════════════════════════
   2. CATALOG  /cpd/catalog
   ═══════════════════════════════════════════════════════════════ */
export function CpdCatalogPage() {
    const nav = useNavigate();
    const [search, setSearch] = useState("");
    const [debounced, setDebounced] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setDebounced(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const q = useActivities({ search: debounced || undefined });
    const items = useMemo(() => q.data?.pages.flatMap(p => p.items) ?? [], [q.data]);

    return (
        <FullScreen>
            <PageHeader
                title="CPD Catalog"
                subtitle="Published activities you can enrol in"
                onBack={() => nav(-1)}
            />

            <ScrollBody>
                <div className="px-4 pt-4 space-y-4">
                    {/* Search pill */}
                    <div className="relative">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search activities…"
                            className="w-full h-10 rounded-xl bg-white dark:bg-[#161b22]
                                       pl-9 pr-3 text-[13px] font-medium
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       outline-none"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
                                          text-slate-400 pointer-events-none" />
                    </div>

                    {q.isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-64 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                            ))}
                        </div>
                    ) : items.length ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {items.map((a) => <CpdActivityCard key={a.id} activity={a} />)}
                            </div>
                            {q.hasNextPage && (
                                <div className="flex justify-center pt-2">
                                    <button
                                        onClick={() => { tap(); q.fetchNextPage(); }}
                                        disabled={q.isFetchingNextPage}
                                        className="h-10 px-4 rounded-xl
                                                   bg-slate-100 dark:bg-white/[0.06]
                                                   text-slate-700 dark:text-slate-200
                                                   text-[12px] font-bold
                                                   active:scale-[0.97] transition-transform
                                                   disabled:opacity-50"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {q.isFetchingNextPage ? "Loading…" : "Load more"}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <CpdEmptyState
                            title={debounced ? "No matching activities" : "No activities yet"}
                            hint={debounced ? "Try a different search term." : "Once staff publish CPD activities they'll appear here."}
                        />
                    )}
                </div>
            </ScrollBody>
        </FullScreen>
    );
}

/* ═══════════════════════════════════════════════════════════════
   3. ACTIVITY DETAIL  /cpd/activity/:id
   ═══════════════════════════════════════════════════════════════ */
export function CpdActivityDetailPage() {
    const { id = "" } = useParams();
    const nav = useNavigate();
    const tree = useActivityTree(id);
    const enrollment = useMyEnrollment(id);
    const enroll = useEnroll();
    const progress = useProgressForEnrollment(enrollment.data?.id);

    if (tree.isLoading) {
        return (
            <FullScreen>
                <PageHeader title="Loading…" onBack={() => nav(-1)} />
                <ScrollBody>
                    <div className="px-4 pt-4 space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-32 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                        ))}
                    </div>
                </ScrollBody>
            </FullScreen>
        );
    }
    if (!tree.data) {
        return (
            <FullScreen>
                <PageHeader title="Activity" onBack={() => nav(-1)} />
                <ScrollBody>
                    <div className="px-4 pt-4">
                        <CpdEmptyState title="Activity not found" hint="The activity may have been removed." />
                    </div>
                </ScrollBody>
            </FullScreen>
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
        tap("success");
        await enroll.mutateAsync(activity.id);
    };

    return (
        <FullScreen>
            <PageHeader
                title={activity.title}
                subtitle={activity.category || "CPD Activity"}
                onBack={() => { tap(); nav("/cpd/catalog"); }}
            />

            <ScrollBody>
                <div className="px-4 pt-4 space-y-3">
                    {/* Activity meta card */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
                        {activity.thumbnail_url && (
                            <div className="relative aspect-[16/9] bg-slate-100 dark:bg-white/[0.06]">
                                <img src={activity.thumbnail_url} alt="" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="p-4 space-y-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                                {activity.category && (
                                    <span className="inline-flex items-center rounded-full px-2 py-0.5
                                                     text-[10px] font-bold
                                                     bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                                        {activity.category}
                                    </span>
                                )}
                                {activity.difficulty && (
                                    <span className="inline-flex items-center rounded-full px-2 py-0.5
                                                     text-[10px] font-bold capitalize
                                                     bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                                        {activity.difficulty}
                                    </span>
                                )}
                                {enrollment.data && (
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5
                                                      text-[10px] font-bold capitalize ${getStatusTone(enrollment.data.status)}`}>
                                        {enrollment.data.status.replace("_", " ")}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-3 text-[11px] font-medium
                                            text-slate-500 dark:text-slate-400">
                                <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {fmtHours(activity.learning_hours)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <Award className="h-3 w-3" />
                                    {fmtPoints(activity.configured_cpd_points)} pts
                                </span>
                            </div>

                            {activity.description && (
                                <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                                    {activity.description}
                                </p>
                            )}

                            {!enrollment.data ? (
                                <button
                                    onClick={handleEnroll}
                                    disabled={enroll.isPending}
                                    className="w-full h-11 rounded-xl bg-blue-600 text-white
                                               text-[13px] font-bold
                                               active:scale-[0.97] transition-transform
                                               disabled:opacity-60"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    {enroll.isPending ? "Enrolling…" : "Enrol in this activity"}
                                </button>
                            ) : (
                                <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Progress
                                        </span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                                            {shownProgress}%
                                        </span>
                                    </div>
                                    <Progress value={shownProgress} className="h-1.5" />
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                        {doneItems} of {totalItems} items completed
                                        {allRequired.length > 0 && ` · ${doneRequired}/${allRequired.length} required`}
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Modules */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <h2 className="text-[10px] font-bold uppercase tracking-wider
                                       text-slate-500 dark:text-slate-400">
                            Modules ({modules.length})
                        </h2>
                        {modules.length === 0 && <CpdEmptyState title="No modules yet" hint="Content hasn't been added yet." />}
                        {modules.map((m) => {
                            const items = contentByModule[m.id] ?? [];
                            return (
                                <div key={m.id} className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                                            Module {m.position + 1} · {m.title}
                                        </h3>
                                        {m.estimated_minutes && (
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                                                {m.estimated_minutes} min
                                            </span>
                                        )}
                                    </div>
                                    {m.description && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {m.description}
                                        </p>
                                    )}
                                    <div className="space-y-1">
                                        {items.length === 0 && (
                                            <p className="text-[11px] text-slate-400 px-2 py-1">No content yet.</p>
                                        )}
                                        {items.map((c) => {
                                            const p = progressByItem.get(c.id);
                                            const done = p?.status === "completed";
                                            const started = p?.status === "in_progress";
                                            return (
                                                <Link
                                                    key={c.id}
                                                    to={`/cpd/activity/${activity.id}/module/${m.id}?item=${c.id}`}
                                                    onClick={() => tap()}
                                                    className="flex items-center justify-between gap-2 rounded-xl
                                                               bg-slate-50 dark:bg-[#0d1117] px-3 py-2.5
                                                               active:bg-slate-100 dark:active:bg-white/[0.08]
                                                               transition-colors"
                                                    style={{ touchAction: "manipulation" }}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <ContentTypeChip type={c.content_type} />
                                                        <span className={`text-[12px] font-medium truncate ${done ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"}`}>
                                                            {c.title}
                                                        </span>
                                                        {c.is_required && !done && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full
                                                                             bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400 shrink-0">
                                                                REQ
                                                            </span>
                                                        )}
                                                        {started && !done && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full
                                                                             bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400 shrink-0">
                                                                IN
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {c.duration_seconds && (
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                                {fmtDuration(c.duration_seconds)}
                                                            </span>
                                                        )}
                                                        {done ? (
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2.6} />
                                                        ) : (
                                                            <ArrowRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                                                        )}
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </section>

                    {/* Assessments */}
                    {assessments.length > 0 && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                            <h2 className="text-[10px] font-bold uppercase tracking-wider
                                           text-slate-500 dark:text-slate-400">
                                Assessments
                            </h2>
                            {assessments.map((a) => (
                                <div key={a.id} className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3
                                                          flex items-center justify-between gap-2 flex-wrap">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">
                                            {a.title}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            Pass mark: {a.pass_mark}%
                                            {a.attempt_limit ? ` · max ${a.attempt_limit} attempt${a.attempt_limit > 1 ? "s" : ""}` : ""}
                                        </p>
                                    </div>
                                    <button
                                        disabled={!enrollment.data || !allDone}
                                        onClick={() => { tap("success"); nav(`/cpd/activity/${activity.id}/assessment?assessment=${a.id}`); }}
                                        className="h-9 px-3 rounded-xl shrink-0
                                                   bg-blue-600 text-white text-[11px] font-bold
                                                   flex items-center gap-1.5
                                                   active:scale-[0.97] transition-transform
                                                   disabled:opacity-40"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {allDone ? (
                                            <>
                                                <Sparkles className="h-3.5 w-3.5" />
                                                Start
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="h-3.5 w-3.5" />
                                                Locked
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </section>
                    )}
                </div>
            </ScrollBody>
        </FullScreen>
    );
}

/* ═══════════════════════════════════════════════════════════════
   4. PLAYER  /cpd/activity/:id/module/:moduleId?item=:itemId
   ═══════════════════════════════════════════════════════════════ */
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
            <FullScreen>
                <PageHeader title="Loading…" onBack={() => nav(-1)} />
                <ScrollBody>
                    <div className="px-4 pt-4 space-y-3">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="h-40 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                        ))}
                    </div>
                </ScrollBody>
            </FullScreen>
        );
    }
    if (!tree.data || !item) {
        return (
            <FullScreen>
                <PageHeader title="Player" onBack={() => nav(-1)} />
                <ScrollBody>
                    <div className="px-4 pt-4">
                        <CpdEmptyState title="Content not found" />
                    </div>
                </ScrollBody>
            </FullScreen>
        );
    }

    const progressRow = progress.data?.find(p => p.content_item_id === item.id);
    const done = progressRow?.status === "completed";

    const handleMarkComplete = () => {
        if (!enrollment.data) return;
        tap("success");
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
        <FullScreen>
            <PageHeader
                title={moduleObj?.title || "Module"}
                subtitle={item.title}
                onBack={() => { tap(); nav(`/cpd/activity/${id}`); }}
            />

            <ScrollBody>
                <div className="px-4 pt-4 space-y-3">
                    {/* Player card */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <ContentTypeChip type={item.content_type} />
                            {item.external_provider && (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5
                                                 text-[10px] font-bold capitalize
                                                 bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                                    {item.external_provider.replace("_", " ")}
                                </span>
                            )}
                            {item.is_required && (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5
                                                 text-[10px] font-bold
                                                 bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400">
                                    REQUIRED
                                </span>
                            )}
                            {item.duration_seconds && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium
                                                 text-slate-500 dark:text-slate-400">
                                    <Clock className="h-3 w-3" /> {fmtDuration(item.duration_seconds)}
                                </span>
                            )}
                        </div>

                        <h2 className="text-[14px] font-bold text-slate-900 dark:text-white leading-snug">
                            {item.title}
                        </h2>
                        {item.description && (
                            <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                {item.description}
                            </p>
                        )}

                        {item.content_type !== "video" && item.content_type !== "podcast" && (item.metadata?.thumbnail || item.metadata?.artwork) && (
                            <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-white/[0.06]">
                                <img
                                    src={item.metadata.thumbnail || item.metadata.artwork}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        <ContentRenderer item={item} />

                        <div className="flex items-center justify-between pt-3 gap-2 flex-wrap
                                        border-t border-slate-100 dark:border-white/[0.04]">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold">
                                {done ? (
                                    <>
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                        <span className="text-emerald-600 dark:text-emerald-400">Completed</span>
                                    </>
                                ) : (
                                    <span className="text-slate-500 dark:text-slate-400">
                                        Mark as complete to continue
                                    </span>
                                )}
                            </span>
                            <div className="flex items-center gap-2">
                                {nextItem && (
                                    <button
                                        onClick={() => { tap(); nav(`/cpd/activity/${id}/module/${moduleId}?item=${nextItem.id}`); }}
                                        className="h-10 px-3 rounded-xl
                                                   bg-slate-100 dark:bg-white/[0.06]
                                                   text-slate-700 dark:text-slate-200
                                                   text-[12px] font-bold
                                                   flex items-center gap-1.5
                                                   active:scale-[0.97] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        Skip <ArrowRight className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                <button
                                    onClick={handleMarkComplete}
                                    disabled={upsert.isPending || done}
                                    className={`h-10 px-3 rounded-xl text-[12px] font-bold
                                                flex items-center gap-1.5
                                                active:scale-[0.97] transition-transform
                                                disabled:opacity-40
                                                ${done
                                            ? "bg-emerald-600 text-white"
                                            : "bg-blue-600 text-white"
                                        }`}
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {done ? "Completed" : "Mark complete"}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* In this module */}
                    {items.length > 1 && (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
                            <h2 className="text-[10px] font-bold uppercase tracking-wider
                                           text-slate-500 dark:text-slate-400">
                                In this module ({items.length})
                            </h2>
                            <div className="space-y-1">
                                {items.map((c, idx) => {
                                    const p = progress.data?.find(x => x.content_item_id === c.id);
                                    const cDone = p?.status === "completed";
                                    const isCurrent = c.id === item.id;
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => { tap(); nav(`/cpd/activity/${id}/module/${moduleId}?item=${c.id}`); }}
                                            className={`w-full text-left flex items-center justify-between gap-2
                                                        rounded-xl px-3 py-2 transition-colors
                                                        ${isCurrent
                                                    ? "bg-blue-50 dark:bg-blue-400/10"
                                                    : "bg-slate-50 dark:bg-[#0d1117] active:bg-slate-100 dark:active:bg-white/[0.08]"
                                                }`}
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <span className={`text-[10px] font-mono font-bold shrink-0 ${isCurrent ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}>
                                                    {String(idx + 1).padStart(2, "0")}
                                                </span>
                                                <ContentTypeChip type={c.content_type} />
                                                <span className={`text-[12px] font-medium truncate ${cDone ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"}`}>
                                                    {c.title}
                                                </span>
                                            </div>
                                            {cDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" strokeWidth={3} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>
            </ScrollBody>
        </FullScreen>
    );
}

/* ═══════════════════════════════════════════════════════════════
   5. ASSESSMENT  /cpd/activity/:id/assessment?assessment=:assessmentId
   ═══════════════════════════════════════════════════════════════ */
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
            <FullScreen>
                <PageHeader title="Loading…" onBack={() => nav(-1)} />
                <ScrollBody>
                    <div className="px-4 pt-4 space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-24 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                        ))}
                    </div>
                </ScrollBody>
            </FullScreen>
        );
    }
    if (!bundle.data) {
        return (
            <FullScreen>
                <PageHeader title="Assessment" onBack={() => nav(-1)} />
                <ScrollBody>
                    <div className="px-4 pt-4">
                        <CpdEmptyState title="Assessment not found" />
                    </div>
                </ScrollBody>
            </FullScreen>
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
        tap("success");
        await submitAttempt.mutateAsync({ attemptId, answers });
        nav(`/cpd/activity/${id}/assessment/${attemptId}/results`);
    };

    return (
        <FullScreen>
            <PageHeader
                title={assessment.title}
                subtitle={`Pass mark ${assessment.pass_mark}% · ${answered}/${totalQuestions} answered`}
                onBack={() => { tap(); nav(`/cpd/activity/${id}`); }}
            />

            <ScrollBody>
                <div className="px-4 pt-4 space-y-3">
                    {/* Progress card */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
                        <Progress
                            value={totalQuestions > 0 ? (answered / totalQuestions) * 100 : 0}
                            className="h-1.5"
                        />
                    </section>

                    {/* Questions */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-5">
                        {questions.map((q: any, i: number) => {
                            const qAnswered = (() => {
                                const v = answers[q.id];
                                if (q.question_type === "multiple_select") return Array.isArray(v) && v.length > 0;
                                return v !== undefined && v !== null && v !== "";
                            })();

                            return (
                                <div key={q.id} className="space-y-3 pb-5 border-b border-slate-100 dark:border-white/[0.04] last:border-0 last:pb-0">
                                    <div className="flex items-start gap-2">
                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0
                                                        text-[11px] font-bold
                                                        ${qAnswered
                                                ? "bg-emerald-500 text-white"
                                                : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"
                                            }`}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug">
                                                {q.question}
                                            </p>
                                            {q.points && q.points !== 1 && (
                                                <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full
                                                                 bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
                                                    {q.points} pts
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 pl-8">
                                        {q.options?.map((opt: any) => {
                                            const checked = q.question_type === "multiple_select"
                                                ? Array.isArray(answers[q.id]) && answers[q.id].includes(opt.id)
                                                : answers[q.id] === opt.id;
                                            return (
                                                <label
                                                    key={opt.id}
                                                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5
                                                                text-[12px] cursor-pointer
                                                                transition-colors
                                                                ${checked
                                                            ? "bg-blue-50 dark:bg-blue-400/10 text-blue-900 dark:text-blue-100"
                                                            : "bg-slate-50 dark:bg-[#0d1117] text-slate-700 dark:text-slate-300 active:bg-slate-100 dark:active:bg-white/[0.08]"
                                                        }`}
                                                    style={{ touchAction: "manipulation" }}
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
                                                        className="w-4 h-4 accent-blue-600 shrink-0"
                                                    />
                                                    <span className="font-medium">
                                                        {opt.option_text}
                                                    </span>
                                                </label>
                                            );
                                        })}

                                        {q.question_type === "short_answer" && (
                                            <textarea
                                                value={answers[q.id] ?? ""}
                                                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                                                className="w-full rounded-xl bg-slate-50 dark:bg-[#0d1117]
                                                           p-3 text-[12px] font-medium
                                                           text-slate-900 dark:text-white
                                                           outline-none resize-y"
                                                rows={3}
                                                placeholder="Type your answer…"
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </section>

                    {/* Submit bar */}
                    <div className="sticky bottom-2">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3
                                        flex items-center justify-between gap-2 flex-wrap
                                        border border-slate-200/70 dark:border-white/[0.06]">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                {answered < totalQuestions
                                    ? `${totalQuestions - answered} unanswered`
                                    : "All questions answered"}
                            </span>
                            <button
                                onClick={submit}
                                disabled={submitAttempt.isPending || !attemptId}
                                className="h-10 px-4 rounded-xl bg-blue-600 text-white
                                           text-[12px] font-bold
                                           active:scale-[0.97] transition-transform
                                           disabled:opacity-40"
                                style={{ touchAction: "manipulation" }}
                            >
                                {submitAttempt.isPending ? "Submitting…" : "Submit"}
                            </button>
                        </div>
                    </div>
                </div>
            </ScrollBody>
        </FullScreen>
    );
}

/* ═══════════════════════════════════════════════════════════════
   6. ATTEMPT RESULTS  /cpd/activity/:id/assessment/:attemptId/results
   ═══════════════════════════════════════════════════════════════ */
export function CpdAssessmentResultsPage() {
    const { id = "", attemptId = "" } = useParams();
    const nav = useNavigate();
    const q = useAttemptResults(attemptId);

    if (q.isLoading) {
        return (
            <FullScreen>
                <PageHeader title="Loading…" onBack={() => nav(-1)} />
                <ScrollBody>
                    <div className="px-4 pt-4">
                        <div className="h-64 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                    </div>
                </ScrollBody>
            </FullScreen>
        );
    }
    if (!q.data) {
        return (
            <FullScreen>
                <PageHeader title="Results" onBack={() => nav(-1)} />
                <ScrollBody>
                    <div className="px-4 pt-4">
                        <CpdEmptyState title="Results not found" />
                    </div>
                </ScrollBody>
            </FullScreen>
        );
    }

    const a: any = q.data;
    const passed = !!a.passed;
    const score = Math.round(a.score ?? 0);

    return (
        <FullScreen>
            <PageHeader
                title="Assessment Result"
                subtitle={passed ? "You passed" : "Not yet"}
                onBack={() => nav(`/cpd/activity/${id}`)}
            />

            <ScrollBody>
                <div className="px-4 pt-4 space-y-3">
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center space-y-4">
                        <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center
                                        ${passed
                                ? "bg-emerald-50 dark:bg-emerald-400/10"
                                : "bg-rose-50 dark:bg-rose-400/10"
                            }`}>
                            {passed ? (
                                <Trophy className="h-8 w-8 text-emerald-600 dark:text-emerald-400" strokeWidth={2.4} />
                            ) : (
                                <XCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" strokeWidth={2.4} />
                            )}
                        </div>

                        <div>
                            <h2 className={`text-lg font-bold ${passed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {passed ? "Passed" : "Not Yet"}
                            </h2>
                            <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums">
                                {score}%
                            </p>
                        </div>

                        <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {passed
                                ? "Great work — your completion and certificate have been recorded."
                                : "You can retry the assessment. Review the module content first."}
                        </p>

                        <div className="flex justify-center gap-2 pt-3 flex-wrap">
                            <button
                                onClick={() => { tap(); nav(`/cpd/activity/${id}`); }}
                                className="h-10 px-4 rounded-xl
                                           bg-slate-100 dark:bg-white/[0.06]
                                           text-slate-700 dark:text-slate-200
                                           text-[12px] font-bold
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                Back to Activity
                            </button>
                            {!passed && (
                                <button
                                    onClick={() => { tap(); nav(`/cpd/activity/${id}/assessment?assessment=${a.assessment_id}`); }}
                                    className="h-10 px-4 rounded-xl bg-blue-600 text-white
                                               text-[12px] font-bold
                                               active:scale-[0.97] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    Retry
                                </button>
                            )}
                            {passed && (
                                <>
                                    <button
                                        onClick={() => { tap(); nav("/cpd/certificates"); }}
                                        className="h-10 px-4 rounded-xl
                                                   bg-amber-50 dark:bg-amber-400/10
                                                   text-amber-700 dark:text-amber-400
                                                   text-[12px] font-bold
                                                   flex items-center gap-1.5
                                                   active:scale-[0.97] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <Award className="h-3.5 w-3.5" />
                                        Certificates
                                    </button>
                                    <button
                                        onClick={() => { tap(); nav("/cpd/progress"); }}
                                        className="h-10 px-4 rounded-xl bg-blue-600 text-white
                                                   text-[12px] font-bold
                                                   active:scale-[0.97] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        My Progress
                                    </button>
                                </>
                            )}
                        </div>
                    </section>
                </div>
            </ScrollBody>
        </FullScreen>
    );
}

/* ═══════════════════════════════════════════════════════════════
   7. MY PROGRESS  /cpd/progress
   ═══════════════════════════════════════════════════════════════ */
export function CpdMyProgressPage() {
    const nav = useNavigate();
    const q = useMyEnrollments();
    const items = useMemo(() => q.data?.pages.flatMap(p => p.items) ?? [], [q.data]);

    return (
        <FullScreen>
            <PageHeader
                title="My Progress"
                subtitle="Every CPD activity you've enrolled in"
                onBack={() => nav(-1)}
                rightSlot={
                    <Link
                        to="/cpd/catalog"
                        onClick={() => tap()}
                        className="h-9 px-3 rounded-xl shrink-0
                                   bg-slate-100 dark:bg-white/[0.06]
                                   text-slate-700 dark:text-slate-200
                                   text-[11px] font-bold
                                   flex items-center gap-1.5
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        <BookOpen className="h-3.5 w-3.5" />
                        Catalog
                    </Link>
                }
            />

            <ScrollBody>
                <div className="px-4 pt-4 space-y-2">
                    {q.isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-24 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                        ))
                    ) : items.length ? (
                        <>
                            {items.map((e) => (
                                <Link
                                    key={e.id}
                                    to={`/cpd/activity/${e.activity_id}`}
                                    onClick={() => tap()}
                                    className="block rounded-2xl bg-white dark:bg-[#161b22] p-4
                                               active:scale-[0.99] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                                                    {e.activity?.title ?? "Activity"}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5
                                                                      text-[10px] font-bold capitalize ${getStatusTone(e.status)}`}>
                                                        {e.status.replace("_", " ")}
                                                    </span>
                                                    {e.completed_at && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium
                                                                         text-slate-500 dark:text-slate-400">
                                                            <Calendar className="h-3 w-3" />
                                                            {fmtDate(e.completed_at)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums shrink-0">
                                                {Math.round(e.progress_percentage)}%
                                            </span>
                                        </div>
                                        <Progress value={e.progress_percentage} className="h-1.5" />
                                    </div>
                                </Link>
                            ))}
                            {q.hasNextPage && (
                                <div className="flex justify-center pt-2">
                                    <button
                                        onClick={() => { tap(); q.fetchNextPage(); }}
                                        disabled={q.isFetchingNextPage}
                                        className="h-10 px-4 rounded-xl
                                                   bg-slate-100 dark:bg-white/[0.06]
                                                   text-slate-700 dark:text-slate-200
                                                   text-[12px] font-bold
                                                   active:scale-[0.97] transition-transform
                                                   disabled:opacity-50"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {q.isFetchingNextPage ? "Loading…" : "Load more"}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <CpdEmptyState
                            title="No enrollments yet"
                            hint="Browse the CPD catalog to get started."
                            icon={BookOpen}
                        />
                    )}
                </div>
            </ScrollBody>
        </FullScreen>
    );
}

/* ═══════════════════════════════════════════════════════════════
   8. CERTIFICATES  /cpd/certificates
   ═══════════════════════════════════════════════════════════════ */
export function CpdCertificatesPage() {
    const nav = useNavigate();
    const q = useMyCertificates();
    const items = useMemo(() => q.data?.pages.flatMap(p => p.items) ?? [], [q.data]);

    return (
        <FullScreen>
            <PageHeader
                title="My Certificates"
                subtitle="Verified CPD certificates"
                onBack={() => nav(-1)}
            />

            <ScrollBody>
                <div className="px-4 pt-4 space-y-3">
                    {q.isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-28 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                            ))}
                        </div>
                    ) : items.length ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {items.map((c) => <CpdCertificateCard key={c.id} certificate={c} />)}
                            </div>
                            {q.hasNextPage && (
                                <div className="flex justify-center pt-2">
                                    <button
                                        onClick={() => { tap(); q.fetchNextPage(); }}
                                        disabled={q.isFetchingNextPage}
                                        className="h-10 px-4 rounded-xl
                                                   bg-slate-100 dark:bg-white/[0.06]
                                                   text-slate-700 dark:text-slate-200
                                                   text-[12px] font-bold
                                                   active:scale-[0.97] transition-transform
                                                   disabled:opacity-50"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {q.isFetchingNextPage ? "Loading…" : "Load more"}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <CpdEmptyState
                            title="No certificates yet"
                            hint="Complete a CPD activity to earn your first certificate."
                            icon={Award}
                        />
                    )}
                </div>
            </ScrollBody>
        </FullScreen>
    );
}

/* ═══════════════════════════════════════════════════════════════
   9. CERTIFICATE VIEW  /cpd/certificates/:id
   ═══════════════════════════════════════════════════════════════ */
export function CpdCertificateViewPage() {
    const { id = "" } = useParams();
    const nav = useNavigate();
    const q = useCertificate(id);
    const [profile, setProfile] = useState<any>(null);
    const [activity, setActivity] = useState<any>(null);
    const [completion, setCompletion] = useState<any>(null);

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
            <FullScreen>
                <PageHeader title="Certificate" onBack={() => nav(-1)} />
                <ScrollBody>
                    <div className="px-4 pt-4">
                        <div className="h-96 rounded-2xl bg-white dark:bg-[#161b22] animate-pulse" />
                    </div>
                </ScrollBody>
            </FullScreen>
        );
    }
    if (!q.data) {
        return (
            <FullScreen>
                <PageHeader title="Certificate" onBack={() => nav(-1)} />
                <ScrollBody>
                    <div className="px-4 pt-4">
                        <CpdEmptyState title="Certificate not found" />
                    </div>
                </ScrollBody>
            </FullScreen>
        );
    }
    const c: any = q.data;

    const handleDownloadPdf = () => {
        tap();
        window.print();
    };

    return (
        <>
            <FullScreen>
                <PageHeader
                    title="Certificate"
                    subtitle="Verified CPD completion"
                    onBack={() => { tap(); nav(-1); }}
                />

                <ScrollBody>
                    <div className="px-4 pt-4 print:hidden">
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center
                                            bg-amber-50 dark:bg-amber-400/10">
                                <Award className="h-8 w-8 text-amber-600 dark:text-amber-400" strokeWidth={2.4} />
                            </div>

                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-amber-600 dark:text-amber-400">
                                    Certificate of Completion
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                    Medrae Nursing — Continuing Professional Development
                                </p>
                            </div>

                            <div className="border-t border-b border-slate-100 dark:border-white/[0.04] py-4 space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Awarded to
                                </p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">
                                    {profile?.name || "—"}
                                </p>
                                {(profile?.nck_number || profile?.institution) && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {profile?.nck_number ? `NCK: ${profile.nck_number}` : ""}
                                        {profile?.nck_number && profile?.institution ? " · " : ""}
                                        {profile?.institution || ""}
                                    </p>
                                )}
                            </div>

                            {activity?.title && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Activity
                                    </p>
                                    <p className="text-[14px] font-bold text-slate-900 dark:text-white mt-1">
                                        {activity.title}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 text-left">
                                <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Issued
                                    </p>
                                    <p className="text-[12px] font-bold text-slate-900 dark:text-white mt-1">
                                        {fmtDate(c.issued_at)}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Status
                                    </p>
                                    <p className="text-[12px] font-bold text-slate-900 dark:text-white capitalize mt-1">
                                        {c.status}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-blue-50 dark:bg-blue-400/10 p-3 space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-blue-600 dark:text-blue-400">
                                    Verification Code
                                </p>
                                <p className="text-[12px] font-mono font-bold text-slate-900 dark:text-white break-all">
                                    {c.verification_code}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    Verify at /cpd/verify/{c.verification_code}
                                </p>
                            </div>

                            <button
                                onClick={handleDownloadPdf}
                                className="w-full h-11 rounded-xl bg-amber-600 text-white
                                           text-[13px] font-bold
                                           flex items-center justify-center gap-2
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                <Download className="h-4 w-4" />
                                Download PDF
                            </button>

                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                In the print dialog, choose <b>Save as PDF</b> and set layout to <b>Landscape</b>.
                            </p>
                        </section>
                    </div>
                </ScrollBody>
            </FullScreen>

            {/* Print-only certificate */}
            <CpdCertificatePdf
                certificate={c}
                completion={completion}
                activity={activity}
                recipient={profile}
            />
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════
   10. VERIFY  /cpd/verify/:code
   ═══════════════════════════════════════════════════════════════ */
export function CpdVerifyPage() {
    const { code = "" } = useParams();
    const nav = useNavigate();
    const q = useVerifyCertificate(code);

    return (
        <FullScreen>
            <PageHeader
                title="Certificate Verification"
                subtitle={`Code: ${code}`}
                onBack={() => nav(-1)}
            />

            <ScrollBody>
                <div className="px-4 pt-4">
                    {q.isLoading ? (
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center">
                            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                                Checking…
                            </p>
                        </div>
                    ) : q.data?.valid ? (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center space-y-4">
                            <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center
                                            bg-emerald-50 dark:bg-emerald-400/10">
                                <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" strokeWidth={2.6} />
                            </div>
                            <p className="text-[14px] font-bold text-emerald-600 dark:text-emerald-400">
                                Valid Certificate
                            </p>

                            <div className="text-left space-y-3 pt-4 border-t border-slate-100 dark:border-white/[0.04]">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Activity
                                    </span>
                                    <span className="text-[12px] font-bold text-slate-900 dark:text-white text-right truncate">
                                        {q.data.activity?.title}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Issued
                                    </span>
                                    <span className="text-[12px] font-bold text-slate-900 dark:text-white">
                                        {fmtDate(q.data.certificate?.issued_at)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Points
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-amber-600 dark:text-amber-400">
                                        <Award className="h-3.5 w-3.5" />
                                        {fmtPoints(q.data.completion?.points_awarded)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Hours
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-blue-600 dark:text-blue-400">
                                        <Clock className="h-3.5 w-3.5" />
                                        {fmtHours(q.data.completion?.learning_hours_completed)}
                                    </span>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-6 text-center space-y-3">
                            <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center
                                            bg-rose-50 dark:bg-rose-400/10">
                                <XCircle className="h-7 w-7 text-rose-600 dark:text-rose-400" strokeWidth={2.6} />
                            </div>
                            <p className="text-[14px] font-bold text-rose-600 dark:text-rose-400">
                                Certificate Not Found
                            </p>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                The verification code could not be matched to a valid certificate.
                            </p>
                        </section>
                    )}
                </div>
            </ScrollBody>
        </FullScreen>
    );
}