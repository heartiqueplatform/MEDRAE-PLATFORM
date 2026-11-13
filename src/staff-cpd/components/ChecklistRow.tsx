// src/staff-cpd/components/ChecklistRow.tsx
import { CheckCircle2, Circle, Lock } from "lucide-react";

export function ChecklistRow({ done, label, sublabel, locked }: {
    done: boolean; label: string; sublabel?: string; locked?: boolean;
}) {
    return (
        <div className="flex items-start gap-2.5 py-2 px-1">
            {locked ? (
                <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                    <Lock className="h-3 w-3 text-slate-400" />
                </div>
            ) : done ? (
                <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.6} />
                </div>
            ) : (
                <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                    <Circle className="h-2.5 w-2.5 text-slate-400" strokeWidth={2.5} />
                </div>
            )}
            <div className="min-w-0 flex-1">
                <p className={`text-[12px] leading-snug ${done ? "line-through text-slate-400 dark:text-slate-500"
                    : locked ? "text-slate-400 dark:text-slate-500"
                        : "font-bold text-slate-900 dark:text-white"
                    }`}>{label}</p>
                {sublabel && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{sublabel}</p>
                )}
            </div>
        </div>
    );
}