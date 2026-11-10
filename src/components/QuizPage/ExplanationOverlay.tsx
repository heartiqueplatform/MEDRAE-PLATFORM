"use client";

import { X, CheckCircle2, AlertCircle, BookOpen, Lightbulb, PlayCircle } from "lucide-react";
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
    const contentRef = useRef<HTMLDivElement>(null);
    const leftPanelRef = useRef<HTMLDivElement>(null);

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
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [open]);

    /* Track scroll-to-bottom on whichever element is actually scrolling:
       - Mobile: contentRef (outer wrapper)
       - Desktop: leftPanelRef (explanation column) */
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

        const contentEl = contentRef.current;
        const leftEl = leftPanelRef.current;

        contentEl?.addEventListener("scroll", handleScroll, { passive: true });
        leftEl?.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("resize", handleScroll);

        const initialCheck = () => handleScroll();
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
            .map((s) => s.trim())
            .filter(Boolean);

        if (sentences.length <= 2) {
            return (
                <p className="text-[15px] leading-[1.6] text-slate-700 dark:text-slate-300 font-medium">
                    {text}
                </p>
            );
        }

        return (
            <div className="space-y-2">
                {sentences.map((sentence, idx) => (
                    <div
                        key={idx}
                        className="text-[15px] leading-[1.6] text-slate-700 dark:text-slate-300 font-medium"
                    >
                        {sentence}
                    </div>
                ))}
            </div>
        );
    };

    const renderAdditionalAsBulletPoints = (text: string) => {
        let sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        sentences = sentences.map((s) => s.trim()).filter((s) => s.length > 0);

        if (sentences.length <= 2) {
            return (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-400 italic">
                    {text}
                </p>
            );
        }

        return (
            <ul className="space-y-2 list-disc pl-5">
                {sentences.map((sentence, idx) => (
                    <li
                        key={idx}
                        className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-400 italic"
                    >
                        {sentence}
                    </li>
                ))}
            </ul>
        );
    };

    /* The footer hint should reflect whether the active scroller can scroll. */
    const isContentScrollable = () => {
        if (typeof window === "undefined") return false;
        const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
        const el = isDesktop ? leftPanelRef.current : contentRef.current;
        if (!el) return false;
        return el.scrollHeight > el.clientHeight;
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex flex-col
                       bg-white dark:bg-[#0d1117]"
        >
            {/* Header */}
            <div
                className="px-5 sm:px-6 py-4 flex items-center justify-between shrink-0
                           bg-white dark:bg-[#0d1117]
                           border-b border-slate-200/70 dark:border-white/[0.06]"
            >
                <div className="flex items-start gap-3 min-w-0">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-lg leading-tight text-slate-900 dark:text-white">
                                {verdict}
                            </h2>
                            {isCorrect ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                            )}
                        </div>

                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                            {isCorrect ? (
                                <>
                                    You selected{" "}
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        {correctAnswer}
                                    </span>
                                </>
                            ) : (
                                <>
                                    Correct answer:{" "}
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {correctAnswer}
                                    </span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="h-9 w-9 rounded-full flex items-center justify-center shrink-0
                               text-slate-400
                               active:bg-slate-100 dark:active:bg-white/5
                               transition-colors"
                    style={{ touchAction: "manipulation" }}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Main content */}
            <div
                ref={contentRef}
                className="flex-1 min-h-0 overflow-y-auto hide-scrollbar lg:overflow-hidden"
            >
                <div className="flex flex-col lg:grid lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_540px] lg:h-full lg:min-h-0">
                    {/* Left → Explanation (desktop scroller) */}
                    <div
                        ref={leftPanelRef}
                        className="p-5 sm:p-6 space-y-6 min-w-0 lg:overflow-y-auto hide-scrollbar
                                   bg-slate-50 dark:bg-[#161b22]
                                   lg:m-3 lg:rounded-2xl
                                   lg:border lg:border-slate-200/60 dark:lg:border-white/[0.06]"
                    >
                        {(imageUrl || videoUrl) && (
                            <div className="space-y-3">
                                {imageUrl && (
                                    <div className="relative rounded-xl overflow-hidden aspect-video
                                                    bg-slate-100 dark:bg-[#0d1117]">
                                        <img
                                            src={imageUrl}
                                            alt="Explanation"
                                            className="object-cover w-full h-full"
                                        />
                                    </div>
                                )}

                                {videoUrl && (
                                    <div className="relative rounded-xl overflow-hidden aspect-video
                                                    bg-slate-100 dark:bg-[#0d1117]
                                                    flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <PlayCircle className="w-10 h-10" />
                                            <span className="text-xs font-bold uppercase tracking-wider">
                                                Video tutorial
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {explanation && (
                            <section className="space-y-3">
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                    <BookOpen className="w-4 h-4" />
                                    <h3 className="font-bold text-[11px] uppercase tracking-wider">
                                        Concept breakdown
                                    </h3>
                                </div>
                                {renderAsBulletPoints(explanation)}
                            </section>
                        )}

                        {additional && (
                            <section className="relative -mx-5 sm:-mx-6 py-4 space-y-3
                                                bg-purple-50/60 dark:bg-purple-400/[0.08]">
                                <div className="px-5 sm:px-6 flex items-center gap-2
                                                text-purple-700 dark:text-purple-300">
                                    <Lightbulb className="w-4 h-4" />
                                    <h3 className="font-bold text-[11px] uppercase tracking-wider">
                                        Expert insights
                                    </h3>
                                </div>
                                <div className="px-5 sm:px-6">
                                    {renderAdditionalAsBulletPoints(additional)}
                                </div>
                            </section>
                        )}

                        <div className="h-4" />
                    </div>

                    {/* Right → Flashcard */}
                    <div
                        className="w-full lg:mt-3 flex flex-col
                                   bg-white dark:bg-[#0d1117]
                                   lg:h-full lg:min-h-0 lg:overflow-hidden"
                    >
                        <div className="flex-1 lg:min-h-0 lg:overflow-y-auto hide-scrollbar overscroll-contain">
                            <Flashcard />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div
                className={`px-4 py-3 transition-colors duration-300
                            border-t border-slate-200/70 dark:border-white/[0.06]
                            ${hasScrolledToBottom
                        ? "bg-emerald-50 dark:bg-emerald-400/[0.08]"
                        : "bg-white dark:bg-[#0d1117]"
                    }`}
            >
                <button
                    onClick={onClose}
                    className={`block mx-auto w-full max-w-xs sm:max-w-sm
                                py-2.5 px-6 rounded-full font-bold text-sm
                                transition-transform active:scale-[0.98]
                                ${hasScrolledToBottom
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200"
                        }`}
                    style={{ touchAction: "manipulation" }}
                >
                    {hasScrolledToBottom ? "Perfect! Got it." : "Got it, Thanks!"}
                </button>

                {!hasScrolledToBottom && isContentScrollable() && (
                    <p className="text-[11px] text-center mt-2
                                  text-slate-400 dark:text-slate-500
                                  animate-pulse">
                        ↓ Keep scrolling for a surprise ↓
                    </p>
                )}
                {hasScrolledToBottom && (
                    <p className="text-[11px] text-center mt-2
                                  text-emerald-600 dark:text-emerald-400">
                        You reached the end. Amazing.
                    </p>
                )}
            </div>
        </div>
    );
}