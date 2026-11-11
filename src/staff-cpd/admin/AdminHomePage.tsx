// src/staff-cpd/admin/AdminHomePage.tsx
import { Link, useNavigate } from "react-router-dom";
import {
    BookOpen, HelpCircle, Calendar, ClipboardList, ArrowRight, PenTool,
} from "lucide-react";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import { playSound } from "@/lib/soundManager";

const vibrate = (p: number | number[] = 15) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};
const tap = () => {
    try { playSound("ui-tap"); } catch { /* no-op */ }
    vibrate(12);
};

const TOOLS = [
    {
        to: "/cpd/admin/activities",
        icon: BookOpen,
        title: "Activities",
        description: "Create, edit, and publish CPD activities. Add modules, content items, assessments.",
        iconBg: "bg-blue-600",
    },
    {
        to: "/cpd/admin/questions",
        icon: HelpCircle,
        title: "Question Bank",
        description: "Reusable questions that can be attached to any CPD assessment.",
        iconBg: "bg-violet-600",
    },
    {
        to: "/cpd/admin/completions",
        icon: ClipboardList,
        title: "Completions",
        description: "Every verified CPD completion record. Filter, review, revoke if needed.",
        iconBg: "bg-emerald-600",
    },
    {
        to: "/cpd/admin/periods",
        icon: Calendar,
        title: "CPD Periods",
        description: "Define the professional development cycles (e.g. CPD 2026, CPD 2027).",
        iconBg: "bg-amber-600",
    },
];

export default function AdminHomePage() {
    const nav = useNavigate();
    const home = useHomeRoute();

    return (
        <div className="w-full max-w-[880px] mx-auto px-4 pt-4 pb-16 space-y-3">
            {/* Intro */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
                <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <PenTool className="h-4 w-4" strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">
                            Admin tools
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            Author and manage everything CPD
                        </p>
                    </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                    Every CPD activity, question, completion record, and period is managed from here.
                </p>

                {/* Optional home exit — useful if the user lands here via deep link */}
                <button
                    onClick={() => { tap(); nav(home); }}
                    className="w-full h-10 rounded-xl
                               bg-slate-100 dark:bg-white/[0.06]
                               text-slate-700 dark:text-slate-200
                               text-[12px] font-bold
                               flex items-center justify-center gap-1.5
                               active:scale-[0.97] transition-transform"
                    style={{ touchAction: "manipulation" }}
                >
                    <ArrowRight className="h-3 w-3 rotate-180" />
                    Back to dashboard
                </button>
            </section>

            {/* Tools grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TOOLS.map((tool) => {
                    const Icon = tool.icon;
                    return (
                        <Link
                            key={tool.to}
                            to={tool.to}
                            onClick={tap}
                            className="block rounded-2xl bg-white dark:bg-[#161b22] p-4
                                       active:scale-[0.99] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <div className="flex items-start gap-2.5">
                                <div className={`h-10 w-10 rounded-xl ${tool.iconBg} text-white
                                                 flex items-center justify-center shrink-0`}>
                                    <Icon className="h-4 w-4" strokeWidth={2.4} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">
                                        {tool.title}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                                        {tool.description}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-end mt-3">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold
                                                 text-blue-600 dark:text-blue-400
                                                 uppercase tracking-wider">
                                    Open
                                    <ArrowRight className="h-3 w-3" />
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}