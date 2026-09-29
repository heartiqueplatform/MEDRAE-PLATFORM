"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { MedraeFace, type MedraeFaceName } from "@/components/MedraeFace";
import { useMediaQuery } from "@/hooks/useMediaQuery";

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

export function ReflectionSheet({
    open,
    onClose,
    questionText,
    reasonOptions,
    onReasonSelect,
}: Props) {
    const isDesktop = useMediaQuery("(min-width: 640px)");

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
                    />

                    {/* Responsive wrapper:
                        - mobile: docked to bottom, full width, slide-up
                        - desktop: centered floating card, fade + scale */}
                    <div
                        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center
                                   pointer-events-none"
                    >
                        <motion.div
                            initial={
                                isDesktop
                                    ? { opacity: 0, scale: 0.96, y: 0 }
                                    : { y: "100%", opacity: 1, scale: 1 }
                            }
                            animate={
                                isDesktop
                                    ? { opacity: 1, scale: 1, y: 0 }
                                    : { y: 0, opacity: 1, scale: 1 }
                            }
                            exit={
                                isDesktop
                                    ? { opacity: 0, scale: 0.96, y: 0 }
                                    : { y: "100%", opacity: 1, scale: 1 }
                            }
                            transition={
                                isDesktop
                                    ? { duration: 0.22, ease: "easeOut" }
                                    : { type: "spring", damping: 30, stiffness: 300 }
                            }
                            drag={isDesktop ? false : "y"}
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={0.15}
                            onDragEnd={(_, info) => {
                                if (!isDesktop && info.offset.y > 120) onClose();
                            }}
                            className="pointer-events-auto
                                       w-full sm:w-[440px] sm:max-w-[92vw]
                                       bg-white dark:bg-background
                                       rounded-t-3xl sm:rounded-3xl
                                       shadow-xl dark:shadow-none
                                       max-h-[70vh] sm:max-h-[80vh]
                                       flex flex-col
                                       pb-[env(safe-area-inset-bottom)] sm:pb-0
                                       overflow-hidden"
                        >
                            {/* Drag handle — mobile only */}
                            <div className="flex justify-center pt-3 pb-2 sm:hidden">
                                <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                            </div>

                            {/* Header */}
                            <div className="flex items-start justify-between px-5 pt-4 sm:pt-5 pb-3">
                                <div className="flex items-start gap-3 min-w-0">
                                    <MedraeFace
                                        name="thinking"
                                        size={40}
                                        className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
                                    />
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                            Learn from this one
                                        </p>
                                        <p className="text-[15px] font-semibold text-slate-900 dark:text-white leading-tight mt-0.5">
                                            What got in the way?
                                        </p>
                                        {questionText && (
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                                {questionText}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-muted/50 transition-colors shrink-0"
                                    aria-label="Close"
                                >
                                    <X className="w-4 h-4 text-slate-500" />
                                </button>
                            </div>

                            {/* Options */}
                            <div className="overflow-y-auto px-5 pb-6 space-y-2">
                                {reasonOptions.map((reason) => {
                                    const meta = REASON_META[reason];
                                    return (
                                        <button
                                            key={reason}
                                            onClick={() => {
                                                onReasonSelect(reason);
                                                onClose();
                                            }}
                                            className="w-full flex items-center justify-between gap-3
                                                       px-4 py-3 rounded-2xl
                                                       bg-slate-50 dark:bg-muted/40
                                                       hover:bg-blue-50 dark:hover:bg-blue-950/30
                                                       active:scale-[0.98]
                                                       transition-all text-left
                                                       border-0 shadow-none"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
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
                                                size={28}
                                                className="shrink-0 text-slate-500 dark:text-slate-400"
                                            />
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={onClose}
                                    className="w-full py-2.5 text-[12px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                >
                                    Skip for now
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}