// src/staff-cpd/admin/ActivityEditorPage.tsx
import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { BookOpen, Clock, Award } from "lucide-react";

import { useAdminActivity } from "../lib/admin-hooks";
import { fmtHours, fmtPoints } from "../lib";

import { tap, getStatusTone } from "./editor/editor-helpers";
import { BasicsTab } from "./editor/BasicsTab";
import { ModulesTab } from "./editor/ModulesTab";
import { AssessmentsTab } from "./editor/AssessmentsTab";
import { PublishTab } from "./editor/PublishTab";

/* ─── Tab definitions ─────────────────────────────────────────── */
const TABS = [
    { id: "basics", label: "Basics" },
    { id: "modules", label: "Modules" },
    { id: "assessments", label: "Assessments" },
    { id: "publish", label: "Publish" },
] as const;

type TabId = typeof TABS[number]["id"];

/* ─── Skeleton ────────────────────────────────────────────────── */
function EditorLoading() {
    return (
        // ✅ Gutter restored
        <div className="w-full max-w-[880px] mx-auto px-1.5 sm:px-4 pt-3 pb-16 space-y-3">
            {/* Header skeleton */}
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 animate-pulse">
                <div className="flex items-start gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-white/[0.06] shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-3 w-3/4 rounded-full bg-slate-200 dark:bg-white/[0.06]" />
                        <div className="flex gap-2">
                            <div className="h-4 w-16 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                            <div className="h-4 w-14 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab strip skeleton */}
            <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 w-20 rounded-xl bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                ))}
            </div>

            {/* Content skeleton */}
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2.5 animate-pulse">
                <div className="h-11 rounded-xl bg-slate-200 dark:bg-white/[0.06]" />
                <div className="h-11 rounded-xl bg-slate-200 dark:bg-white/[0.06]" />
                <div className="h-24 rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
            </div>
        </div>
    );
}

/* ─── Page shell ──────────────────────────────────────────────── */
export default function ActivityEditorPage() {
    const { id = "" } = useParams();
    const q = useAdminActivity(id);

    if (q.isLoading || !q.data) return <EditorLoading />;

    const { activity, modules, contentByModule, assessments } = q.data;

    return (
        <ActivityEditorBody
            activity={activity}
            modules={modules}
            contentByModule={contentByModule}
            assessments={assessments}
        />
    );
}

/* ─── Body (header + tabs + active tab content) ───────────────── */
function ActivityEditorBody({
    activity,
    modules,
    contentByModule,
    assessments,
}: any) {
    const [tab, setTab] = useState<TabId>("basics");

    const handleTab = useCallback((t: TabId) => {
        tap();
        setTab(t);
    }, []);

    return (
        // ✅ Gutter restored + consistent with other admin pages
        <div className="w-full max-w-[880px] mx-auto px-1.5 sm:px-4 pt-3 pb-16 space-y-3">
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
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                <Clock className="h-3 w-3" />
                                {fmtHours(activity.learning_hours)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                <Award className="h-3 w-3" />
                                {fmtPoints(activity.configured_cpd_points)} pts
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tab strip */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                {TABS.map((t) => {
                    const active = tab === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => handleTab(t.id)}
                            className={`shrink-0 h-10 px-3 rounded-xl text-[11px] font-bold
                                        active:scale-[0.97] transition-transform
                                        ${active
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"}`}
                            style={{ touchAction: "manipulation" }}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Active tab */}
            {tab === "basics" && <BasicsTab activity={activity} />}
            {tab === "modules" && (
                <ModulesTab
                    activityId={activity.id}
                    modules={modules}
                    contentByModule={contentByModule}
                />
            )}
            {tab === "assessments" && (
                <AssessmentsTab
                    activityId={activity.id}
                    assessments={assessments}
                />
            )}
            {tab === "publish" && <PublishTab activity={activity} />}
        </div>
    );
}