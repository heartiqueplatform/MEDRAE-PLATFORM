// src/staff-cpd/pages/CpdPlayerPage.tsx
import { useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ArrowRight, Clock, Lock } from "lucide-react";
import {
    useActivityTree, useMyEnrollment, useProgressForEnrollment, useUpsertProgress,
} from "../hooks";
import { ContentRenderer, ContentTypeChip, CpdEmptyState } from "../components";
import { fmtDuration } from "../lib";
import {
    FullScreen, PageHeader, ScrollBody, tap,
} from "./shared";
import { useReadingProgress } from "./reading-tracker";

export function CpdPlayerPage() {
    const { id = "", moduleId = "" } = useParams();
    const [searchParams] = useSearchParams();
    const selectedItemId = searchParams.get("item");
    const nav = useNavigate();

    const tree = useActivityTree(id);
    const enrollment = useMyEnrollment(id);
    const progress = useProgressForEnrollment(enrollment.data?.id);
    const upsert = useUpsertProgress();

    /* 🆕 ref goes on the <main> scroll container, not the inner <div> */
    const contentRef = useRef<HTMLElement>(null);

    const moduleObj = tree.data?.modules.find(m => m.id === moduleId);
    const items = tree.data?.contentByModule[moduleId] ?? [];
    const item = items.find(x => x.id === selectedItemId) ?? items[0];
    const itemIndex = item ? items.findIndex(x => x.id === item.id) : -1;
    const nextItem = itemIndex >= 0 ? items[itemIndex + 1] : undefined;

    const isReading =
        item?.content_type === "text" ||
        item?.content_type === "article" ||
        item?.content_type === "case_study";

    const reading = useReadingProgress(contentRef, {
        minSeconds: 30,
        minPercent: 90,
    });

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
    const canComplete = !done && (!isReading || reading.isComplete);

    const handleMarkComplete = () => {
        if (!enrollment.data) return;
        if (!canComplete) {
            tap("warning");
            return;
        }
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

            {/* 🆕 ref on ScrollBody — measures the actual scroll container */}
            <ScrollBody ref={contentRef}>
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

                        {isReading && !done && (
                            <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider
                                                     text-slate-500 dark:text-slate-400">
                                        Reading progress
                                    </span>
                                    <span className={`text-[10px] font-bold tabular-nums
                                                     ${reading.isComplete
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-slate-500 dark:text-slate-400"}`}>
                                        {reading.progress}%
                                    </span>
                                </div>

                                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.06] overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300
                                                    ${reading.isComplete
                                                ? "bg-emerald-500"
                                                : "bg-blue-500"}`}
                                        style={{ width: `${reading.progress}%` }}
                                    />
                                </div>

                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                                    {reading.isComplete
                                        ? "Nice work — you can now mark this as complete."
                                        : `Keep reading — ${Math.max(0, reading.minPercent - reading.progress)}% more and ${Math.max(0, reading.minSeconds - reading.secondsReading)}s to go.`}
                                </p>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-3 gap-2 flex-wrap
                                        border-t border-slate-100 dark:border-white/[0.04]">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold">
                                {done ? (
                                    <>
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                        <span className="text-emerald-600 dark:text-emerald-400">Completed</span>
                                    </>
                                ) : isReading && !reading.isComplete ? (
                                    <>
                                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                                        <span className="text-slate-500 dark:text-slate-400">
                                            Finish reading to continue
                                        </span>
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
                                    disabled={upsert.isPending || done || !canComplete}
                                    className={`h-10 px-3 rounded-xl text-[12px] font-bold
                                                flex items-center gap-1.5
                                                active:scale-[0.97] transition-transform
                                                disabled:opacity-40
                                                ${done
                                            ? "bg-emerald-600 text-white"
                                            : canComplete
                                                ? "bg-blue-600 text-white"
                                                : "bg-slate-200 dark:bg-white/[0.06] text-slate-400 dark:text-slate-500"}`}
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {done ? "Completed" : "Mark complete"}
                                </button>
                            </div>
                        </div>
                    </section>

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
                                                    : "bg-slate-50 dark:bg-[#0d1117] active:bg-slate-100 dark:active:bg-white/[0.08]"}`}
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <span className={`text-[10px] font-mono font-bold shrink-0
                                                                 ${isCurrent ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}>
                                                    {String(idx + 1).padStart(2, "0")}
                                                </span>
                                                <ContentTypeChip type={c.content_type} />
                                                <span className={`text-[12px] font-medium truncate
                                                                 ${cDone ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"}`}>
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