// src/components/Algorithm/AlgorithmCard.tsx
"use client";

import { useState } from "react";
import { Brain, ChevronRight } from "lucide-react";
import { AlgorithmSheet } from "./AlgorithmSheet";
import Algorithm from "@/components/Algorithm/Algorithm";

export function AlgorithmCard() {
    const [open, setOpen] = useState(false);

    let score: number | null = null;
    let readiness = "Not available";
    try {
        const raw = localStorage.getItem("medrae_algo_book_cache");
        if (raw) {
            const parsed = JSON.parse(raw);
            score = Number(parsed?.overall_prediction?.predicted_score ?? null);
            readiness = parsed?.overall_prediction?.readiness ?? "Not available";
        }
    } catch { /* ignore */ }

    const tierColor =
        score == null ? "text-zinc-500 dark:text-zinc-400"
            : score >= 70 ? "text-emerald-600 dark:text-emerald-400"
                : score >= 50 ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400";

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                data-keywords="algorithm exam readiness prediction study plan"
                className="
                    w-full text-left rounded-2xl
                    bg-white dark:bg-[#161b22]
                    px-4 py-4
                    active:scale-[0.99] transition-transform
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
                "
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-400/[0.12] flex items-center justify-center shrink-0">
                        <Brain className="w-4.5 h-4.5 text-purple-600 dark:text-purple-300" />
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* Kicker — makes the card filterable & unmistakable */}
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-purple-600 dark:text-purple-400 leading-none">
                            Algorithm
                        </p>
                        <p className="text-[13px] font-semibold text-zinc-900 dark:text-white leading-tight mt-1">
                            My Exam Readiness
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5 truncate">
                            {score == null
                                ? "Open to see your prediction"
                                : `${readiness} · tap for full breakdown`}
                        </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                        {score != null && (
                            <span className={`text-[18px] font-bold tabular-nums ${tierColor}`}>
                                {score.toFixed(0)}%
                            </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    </div>
                </div>
            </button>

            <AlgorithmSheet open={open} onClose={() => setOpen(false)}>
                <Algorithm />
            </AlgorithmSheet>
        </>
    );
}