// src/staff-cpd/components/CpdCompletionRow.tsx
import { CheckCircle2, Calendar, Clock, Award } from "lucide-react";
import {
    type CpdCompletion,
    type CpdActivity,
    fmtDate,
    fmtHours,
    fmtPoints,
} from "../lib";

const STATUS_TONES: Record<string, string> = {
    verified: "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
    pending: "bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400",
    revoked: "bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-400",
};
const getStatusTone = (s?: string) =>
    STATUS_TONES[(s ?? "").toLowerCase()] ?? STATUS_TONES.pending;

export function CpdCompletionRow({
    completion,
}: {
    completion: CpdCompletion & { activity?: CpdActivity };
}) {
    return (
        <div className="flex items-center gap-2.5 py-2.5 border-b border-slate-100 dark:border-white/[0.04] last:border-0">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.6} />
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                    {completion.activity?.title ?? "CPD Activity"}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        <Calendar className="h-3 w-3" /> {fmtDate(completion.completed_at)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        <Clock className="h-3 w-3" /> {fmtHours(completion.learning_hours_completed)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        <Award className="h-3 w-3" /> {fmtPoints(completion.points_awarded)} pts
                    </span>
                </div>
            </div>

            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${getStatusTone(completion.completion_status)}`}>
                {completion.completion_status}
            </span>
        </div>
    );
}