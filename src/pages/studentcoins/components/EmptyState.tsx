// src/pages/studentcoins/components/EmptyState.tsx

import type { LucideIcon } from "lucide-react";

interface Props {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
}

export function EmptyState({ icon: Icon, title, subtitle }: Props) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-white/[0.06]
                      flex items-center justify-center mb-3 shrink-0">
                <Icon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 break-words">
                {title}
            </p>
            {subtitle && (
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 max-w-[280px]
                              leading-snug break-words">
                    {subtitle}
                </p>
            )}
        </div>
    );
}