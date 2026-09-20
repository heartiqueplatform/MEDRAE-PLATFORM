"use client";

import { X, CheckCircle2, AlertCircle, BookOpen, Lightbulb, PlayCircle, Image as ImageIcon } from "lucide-react";
import { Flashcard } from "@/components/Flashcard";
import { useEffect, useRef, useState, useMemo } from "react";

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
    const contentRef = useRef<HTMLDivElement>(null);   // mobile scroller + desktop outer
    const leftPanelRef = useRef<HTMLDivElement>(null); // desktop explanation scroller
    const CORRECT_VERDICTS = [
        "Correct Answer",
        "Answer Confirmed",
        "Well Done",
        "Accurate Response",
        "That's Right",
    ];

    const WRONG_VERDICTS = [
        "Incorrect Answer",
        "Review Answer",
        "Not Quite",
        "Answer Missed",
        "Needs Review",
    ];

    const verdict = useMemo(() => {
        const pool = isCorrect ? CORRECT_VERDICTS : WRONG_VERDICTS;
        const seed = (correctAnswer || "").length + (explanation || "").length;
        return pool[seed % pool.length];
    }, [isCorrect, correctAnswer, explanation]);

    useEffect(() => {
        if (open) {
            setHasScrolledToBottom(false);
            if (contentRef.current) contentRef.current.scrollTop = 0;
            if (leftPanelRef.current) leftPanelRef.current.scrollTop = 0;
        }
    }, [open, explanation, additional, imageUrl, videoUrl]);

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

    // Track scroll-to-bottom on whichever element is actually scrolling:
    // - Mobile: contentRef (the outer wrapper)
    // - Desktop: leftPanelRef (the explanation column)
    useEffect(() => {
        if (!open) return;

        const isDesktop = () =>
            typeof window !== "undefined" &&
            window.matchMedia("(min-width: 1024px)").matches;

        const getScroller = () =>
            isDesktop() ? leftPanelRef.current : contentRef.current;

        const handleScroll = () => {
            const el = getScroller();
            if (!el) return;
            const { scrollTop, scrollHeight, clientHeight } = el;
            const isScrollable = scrollHeight > clientHeight;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;

            if (isAtBottom && isScrollable && !hasScrolledToBottom) {
                setHasScrolledToBottom(true);
                if (navigator.vibrate) navigator.vibrate(10);
            }
        };

        // Attach to both — only the active one will actually scroll.
        const contentEl = contentRef.current;
        const leftEl = leftPanelRef.current;

        contentEl?.addEventListener("scroll", handleScroll, { passive: true });
        leftEl?.addEventListener("scroll", handleScroll, { passive: true });

        // On resize (e.g. crossing the lg breakpoint), re-check.
        window.addEventListener("resize", handleScroll);

        // If the content is shorter than the viewport on desktop, the user
        // has effectively "seen everything". Treat that as bottom-reached
        // only on mobile-style flow where scrolling is possible. On desktop
        // we still require an actual scroll, to preserve the "surprise".
        const initialCheck = () => {
            handleScroll();
        };
        const timeoutId = setTimeout(initialCheck, 120);

        return () => {
            contentEl?.removeEventListener("scroll", handleScroll);
            leftEl?.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleScroll);
            clearTimeout(timeoutId);
        };
    }, [open, hasScrolledToBottom, explanation, additional, imageUrl, videoUrl]);

    if (!open) return null;

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

    // The footer hint should reflect whether the *active* scroller can scroll.
    const isContentScrollable = () => {
        if (typeof window === "undefined") return false;
        const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
        const el = isDesktop ? leftPanelRef.current : contentRef.current;
        if (!el) return false;
        return el.scrollHeight > el.clientHeight;
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-white dark:bg-muted/100 flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-0 shrink-0 bg-white dark:bg-muted/80">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="font-semibold text-lg leading-tight text-gray-900 dark:text-white">
                                {verdict}
                            </h2>
                            {isCorrect ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                            )}
                        </div>

                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                            {isCorrect ? (
                                <>
                                    You selected{" "}
                                    <span className="font-semibold text-green-600 dark:text-green-400">
                                        {correctAnswer}
                                    </span>
                                </>
                            ) : (
                                <>
                                    Correct answer:{" "}
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {correctAnswer}
                                    </span>
                                </>
                            )}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* MAIN CONTENT */}
            <div
                ref={contentRef}
                className="flex-1 min-h-0 overflow-y-auto hide-scrollbar lg:overflow-hidden"
            >
                <div className="flex flex-col lg:grid lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_540px] lg:h-full lg:min-h-0">
                    {/* LEFT → Explanation (this is the desktop scroller) */}
                    <div
                        ref={leftPanelRef}
                        className="p-6 space-y-6 min-w-0 lg:overflow-y-auto hide-scrollbar
                bg-slate-50 dark:bg-slate-900
                lg:m-3 lg:rounded-2xl lg:border lg:border-slate-200 dark:lg:border-slate-800
                lg:shadow-sm">
                        {(imageUrl || videoUrl) && (
                            <div className="space-y-3">
                                {imageUrl && (
                                    <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 aspect-video group">
                                        <img src={imageUrl} alt="Explanation" className="object-cover w-full h-full" />
                                    </div>
                                )}

                                {videoUrl && (
                                    <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 aspect-video flex items-center justify-center">
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
                                    <h3 className="font-bold text-sm uppercase tracking-wider">
                                        Concept Breakdown
                                    </h3>
                                    <BookOpen className="w-5 h-5" />
                                </div>

                                {renderAsBulletPoints(explanation)}
                            </section>
                        )}

                        {additional && (
                            <section className="relative -mx-6 bg-purple-50/50 dark:bg-purple-900/10 py-5 space-y-3">
                                <div className="px-6 flex items-center gap-2 text-purple-600 dark:text-purple-400">
                                    <Lightbulb className="w-5 h-5" />
                                    <h3 className="font-bold text-sm uppercase tracking-wider">
                                        Expert Insights
                                    </h3>
                                </div>
                                <div className="px-6">
                                    {renderAdditionalAsBulletPoints(additional)}
                                </div>
                            </section>
                        )}

                        <div className="h-4" />
                    </div>

                    {/* RIGHT → Flashcard */}
                    <div className="w-full bg-white dark:bg-transparent border-0 lg:h-full lg:min-h-0 lg:overflow-hidden flex flex-col">
                        <div className="flex-1 lg:min-h-0 lg:overflow-y-auto hide-scrollbar overscroll-contain">
                            <Flashcard />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div
                className={`px-4 py-3 transition-all duration-500 ${hasScrolledToBottom
                    ? "bg-green-50 dark:bg-green-900/20"
                    : "bg-gray-50 dark:bg-gray-900/60"
                    }`}
            >
                <button
                    onClick={onClose}
                    className={`
            block mx-auto w-full max-w-xs sm:max-w-sm
            py-2.5 px-6 rounded-full font-semibold text-sm
            transition-all active:scale-[0.98]
            ${hasScrolledToBottom
                            ? "bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                            : "bg-white text-black hover:bg-gray-100 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
                        }
        `}
                >
                    {hasScrolledToBottom ? "Perfect! Got it." : "Got it, Thanks!"}
                </button>

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