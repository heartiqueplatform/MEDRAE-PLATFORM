// src/pages/challenge/SubmitModal.tsx

import { motion, AnimatePresence } from "framer-motion";
import { playSound } from "@/lib/soundManager";

interface SubmitModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function SubmitModal({ open, onClose, onConfirm }: SubmitModalProps) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[10000] flex items-center justify-center p-4
                               bg-black/50 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 8 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 8 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#161b22]
                                   p-5 space-y-4"
                    >
                        <div className="text-center space-y-1.5">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Submit challenge?
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                Once submitted, you won't be able to change your answers.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="flex-1 h-10 rounded-xl
                                           bg-slate-100 dark:bg-white/[0.06]
                                           text-slate-700 dark:text-slate-200
                                           text-sm font-bold
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (navigator.vibrate) navigator.vibrate(50);
                                    playSound("ui-tap");
                                    onConfirm();
                                }}
                                className="flex-1 h-10 rounded-xl bg-emerald-600 text-white
                                           text-sm font-bold
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                Submit
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}