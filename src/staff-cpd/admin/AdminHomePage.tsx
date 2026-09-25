// src/staff-cpd/admin/AdminHomePage.tsx
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
    BookOpen,
    HelpCircle,
    Calendar,
    ClipboardList,
    ArrowRight,
    PenTool,
} from "lucide-react";

const TOOLS = [
    {
        to: "/cpd/admin/activities",
        icon: BookOpen,
        title: "Activities",
        description:
            "Create, edit, and publish CPD activities. Add modules, content items, assessments.",
        tone: "from-blue-500 to-indigo-600",
        soft: "bg-blue-50 dark:bg-blue-900/20",
        ring: "ring-blue-500",
    },
    {
        to: "/cpd/admin/questions",
        icon: HelpCircle,
        title: "Question Bank",
        description:
            "Reusable questions that can be attached to any CPD assessment.",
        tone: "from-violet-500 to-purple-600",
        soft: "bg-violet-50 dark:bg-violet-900/20",
        ring: "ring-violet-500",
    },
    {
        to: "/cpd/admin/completions",
        icon: ClipboardList,
        title: "Completions",
        description:
            "Every verified CPD completion record. Filter, review, revoke if needed.",
        tone: "from-emerald-500 to-teal-600",
        soft: "bg-emerald-50 dark:bg-emerald-900/20",
        ring: "ring-emerald-500",
    },
    {
        to: "/cpd/admin/periods",
        icon: Calendar,
        title: "CPD Periods",
        description:
            "Define the professional development cycles (e.g. CPD 2026, CPD 2027).",
        tone: "from-amber-500 to-orange-600",
        soft: "bg-amber-50 dark:bg-amber-900/20",
        ring: "ring-amber-500",
    },
];

export default function AdminHomePage() {
    return (
        <div className="min-h-screen w-full flex flex-col items-center">
            <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-4 md:space-y-6 px-0 sm:px-6 pt-4 sm:pt-8 pb-8">
                {/* HERO HEADER CARD */}
                <Card className="relative overflow-hidden md:shadow-xl md:shadow-blue-500/5 transition-all rounded-none md:rounded-xl border-0 bg-transparent dark:bg-transparent border-b border-gray-100 dark:border-gray-800 md:border-b-0">
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative px-4 md:px-6 pt-4 md:pt-6 pb-4 md:pb-6">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                                <PenTool className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={2.4} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                                    CPD <span className="text-blue-600">Admin</span>
                                </h1>
                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    Author and manage all CPD content, questions, and records.
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* TOOLS GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[8px] sm:gap-4 px-[4px] md:px-0">
                    {TOOLS.map((tool) => {
                        const Icon = tool.icon;
                        return (
                            <Link key={tool.to} to={tool.to} className="group">
                                <Card className="group relative overflow-hidden transition-all duration-300 rounded-xl border-0 bg-white dark:bg-muted/70 shadow-sm hover:shadow-xl cursor-pointer p-0 h-full">
                                    {/* Accent bar */}
                                    <div className={`h-1 w-full bg-gradient-to-r ${tool.tone}`} />

                                    <CardContent className="p-4 md:p-5 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div
                                                className={`h-11 w-11 rounded-xl bg-gradient-to-br ${tool.tone} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform flex-shrink-0`}
                                            >
                                                <Icon className="h-5 w-5 text-white" strokeWidth={2.4} />
                                            </div>

                                            <span
                                                className={`text-[10px] font-bold px-2 py-1 rounded-lg ${tool.soft} text-gray-700 dark:text-gray-200`}
                                            >
                                                Manage
                                            </span>
                                        </div>

                                        <div>
                                            <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
                                                {tool.title}
                                            </h3>
                                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2">
                                                {tool.description}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-end pt-1">
                                            <span className="inline-flex items-center gap-1 text-[11px] md:text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:gap-2 transition-all">
                                                Open
                                                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}