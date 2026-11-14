// src/pages/studentcoins/components/ApplyModal.tsx

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { playSound } from "@/lib/soundManager";

interface Props {
    open: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => Promise<void>;
    submitting: boolean;
}

export function ApplyModal({ open, onClose, onSubmit, submitting }: Props) {
    const [reason, setReason] = useState("");

    // Reset the textarea whenever the modal re-opens so we don't
    // prefill a new application with a stale reason from last time.
    useEffect(() => {
        if (!open) setReason("");
    }, [open]);

    if (typeof document === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm
                     flex items-end sm:items-center justify-center p-0 sm:p-6"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 320, damping: 32 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-[#0d1117] w-full sm:max-w-md
                       rounded-t-3xl sm:rounded-3xl
                       max-h-[92dvh] overflow-hidden
                       flex flex-col"
                    >
                        {/* Scrollable content */}
                        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar
                                        p-5 space-y-4">

                            {/* Header */}
                            <div className="flex items-center gap-2">
                                <div className="h-9 w-9 rounded-full bg-amber-500/15
                                                flex items-center justify-center shrink-0">
                                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                                        Apply to earn coins
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        Applications are reviewed within 24 hours
                                    </p>
                                </div>
                            </div>

                            {/* Textarea */}
                            <div>
                                <label
                                    htmlFor="apply-reason"
                                    className="block text-[11px] font-bold uppercase tracking-wider
                                text-slate-500 dark:text-slate-400 mb-1.5"
                                >
                                    Why do you want to join? (optional)
                                </label>
                                <textarea
                                    id="apply-reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={4}
                                    maxLength={300}
                                    placeholder="Tell us briefly about your nursing journey..."
                                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#161b22]
                           text-sm text-slate-900 dark:text-white
                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                           border-0 outline-none resize-none
                           focus:ring-2 focus:ring-blue-500/40"
                                />
                                <p className="text-[10px] text-slate-400 dark:text-slate-500
                                              mt-1 text-right tabular-nums">
                                    {reason.length}/300
                                </p>
                            </div>
                        </div>

                        {/* Sticky action bar */}
                        <div className="shrink-0 px-5 pb-5 pt-2
                                        border-t border-slate-100 dark:border-white/[0.06]
                                        bg-white dark:bg-[#0d1117]
                                        flex gap-2">
                            <button
                                onClick={() => { playSound("ui-tap"); onClose(); }}
                                disabled={submitting}
                                className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-white/[0.06]
                           text-slate-700 dark:text-slate-300 text-sm font-bold
                           active:scale-[0.97] transition-transform disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { playSound("ui-tap"); onSubmit(reason); }}
                                disabled={submitting}
                                className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700
                           text-white text-sm font-bold
                           active:scale-[0.97] transition-transform
                           disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                        <span className="truncate">Submitting…</span>
                                    </>
                                ) : (
                                    "Submit application"
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}