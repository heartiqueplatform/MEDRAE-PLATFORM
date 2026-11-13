// src/staff-cpd/admin/ActivityEditorPage.tsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import { BookOpen, Clock, Award } from "lucide-react";
import { useAdminActivity } from "../lib/admin-hooks";
import { fmtHours, fmtPoints } from "../lib";
import { tap, getStatusTone } from "./editor/editor-helpers";
import { BasicsTab } from "./editor/BasicsTab";
import { ModulesTab } from "./editor/ModulesTab";
import { AssessmentsTab } from "./editor/AssessmentsTab";
import { PublishTab } from "./editor/PublishTab";

const TABS = [
    { id: "basics", label: "Basics" },
    { id: "modules", label: "Modules" },
    { id: "assessments", label: "Assessments" },
    { id: "publish", label: "Publish" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function ActivityEditorPage() {
    const { id = "" } = useParams();
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

    return (
        <ActivityEditorBody
            activity={activity}
            modules={modules}
            contentByModule={contentByModule}
            assessments={assessments}
        />
    );
}

function ActivityEditorBody({ activity, modules, contentByModule, assessments }: any) {
    const [tab, setTab] = useState<TabId>("basics");

    return (
        <div className="px-4 pt-3 pb-16 space-y-3 max-w-[880px] mx-auto">
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
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${getStatusTone(activity.status)}`}>
                                {activity.status}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                <Clock className="h-3 w-3" />{fmtHours(activity.learning_hours)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                <Award className="h-3 w-3" />{fmtPoints(activity.configured_cpd_points)} pts
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                {TABS.map((t) => {
                    const active = tab === t.id;
                    return (
                        <button key={t.id} onClick={() => { tap(); setTab(t.id); }}
                            className={`shrink-0 h-9 px-3 rounded-xl text-[11px] font-bold active:scale-[0.97] transition-transform
                                ${active
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"}`}
                            style={{ touchAction: "manipulation" }}>
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {tab === "basics" && <BasicsTab activity={activity} />}
            {tab === "modules" && <ModulesTab activityId={activity.id} modules={modules} contentByModule={contentByModule} />}
            {tab === "assessments" && <AssessmentsTab activityId={activity.id} assessments={assessments} />}
            {tab === "publish" && <PublishTab activity={activity} />}
        </div>
    );
}