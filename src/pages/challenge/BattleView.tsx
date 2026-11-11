// src/pages/challenge/BattleView.tsx

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Send, Check, Zap, Trophy, Clock } from "lucide-react";
import { playSound } from "@/lib/soundManager";

interface BattleViewProps {
    activeChallenge: any;
    currentQIndex: number;
    setCurrentQIndex: (fn: (i: number) => number) => void;
    answers: string[];
    timeLeft: number;
    handleAnswer: (idx: number, opt: string) => void;
    onShowSubmit: () => void;
}

export function BattleView({
    activeChallenge, currentQIndex, setCurrentQIndex,
    answers, timeLeft, handleAnswer, onShowSubmit,
}: BattleViewProps) {
    const total = activeChallenge.questions.length;
    const progress = (currentQIndex + 1) / total;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex flex-col
                       bg-slate-50 dark:bg-[#0d1117] overflow-hidden"
        >
            {/* HEADER */}
            <header className="shrink-0 bg-white dark:bg-[#161b22]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="h-9 w-9 rounded-full overflow-hidden shrink-0 bg-white">
                                <img src="/pwa-512x512.png" alt="Medrae" className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-slate-500 dark:text-slate-400 leading-none">
                                    Medrae Challenge
                                </p>
                                <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight truncate mt-0.5">
                                    {activeChallenge?.status === "self" ? "Setting benchmark" : "Peer challenge"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="relative">
                                <svg className="w-10 h-10 -rotate-90">
                                    <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2.5" fill="none" className="text-slate-200 dark:text-white/[0.06]" />
                                    <circle
                                        cx="20" cy="20" r="16"
                                        stroke="currentColor" strokeWidth="2.5" fill="none"
                                        strokeDasharray={`${2 * Math.PI * 16}`}
                                        strokeDashoffset={`${2 * Math.PI * 16 * (1 - timeLeft / 300)}`}
                                        className={`transition-all duration-1000 ${timeLeft < 30 ? "text-rose-500" : "text-blue-500"}`}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className={`text-[10px] font-bold tabular-nums ${timeLeft < 30 ? "text-rose-500 animate-pulse" : "text-slate-700 dark:text-slate-300"}`}>
                                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Question</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                                    {currentQIndex + 1} <span className="text-[11px] text-slate-400 dark:text-slate-500">/ {total}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 h-1 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-blue-600 rounded-full"
                            initial={{ width: "0%" }}
                            animate={{ width: `${progress * 100}%` }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                    </div>
                </div>
            </header>

            {/* BODY */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
                <div className="w-full max-w-2xl mx-auto px-4 py-5 space-y-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                         text-[10px] font-bold uppercase tracking-wider
                                         bg-blue-50 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400">
                            <Zap size={11} className="fill-current" />
                            Clinical
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                         text-[10px] font-bold uppercase tracking-wider
                                         bg-amber-50 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400">
                            <Trophy size={11} />
                            {activeChallenge?.status === "self" ? "Target" : "vs Peer"}
                        </span>
                    </div>

                    <motion.div
                        key={currentQIndex}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-3"
                    >
                        <h2 className="text-base md:text-lg font-bold leading-snug text-slate-900 dark:text-white">
                            {activeChallenge.questions[currentQIndex].question_text}
                        </h2>

                        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-400/[0.08]">
                            <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 leading-relaxed">
                                {currentQIndex === 0 && "Let's begin! Read carefully and choose the best answer."}
                                {currentQIndex === Math.floor(total / 2) && "You're doing great! Keep the momentum going!"}
                                {currentQIndex === total - 2 && "Almost there! One final push!"}
                                {currentQIndex > 0 && currentQIndex < Math.floor(total / 2) && "Stay focused, you've got this!"}
                                {currentQIndex > Math.floor(total / 2) && currentQIndex < total - 2 && "Excellent progress! Keep going!"}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-2 mt-3">
                            {["A", "B", "C", "D"].map((opt, optIndex) => {
                                const optionText = activeChallenge.questions[currentQIndex][`option_${opt.toLowerCase()}`];
                                const isSelected = answers[currentQIndex] === opt;
                                return (
                                    <motion.button
                                        key={opt}
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: optIndex * 0.04 }}
                                        onClick={() => {
                                            if (navigator.vibrate) navigator.vibrate(30);
                                            handleAnswer(currentQIndex, opt);
                                            playSound("ui-tap");
                                        }}
                                        className={`relative p-3 rounded-xl text-left transition-colors flex items-start gap-3
                                                    active:scale-[0.99]
                                                    ${isSelected
                                                ? "bg-blue-600 text-white"
                                                : "bg-white dark:bg-[#161b22] text-slate-700 dark:text-slate-300"}`}
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <div className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold
                                                        ${isSelected
                                                ? "bg-white/20 text-white"
                                                : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"}`}>
                                            {opt}
                                        </div>
                                        <span className={`text-[13px] leading-relaxed flex-1 ${isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"}`}>
                                            {optionText}
                                        </span>
                                        {isSelected && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                            >
                                                <Check size={16} className="text-white" />
                                            </motion.div>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>

                        <div className="mt-3 p-3 rounded-xl bg-slate-100 dark:bg-white/[0.04]">
                            <div className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center gap-1 font-bold text-slate-600 dark:text-slate-400">
                                        <Check size={11} className="text-emerald-500" />
                                        {answers.filter((a) => a).length} answered
                                    </span>
                                    <span className="inline-flex items-center gap-1 font-bold text-slate-600 dark:text-slate-400">
                                        <Clock size={11} className="text-amber-500" />
                                        {total - answers.filter((a) => a).length} left
                                    </span>
                                </div>
                                <span className="font-bold tabular-nums text-slate-400 dark:text-slate-500">
                                    Q{currentQIndex + 1}/{total}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* FOOTER */}
            <footer className="shrink-0 px-4 py-3
                               bg-white dark:bg-[#0d1117]
                               border-t border-slate-200/70 dark:border-white/[0.06]
                               safe-bottom">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(20);
                                setCurrentQIndex((i) => Math.max(i - 1, 0));
                                playSound("ui-tap");
                            }}
                            disabled={currentQIndex === 0}
                            className="flex-1 h-10 rounded-xl
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-700 dark:text-slate-200
                                       text-sm font-bold
                                       flex items-center justify-center gap-1.5
                                       active:scale-[0.97] transition-transform
                                       disabled:opacity-40 disabled:active:scale-100"
                            style={{ touchAction: "manipulation" }}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </button>
                        {currentQIndex < total - 1 ? (
                            <button
                                onClick={() => {
                                    if (navigator.vibrate) navigator.vibrate(20);
                                    setCurrentQIndex((i) => Math.min(i + 1, total - 1));
                                    playSound("ui-tap");
                                }}
                                className="flex-1 h-10 rounded-xl bg-blue-600 text-white
                                           text-sm font-bold
                                           flex items-center justify-center gap-1.5
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    if (navigator.vibrate) navigator.vibrate(50);
                                    playSound("ui-tap");
                                    onShowSubmit();
                                }}
                                className="flex-1 h-10 rounded-xl bg-emerald-600 text-white
                                           text-sm font-bold
                                           flex items-center justify-center gap-1.5
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                <Send className="h-4 w-4" />
                                Submit
                            </button>
                        )}
                    </div>
                    <p className="text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1.5">
                        Tap option to select
                    </p>
                </div>
            </footer>
        </motion.div>
    );
}