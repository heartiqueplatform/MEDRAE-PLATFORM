"use client";

import React from 'react';
import { X, CheckCircle2, Circle, AlertCircle, Info } from "lucide-react";

type QuizProgressOverlayProps = {
    progressOpen: boolean;
    setProgressOpen: (v: boolean) => void;
    answers: Record<string, any>;
    questions: any[];
    circleRefs: React.MutableRefObject<any[]>;
    setCurrentQuestionIndex: (index: number) => void; // ✅ correct place
};

export function QuizProgressOverlay({
    progressOpen,
    setProgressOpen,
    answers,
    questions,
    circleRefs,
    setCurrentQuestionIndex, // ✅ MUST BE HERE
}: QuizProgressOverlayProps) {
    if (!progressOpen) return null;

    const answeredCount = Object.keys(answers).length;
    const progressPercentage = Math.round((answeredCount / questions.length) * 100);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop with heavy blur */}
            <div
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={() => setProgressOpen(false)}
            />

            {/* The Floating Card */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-950 rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-300 border border-gray-200 dark:border-gray-800">

                {/* Header Section */}
                <div className="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                Quiz Progress
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Review your answered and remaining questions
                            </p>
                        </div>
                        <button
                            onClick={() => setProgressOpen(false)}
                            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Progress Stats Row */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl border border-blue-100 dark:border-blue-800/30 text-center">
                            <span className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Progress</span>
                            <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{progressPercentage}%</span>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-2xl border border-green-100 dark:border-green-800/30 text-center">
                            <span className="block text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Answered</span>
                            <span className="text-xl font-bold text-green-700 dark:text-green-300">{answeredCount}</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                            <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Remaining</span>
                            <span className="text-xl font-bold text-gray-700 dark:text-gray-300">{questions.length - answeredCount}</span>
                        </div>
                    </div>
                </div>

                {/* Grid Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
                        {questions.map((q, index) => {
                            const userAnswer = answers[q.id];
                            const isAnswered = userAnswer !== undefined;
                            const isCorrect = isAnswered && userAnswer === q.correct_answer;

                            return (
                                <div
                                    key={q.id}
                                    ref={(el) => (circleRefs.current[index] = el)}
                                    onClick={() => {
                                        // VIBRATION (only on supported devices)
                                        if (navigator.vibrate) {
                                            navigator.vibrate(30); // light tap feedback
                                        }

                                        // 1. switch question immediately
                                        setCurrentQuestionIndex(index);

                                        // 2. scroll to selected item
                                        circleRefs.current[index]?.scrollIntoView({
                                            behavior: "smooth",
                                            block: "center",
                                            inline: "center",
                                        });

                                        // 3. close overlay slightly after (smooth feel)
                                        requestAnimationFrame(() => {
                                            setTimeout(() => {
                                                setProgressOpen(false);
                                            }, 120);
                                        });
                                    }}
                                    className={`
                                        relative aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all duration-200 cursor-default group
                                        ${!isAnswered
                                            ? "bg-gray-100 dark:bg-gray-800 text-gray-400 border-2 border-transparent"
                                            : isCorrect
                                                ? "bg-green-500 text-white shadow-lg shadow-green-200 dark:shadow-none scale-105"
                                                : "bg-red-500 text-white shadow-lg shadow-red-200 dark:shadow-none scale-105"
                                        }
                                    `}
                                >
                                    {index + 1}

                                    {/* Tooltip on hover */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                                        Question {index + 1}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Legend */}
                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex flex-wrap justify-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">Correct</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">Incorrect</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700" />
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">Unanswered</span>
                        </div>
                    </div>

                    <button
                        onClick={() => setProgressOpen(false)}
                        className="w-full mt-6 py-4 bg-white dark:bg-gray-900 text-black dark:text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all active:scale-[0.98] shadow-xl"
                    >
                        CONTINUE QUIZ
                    </button>
                </div>
            </div>
        </div>
    );
}