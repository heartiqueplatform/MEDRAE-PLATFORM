import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
    School, Brain, Radio, Trophy, FileText, Activity, LayoutGrid,
} from "lucide-react";
import { usePulseCount } from "@/lib/dailystatus/usePulseCount";

export type StudentFilter = {
    id: string;
    label: string;
    icon: React.ElementType;
    targetId: string;
    accent?: "blue" | "amber" | "emerald" | "violet" | "rose";
};

export const STUDENT_FILTERS: StudentFilter[] = [
    { id: "dailystatus", label: "Community Pulse", icon: Activity, targetId: "sec-dailystatus", accent: "rose" },
    { id: "dose", label: "Medrae Studify", icon: Radio, targetId: "sec-dailydose", accent: "rose" },
    { id: "wars", label: "School Board", icon: School, targetId: "sec-schoolwars", accent: "violet" },
    { id: "algo", label: "Algorithm", icon: Brain, targetId: "sec-algorithm", accent: "emerald" },
    { id: "papers", label: "Proctorium", icon: FileText, targetId: "sec-proctorium", accent: "blue" },
    { id: "countdown", label: "Countdown", icon: Activity, targetId: "sec-countdown", accent: "amber" },
    { id: "leader", label: "Leaderboard", icon: Trophy, targetId: "sec-leaderboard", accent: "amber" },
    { id: "feed", label: "Feed", icon: LayoutGrid, targetId: "sec-feed", accent: "violet" },
];

const ACCENT_MAP: Record<string, string> = {
    blue: "bg-blue-600 text-white shadow-blue-500/30",
    amber: "bg-amber-500 text-white shadow-amber-500/30",
    emerald: "bg-emerald-500 text-white shadow-emerald-500/30",
    violet: "bg-violet-500 text-white shadow-violet-500/30",
    rose: "bg-rose-500 text-white shadow-rose-500/30",
};

type Props = {
    activeId: string | null;
    onChange: (filter: StudentFilter) => void;
};

export default function StudentFilters({ activeId, onChange }: Props) {
    const railRef = useRef<HTMLDivElement>(null);
    const pulseCount = usePulseCount();

    // Auto-scroll the active pill into view (WhatsApp-style)
    useEffect(() => {
        if (!activeId || !railRef.current) return;
        const el = railRef.current.querySelector<HTMLElement>(
            `[data-filter-id="${activeId}"]`
        );
        if (el) {
            el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
    }, [activeId]);

    const handleClick = useCallback(
        (filter: StudentFilter) => {
            if (navigator.vibrate) navigator.vibrate(10);
            onChange(filter);
        },
        [onChange]
    );

    return (
        <div className="sticky top-0 z-20 px-2 sm:px-2 pt-1 pb-0 bg-transparent">
            <div
                ref={railRef}
                className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                {/* All — reset pill */}
                <button
                    data-filter-id="all"
                    onClick={() => onChange({ id: "all", label: "All", icon: LayoutGrid, targetId: "top" })}
                    className={cn(
                        "shrink-0 flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12px] font-bold",
                        "transition-all duration-200 active:scale-95 shadow-sm",
                        activeId === "all" || !activeId
                            ? "bg-indigo-600 text-white shadow-indigo-500/30 shadow-lg"
                            : "bg-slate-100 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200/70 " +
                            "dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
                    )}
                >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    All
                </button>

                {STUDENT_FILTERS.map((f) => {
                    const Icon = f.icon;
                    const isActive = activeId === f.id;
                    const showBadge = f.id === "dailystatus" && pulseCount > 0;

                    return (
                        <button
                            key={f.id}
                            data-filter-id={f.id}
                            onClick={() => handleClick(f)}
                            className={cn(
                                "shrink-0 flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12px] font-bold",
                                "transition-all duration-200 active:scale-95 shadow-sm",
                                isActive
                                    ? `${ACCENT_MAP[f.accent ?? "blue"]} shadow-lg`
                                    : "bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            )}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {f.label}

                            {showBadge && (
                                <span
                                    className={cn(
                                        "ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full",
                                        "text-[9px] font-black tabular-nums leading-none",
                                        isActive
                                            ? "bg-white text-rose-600"
                                            : "bg-rose-500 text-white"
                                    )}
                                >
                                    {pulseCount > 99 ? "99+" : pulseCount}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}