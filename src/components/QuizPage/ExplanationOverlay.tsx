"use client";

import { X, CheckCircle2, AlertCircle, BookOpen, Lightbulb, PlayCircle, Image as ImageIcon } from "lucide-react";
import { Flashcard } from "@/components/Flashcard";
import { useEffect, useRef, useState } from "react";

type ExplanationOverlayProps = {
    open: boolean;
    onClose: () => void;
    isCorrect: boolean;
    correctAnswer: string;
    explanation?: string;
    additional?: string;
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
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Reset scroll state when overlay opens with new content
    useEffect(() => {
        if (open) {
            setHasScrolledToBottom(false);
            // Scroll to top when opening
            if (contentRef.current) {
                contentRef.current.scrollTop = 0;
            }
        }
    }, [open, explanation, additional, imageUrl, videoUrl]); // Reset when content changes

    // Prevent body scroll when overlay is open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [open]);

    // Track scroll to bottom for dopamine hit
    useEffect(() => {
        const element = contentRef.current;
        if (!element || !open) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = element;
            // Check if content is actually scrollable
            const isScrollable = scrollHeight > clientHeight;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;

            // Only trigger if content is scrollable and we're at the bottom
            if (isAtBottom && isScrollable && !hasScrolledToBottom) {
                setHasScrolledToBottom(true);
                // Small haptic feedback simulation
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
            }
        };

        element.addEventListener('scroll', handleScroll);

        // Check initial state (in case content is shorter than viewport)
        // But only if content is actually scrollable
        const initialCheck = () => {
            const { scrollHeight, clientHeight } = element;
            const isScrollable = scrollHeight > clientHeight;
            // If content is NOT scrollable, we shouldn't trigger the bottom state
            // because the user hasn't actually scrolled
        };

        // Small delay to ensure content is rendered
        const timeoutId = setTimeout(initialCheck, 100);

        return () => {
            element.removeEventListener('scroll', handleScroll);
            clearTimeout(timeoutId);
        };
    }, [open, hasScrolledToBottom, explanation, additional, imageUrl, videoUrl]); // Re-run when content changes

    if (!open) return null;

    // Helper function to convert text to bullet points WITHOUT losing content
    const renderAsBulletPoints = (text: string) => {
        const sentences = text
            .split(/(?<=[.!?])\s+/)
            .map(s => s.trim())
            .filter(Boolean);
        if (sentences.length <= 2) {
            return <p className="text-[15px] leading-[1.6] text-gray-700 dark:text-gray-300 font-medium">{text}</p>;
        }

        return (
            <div className="space-y-2">
                {sentences.map((sentence, idx) => (
                    <div
                        key={idx}
                        className="text-[15px] leading-[1.6] text-gray-700 dark:text-gray-300 font-medium"
                    >
                        {sentence}
                    </div>
                ))}
            </div>
        );
    };

    const renderAdditionalAsBulletPoints = (text: string) => {
        let sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        sentences = sentences.map(s => s.trim()).filter(s => s.length > 0);

        if (sentences.length <= 2) {
            return <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-400 italic">{text}</p>;
        }

        return (
            <ul className="space-y-2 list-disc pl-5">
                {sentences.map((sentence, idx) => (
                    <li key={idx} className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-400 italic">
                        {sentence}
                    </li>
                ))}
            </ul>
        );
    };

    // Check if content is scrollable (for the footer hint)
    const isContentScrollable = () => {
        const element = contentRef.current;
        if (!element) return false;
        return element.scrollHeight > element.clientHeight;
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-white dark:bg-muted/100 flex flex-col">
            {/* Header - Kept original colors */}
            <div className="px-6 py-4 flex items-center justify-between border-0 shrink-0 bg-white dark:bg-muted/80">
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

            {/* MAIN CONTENT - Infinite scroll with dopamine trigger */}
            <div
                ref={contentRef}
                className="flex-1 overflow-y-auto hide-scrollbar"
            >
                <div className="flex flex-col lg:flex-row h-full">
                    {/* LEFT SIDE → Explanation Content */}
                    <div className="flex-1 p-6 space-y-6">
                        {/* MEDIA SECTION */}
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

                                {renderAsBulletPoints(explanation)}
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

                                {renderAdditionalAsBulletPoints(additional)}
                            </section>
                        )}

                        {/* Spacer for scroll momentum */}
                        <div className="h-4" />
                    </div>

                    {/* RIGHT SIDE → FLASHCARD */}
                    <div className="w-full lg:w-[480px] xl:w-[540px] border-0 bg-gray-50/50 dark:bg-gray-900/30 p-4 shrink-0">
                        <div className="w-full h-full overflow-y-auto hide-scrollbar">
                            <Flashcard />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer - With original colors and animation when scrolled to bottom */}
            <div className={`p-4 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-100 dark:border-gray-800 transition-all duration-500 ${hasScrolledToBottom ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''
                }`}>
                <button
                    onClick={onClose}
                    className={`
                        w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98]
                        ${hasScrolledToBottom
                            ? 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600'
                            : 'bg-white text-black hover:bg-gray-100 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800'
                        }
                    `}
                >
                    {hasScrolledToBottom ? " Perfect! Got it! Thanks Medrae Nursing!" : "Got it, Thanks Medrae Nursing!"}
                </button>
                {/* Only show scroll hint if content is actually scrollable and not at bottom */}
                {!hasScrolledToBottom && isContentScrollable() && (
                    <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2 animate-pulse">
                        ↓ Keep scrolling for a surprise ↓
                    </p>
                )}
                {hasScrolledToBottom && (
                    <p className="text-xs text-center text-green-600 dark:text-green-400 mt-2 animate-bounce">
                        You reached the end! Amazing!
                    </p>
                )}
            </div>
        </div>
    );
}