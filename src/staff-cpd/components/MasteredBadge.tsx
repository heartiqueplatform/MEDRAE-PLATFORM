// src/staff-cpd/components/MasteredBadge.tsx
import { Trophy } from "lucide-react";

export function MasteredBadge({ compact = false }: { compact?: boolean }) {
    if (compact) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold
                             bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-400">
                <Trophy className="h-2.5 w-2.5" /> Mastered
            </span>
        );
    }
    return (
        <div className="rounded-xl bg-violet-50 dark:bg-violet-400/10 p-3 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0">
                <Trophy className="h-4 w-4" strokeWidth={2.4} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-violet-700 dark:text-violet-400">
                    You've mastered this activity
                </p>
                <p className="text-[10px] text-violet-700/80 dark:text-violet-400/80 mt-0.5">
                    Great work — you can revisit anytime or help others by commenting.
                </p>
            </div>
        </div>
    );
}