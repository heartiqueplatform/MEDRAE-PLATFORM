// src/staff-cpd/components/CpdStatTile.tsx
import React from "react";

const SOFT_TONES: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400",
    green: "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
    amber: "bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400",
    violet: "bg-violet-50 dark:bg-violet-400/10 text-violet-700 dark:text-violet-400",
    rose: "bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-400",
    slate: "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300",
};
const ICON_BG: Record<string, string> = {
    blue: "bg-blue-600 text-white",
    green: "bg-emerald-600 text-white",
    amber: "bg-amber-600 text-white",
    violet: "bg-violet-600 text-white",
    rose: "bg-rose-600 text-white",
    slate: "bg-slate-600 text-white",
};

export function CpdStatTile({ label, value, hint, icon: Icon, tone = "blue" }: {
    label: string; value: string | number; hint?: string;
    icon: React.ComponentType<any>;
    tone?: "blue" | "green" | "amber" | "violet" | "rose" | "slate";
}) {
    const soft = SOFT_TONES[tone] ?? SOFT_TONES.blue;
    const iconBg = ICON_BG[tone] ?? ICON_BG.blue;

    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
            <div className="flex items-start gap-2.5">
                <div className={`h-9 w-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className="h-4 w-4" strokeWidth={2.4} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {label}
                    </p>
                    <p className="text-base font-bold text-slate-900 dark:text-white leading-tight mt-0.5 tabular-nums">
                        {value}
                    </p>
                    {hint && (
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${soft}`}>
                            {hint}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}