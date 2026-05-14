"use client";

import { X, CheckCircle2, AlertCircle, BookOpen, Lightbulb, PlayCircle, Image as ImageIcon } from "lucide-react";
import { Flashcard } from "@/components/Flashcard";
type ExplanationOverlayProps = {
    open: boolean;
    onClose: () => void;
    isCorrect: boolean;
    correctAnswer: string;
    explanation?: string;
    additional?: string;
    // Future-proofing: add these when you're ready
    imageUrl?: string;
    videoUrl?: string;
};

export function ExplanationOverlay({
    open,
    onClose,
    isCorrect,
    correctAnswer,
    explanation,
    additional,
    imageUrl,
    videoUrl,
}: ExplanationOverlayProps) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-950/40 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full sm:max-w-6xl bg-white dark:bg-gray-950 rounded-xl sm:rounded-xl shadow-2xl max-h-[98dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">

                {/* Mobile Drag Handle (Visual Only) */}
                <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-0">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isCorrect ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                            {isCorrect ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-none text-gray-900 dark:text-white">
                                {isCorrect ? "Brilliant! Correct." : "Not quite right"}
                            </h2>
                            {!isCorrect && (
                                <p className="text-sm font-medium text-red-500 mt-1">
                                    Correct: <span className="underline decoration-2 underline-offset-2">{correctAnswer}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* MAIN BODY LAYOUT */}
                <div className="flex-1 overflow-hidden">
                    <div className="flex flex-col lg:flex-row h-full min-h-0">

                        {/* LEFT SIDE → Explanation Content */}
                        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                            {/* FUTURE MEDIA SECTION */}
                            {(imageUrl || videoUrl) && (
                                <div className="space-y-3">
                                    {imageUrl && (
                                        <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 aspect-video group">
                                            <img src={imageUrl} alt="Explanation" className="object-cover w-full h-full" />
                                        </div>
                                    )}

                                    {videoUrl && (
                                        <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 aspect-video flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-2 text-gray-400">
                                                <PlayCircle className="w-10 h-10" />
                                                <span className="text-xs font-medium uppercase tracking-widest">
                                                    Video Tutorial
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {explanation && (
                                <section className="space-y-3">
                                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                        <BookOpen className="w-5 h-5" />
                                        <h3 className="font-bold text-sm uppercase tracking-wider">
                                            Concept Breakdown
                                        </h3>
                                    </div>

                                    <div className="text-[15px] leading-[1.6] text-gray-700 dark:text-gray-300 font-medium">
                                        {explanation}
                                    </div>
                                </section>
                            )}

                            {additional && (
                                <section className="bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl p-5 border border-purple-100/50 dark:border-purple-800/30 space-y-3">
                                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                                        <Lightbulb className="w-5 h-5" />
                                        <h3 className="font-bold text-sm uppercase tracking-wider">
                                            Expert Insights
                                        </h3>
                                    </div>

                                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-400 italic">
                                        {additional}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* RIGHT SIDE → FLASHCARD (Desktop Only Side Panel) */}
                        <div className="lg:w-[480px] xl:w-[540px] border-0 bg-gray-50/50 dark:bg-gray-900/30 p-4 mt-0">
                            <div className="w-full">
                                <Flashcard />
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="
            w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98]
            bg-white text-black hover:bg-gray-100
            dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800
        "
                    >
                        Got it, thanks!
                    </button>
                </div>
            </div>
        </div>
    );
}