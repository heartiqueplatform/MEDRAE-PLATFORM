// src/staff-cpd/pages/CpdMyProgressPage.tsx
import { useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Calendar } from "lucide-react";
import { useMyEnrollments } from "../hooks";
import { CpdEmptyState } from "../components";
import { fmtDate } from "../lib";
import { FullScreen, PageHeader, ScrollBody, tap, getStatusTone } from "./shared";

export function CpdMyProgressPage() {
    const nav = useNavigate();
    const q = useMyEnrollments();
    const items = useMemo(() => q.data?.pages.flatMap(p => p.items) ?? [], [q.data]);

    const handleBack = useCallback(() => {
        tap();
        nav("/cpd");
    }, [nav]);

    return (
        <FullScreen>
            <PageHeader
                title="My Progress"
                subtitle="Every CPD activity you've enrolled in"
                onBack={handleBack}
                rightSlot={
                    <Link
                        to="/cpd/catalog"
                        onClick={() => tap()}
                        className="h-10 px-3 rounded-xl shrink-0
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
                <div className="px-1.5 sm:px-4 pt-3 space-y-2">
                    {q.isLoading && !items.length ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <EnrollmentSkeleton key={i} />
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
                                <div className="flex justify-center pt-2 pb-4">
                                    <button
                                        onClick={() => { tap(); q.fetchNextPage(); }}
                                        disabled={q.isFetchingNextPage}
                                        className="h-11 px-5 rounded-xl
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

/* ── Skeleton shaped like the real enrollment row ─────────────── */
function EnrollmentSkeleton() {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 animate-pulse">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="h-3 w-3/4 rounded-full bg-slate-200 dark:bg-white/[0.06] mb-2" />
                    <div className="flex gap-1.5">
                        <div className="h-4 w-16 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                        <div className="h-4 w-20 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                    </div>
                </div>
                <div className="h-4 w-8 rounded-md bg-slate-200 dark:bg-white/[0.06]" />
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.04] mt-3" />
        </div>
    );
}