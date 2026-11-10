"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { MedraeFace, type MedraeFaceName } from "@/components/MedraeFace";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = () => {
    playSound("ui-tap");
    vibrate(15);
};

/* ------------------------------------------------------------------ */
/*  Meta                                                              */
/* ------------------------------------------------------------------ */

const REASON_META: Record<string, { face: MedraeFaceName; hint: string }> = {
    "Misread question": { face: "eye", hint: "Reading pace noted." },
    "Concept gap": { face: "book", hint: "Content gap — revisit theory." },
    "Rushed": { face: "clock", hint: "Slow is smooth. Smooth is fast." },
    "Guess": { face: "target", hint: "Eliminate first next time." },
};

type Props = {
    open: boolean;
    onClose: () => void;
    questionText?: string;
    reasonOptions: string[];
    onReasonSelect: (reason: string) => void;
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function ReflectionSheet({
    open,
    onClose,
    questionText,
    reasonOptions,
    onReasonSelect,
}: Props) {
    const isDesktop = useMediaQuery("(min-width: 640px)");

    const handleSelect = (reason: string) => {
        tap();
        onReasonSelect(reason);
        onClose();
    };

    const handleSkip = () => {
        tap();
        onClose();
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop — no blur, matches your other modals */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[9998] bg-black/50"
                        style={{ touchAction: "manipulation" }}
                    />

                    {/* Wrapper */}
                    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center pointer-events-none sm:p-6">
                        <motion.div
                            initial={
                                isDesktop
                                    ? { opacity: 0, scale: 0.96 }
                                    : { y: "100%" }
                            }
                            animate={
                                isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }
                            }
                            exit={
                                isDesktop
                                    ? { opacity: 0, scale: 0.96 }
                                    : { y: "100%" }
                            }
                            transition={
                                isDesktop
                                    ? { duration: 0.2, ease: "easeOut" }
                                    : { type: "spring", damping: 30, stiffness: 320 }
                            }
                            drag={isDesktop ? false : "y"}
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={0.15}
                            onDragEnd={(_, info) => {
                                if (!isDesktop && info.offset.y > 120) onClose();
                            }}
                            className="pointer-events-auto
                                       w-full sm:w-[440px] sm:max-w-[92vw]
                                       bg-white dark:bg-[#161b22]
                                       rounded-t-2xl sm:rounded-2xl
                                       flex flex-col
                                       max-h-[85dvh] sm:max-h-[80vh]
                                       overflow-hidden
                                       pb-[env(safe-area-inset-bottom)] sm:pb-0"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="reflection-title"
                        >
                            {/* Drag handle — mobile only */}
                            <div className="flex justify-center pt-2 pb-1 sm:hidden">
                                <div className="w-9 h-1 rounded-full bg-slate-200 dark:bg-white/[0.12]" />
                            </div>

                            {/* Header (pinned) */}
                            <header className="shrink-0 flex items-start gap-3 px-4 pt-2 sm:pt-4 pb-3
                                               border-b border-slate-100 dark:border-white/[0.04]">
                                <div className="h-10 w-10 rounded-xl bg-blue-400/10
                                                flex items-center justify-center shrink-0">
                                    <MedraeFace
                                        name="thinking"
                                        size={28}
                                        className="text-blue-600 dark:text-blue-400"
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 leading-none mb-1">
                                        Learn from this one
                                    </p>
                                    <h2
                                        id="reflection-title"
                                        className="text-sm font-bold text-slate-900 dark:text-white leading-tight"
                                    >
                                        What got in the way?
                                    </h2>
                                    {questionText && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                            {questionText}
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={handleSkip}
                                    className="h-9 w-9 rounded-full flex items-center justify-center
                                               text-slate-700 dark:text-slate-200 shrink-0
                                               active:bg-slate-100 dark:active:bg-white/5"
                                    style={{ touchAction: "manipulation" }}
                                    aria-label="Close"
                                >
                                    <X className="h-4 w-4" strokeWidth={2.5} />
                                </button>
                            </header>

                            {/* Options (scrollable) */}
                            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar
                                             px-4 py-3 space-y-2">
                                {reasonOptions.map((reason) => {
                                    const meta = REASON_META[reason];
                                    return (
                                        <button
                                            key={reason}
                                            onClick={() => handleSelect(reason)}
                                            className="w-full flex items-center justify-between gap-3
                                                       px-3 py-3 rounded-xl text-left
                                                       bg-slate-50 dark:bg-[#0d1117]
                                                       active:scale-[0.97] transition-transform"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-bold text-slate-900 dark:text-white">
                                                    {reason}
                                                </p>
                                                {meta?.hint && (
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                        {meta.hint}
                                                    </p>
                                                )}
                                            </div>
                                            <MedraeFace
                                                name={meta?.face ?? "neutral"}
                                                size={26}
                                                className="shrink-0 text-slate-500 dark:text-slate-400"
                                            />
                                        </button>
                                    );
                                })}
                            </main>

                            {/* Footer (pinned) */}
                            <footer className="shrink-0 px-4 py-3
                                               border-t border-slate-200/70 dark:border-white/[0.06]">
                                <button
                                    onClick={handleSkip}
                                    className="w-full h-10 rounded-xl
                                               bg-slate-100 dark:bg-white/[0.06]
                                               text-slate-700 dark:text-slate-200
                                               text-sm font-bold
                                               active:scale-[0.97] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    Skip for now
                                </button>
                            </footer>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}