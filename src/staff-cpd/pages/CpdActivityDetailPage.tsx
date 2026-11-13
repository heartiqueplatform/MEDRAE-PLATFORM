// src/staff-cpd/pages/CpdActivityDetailPage.tsx
import { useParams, Link, useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import {
    Award, Clock, CheckCircle2, ArrowRight, Sparkles, Lock,
} from "lucide-react";
import {
    useActivityTree, useMyEnrollment, useEnroll, useProgressForEnrollment,
} from "../hooks";
import { ContentTypeChip, CpdEmptyState } from "../components";
import { fmtHours, fmtPoints, fmtDuration } from "../lib";
import type { CpdContentItem } from "../lib";
import { FullScreen, PageHeader, ScrollBody, tap, getStatusTone } from "./shared";

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