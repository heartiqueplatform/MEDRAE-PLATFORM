// src/staff-cpd/components/CpdEmptyState.tsx
import React from "react";
import { BookOpen } from "lucide-react";

export function CpdEmptyState({ title, hint, icon: Icon = BookOpen }: {
    title: string; hint?: string; icon?: React.ComponentType<any>;
}) {
    return (
        <div className="text-center py-10 px-4 rounded-2xl bg-white dark:bg-[#161b22]">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-white/[0.06]
                            flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-slate-400 dark:text-slate-500" strokeWidth={2.4} />
            </div>
            <p className="text-[13px] font-bold text-slate-900 dark:text-white">{title}</p>
            {hint && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-snug">
                    {hint}
                </p>
            )}
        </div>
    );
}