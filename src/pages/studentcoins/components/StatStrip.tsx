// src/pages/studentcoins/components/StatStrip.tsx

import { TrendingUp, Calendar, Trophy } from "lucide-react";
import { formatNumber } from "../helpers";

interface Props {
    today: number;
    week: number;
    lifetime: number;
}

export function StatStrip({ today, week, lifetime }: Props) {
    const stats = [
        { label: "Today", value: today, icon: TrendingUp, tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10" },
        { label: "This week", value: week, icon: Calendar, tone: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10" },
        { label: "Lifetime", value: lifetime, icon: Trophy, tone: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10" },
    ];

    return (
        <div className="grid grid-cols-3 gap-2">
            {stats.map((s) => (
                <div
                    key={s.label}
                    className="rounded-2xl bg-white dark:bg-[#161b22] p-3 shadow-sm
                               min-w-0 overflow-hidden"
                >
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center mb-1.5 ${s.tone}`}>
                        <s.icon className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-base font-bold tabular-nums text-slate-900 dark:text-white
                                  leading-tight truncate">
                        {formatNumber(s.value)}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider
                                  text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {s.label}
                    </p>
                </div>
            ))}
        </div>
    );
}