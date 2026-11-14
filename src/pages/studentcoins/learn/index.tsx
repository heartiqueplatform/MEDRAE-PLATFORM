// src/pages/studentcoins/learn/index.tsx

"use client";

import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { playSound } from "@/lib/soundManager";
import { LearnContent } from "./learnContent";

export default function WalletLearnPage() {
    const navigate = useNavigate();

    return (
        <div
            className="h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-[#0d1117] overflow-hidden"
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={() => { playSound("ui-tap"); navigate(-1); }}
                    aria-label="Back"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5
                               transition-colors"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
                        About Medrae Coins
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        How earning, approval, and redemption work
                    </p>
                </div>
            </header>

            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
                <div className="w-full max-w-2xl mx-auto px-3 pt-4 pb-24">
                    <LearnContent />
                </div>
            </main>
        </div>
    );
}