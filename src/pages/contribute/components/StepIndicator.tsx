// src/pages/contribute/components/StepIndicator.tsx

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { Step } from "../types";

interface Props {
    current: Step;
}

const STEPS: { id: Step; label: string; num: number }[] = [
    { id: "meta", label: "Quiz details", num: 1 },
    { id: "questions", label: "Questions", num: 2 },
    { id: "review", label: "Review", num: 3 },
];

export function StepIndicator({ current }: Props) {
    const currentIdx = STEPS.findIndex((s) => s.id === current);

    return (
        <div className="flex items-center gap-1.5 px-1">
            {STEPS.map((s, idx) => {
                const isDone = idx < currentIdx;
                const isActive = idx === currentIdx;
                return (
                    <div key={s.id} className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div
                            className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0
                                        text-[10px] font-bold transition-colors
                                        ${isDone
                                    ? "bg-emerald-600 text-white"
                                    : isActive
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-200 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400"
                                }`}
                        >
                            {isDone ? <Check className="w-3 h-3" /> : s.num}
                        </div>
                        <span
                            className={`text-[10.5px] font-bold truncate
                                        ${isActive
                                    ? "text-slate-900 dark:text-white"
                                    : "text-slate-500 dark:text-slate-400"
                                }`}
                        >
                            {s.label}
                        </span>
                        {idx < STEPS.length - 1 && (
                            <div className="flex-1 h-px bg-slate-200 dark:bg-white/[0.06] mx-1" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}