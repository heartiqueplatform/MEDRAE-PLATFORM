"use client";

import React, { useCallback, useMemo } from 'react';
import { X } from "lucide-react";

type QuizProgressOverlayProps = {
    progressOpen: boolean;
    setProgressOpen: (v: boolean) => void;
    answers: Record<string, any>;
    questions: any[];
    circleRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    setCurrentQuestionIndex: (index: number) => void;
};

export function QuizProgressOverlay({
    progressOpen,
    setProgressOpen,
    answers,
    questions,
    circleRefs,
    setCurrentQuestionIndex,
}: QuizProgressOverlayProps) {

    // Memoize calculations to prevent re-renders
    const { answeredCount, progressPercentage } = useMemo(() => {
        const answered = Object.keys(answers).length;
        const percentage = Math.round((answered / questions.length) * 100);
        return { answeredCount: answered, progressPercentage: percentage };
    }, [answers, questions.length]);

    // Optimized click handler
    const handleQuestionClick = useCallback((index: number) => {
        // Light tap feedback with vibration check
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }

        // Switch question
        setCurrentQuestionIndex(index);

        // Smooth scroll with requestAnimationFrame for better performance
        requestAnimationFrame(() => {
            const element = circleRefs.current[index];
            if (element) {
                element.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                    inline: "center",
                });
            }

            // Close overlay
            setTimeout(() => {
                setProgressOpen(false);
            }, 120);
        });
    }, [setCurrentQuestionIndex, setProgressOpen, circleRefs]);

    if (!progressOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop with optimized blur */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
                onClick={() => setProgressOpen(false)}
            />

            {/* Floating Card - Optimized animations */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-muted/100 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border-0 will-change-transform">

                {/* Header Section - Fixed padding and spacing */}
                <div className="flex-none px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
                                Quiz Progress
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Review your answered and remaining questions
                            </p>
                        </div>
                        <button
                            onClick={() => setProgressOpen(false)}
                            className="flex-shrink-0 p-2 ml-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
                            aria-label="Close progress"
                        >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>

                    {/* Progress Stats Row - Better responsive grid */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <StatCard
                            label="Progress"
                            value={`${progressPercentage}%`}
                            color="blue"
                        />
                        <StatCard
                            label="Answered"
                            value={answeredCount.toString()}
                            color="green"
                        />
                        <StatCard
                            label="Remaining"
                            value={(questions.length - answeredCount).toString()}
                            color="gray"
                        />
                    </div>
                </div>

                {/* Grid Content - Optimized scrolling */}
                <div className="flex-1 overflow-y-auto px-6 py-4 hide-scrollbar">
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-3">
                        {questions.map((q, index) => {
                            const userAnswer = answers[q.id];
                            const isAnswered = userAnswer !== undefined;
                            const isCorrect = isAnswered && userAnswer === q.correct_answer;

                            let statusClass = "bg-gray-100 dark:bg-gray-800 text-gray-400";
                            let statusShadow = "";

                            if (isAnswered) {
                                if (isCorrect) {
                                    statusClass = "bg-green-500 text-white";
                                    statusShadow = "shadow-lg shadow-green-200 dark:shadow-none";
                                } else {
                                    statusClass = "bg-red-500 text-white";
                                    statusShadow = "shadow-lg shadow-red-200 dark:shadow-none";
                                }
                            }

                            return (
                                <button
                                    key={q.id}
                                    ref={(el) => {
                                        circleRefs.current[index] = el;
                                    }}
                                    onClick={() => handleQuestionClick(index)}
                                    className={`
                                        relative aspect-square flex items-center justify-center
                                        rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold
                                        transition-all duration-150 cursor-pointer
                                        hover:scale-105 active:scale-95
                                        ${statusClass} ${statusShadow}
                                    `}
                                    aria-label={`Question ${index + 1}`}
                                    title={`Question ${index + 1}`}
                                >
                                    <span className="relative z-10">{index + 1}</span>

                                    {/* Status indicator dot - prevents text bleed */}
                                    {isAnswered && (
                                        <span className={`
                                            absolute -top-1 -right-1 w-2 h-2 rounded-full
                                            ${isCorrect ? 'bg-green-300' : 'bg-red-300'}
                                        `} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer - Fixed layout */}
                <div className="flex-none px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-4">
                        <LegendItem color="bg-green-500" label="Correct" />
                        <LegendItem color="bg-red-500" label="Incorrect" />
                        <LegendItem color="bg-gray-200 dark:bg-gray-700" label="Unanswered" />
                    </div>

                    <button
                        onClick={() => setProgressOpen(false)}
                        className="w-full py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-500
                                 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl
                                 font-bold text-xs sm:text-sm transition-all
                                 active:scale-[0.98] shadow-lg"
                    >
                        CONTINUE QUIZ
                    </button>
                </div>
            </div>
        </div>
    );
}

// Extracted components for better performance
const StatCard = ({ label, value, color }: { label: string; value: string; color: 'blue' | 'green' | 'gray' }) => {
    const colorClasses = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30 text-blue-600 dark:text-blue-400',
        green: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/30 text-green-600 dark:text-green-400',
        gray: 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400'
    };

    const valueColorClasses = {
        blue: 'text-blue-700 dark:text-blue-300',
        green: 'text-green-700 dark:text-green-300',
        gray: 'text-gray-700 dark:text-gray-300'
    };

    return (
        <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-center ${colorClasses[color]}`}>
            <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                {label}
            </span>
            <span className={`block text-lg sm:text-xl font-bold ${valueColorClasses[color]}`}>
                {value}
            </span>
        </div>
    );
};

const LegendItem = ({ color, label }: { color: string; label: string }) => (
    <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${color}`} />
        <span className="text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {label}
        </span>
    </div>
);