// src/pages/challenge/ResultOverlays.tsx

import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Flame } from "lucide-react";

function OverlayShell({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-5
                       bg-black/70 backdrop-blur-md"
            onClick={onClick}
        >
            <motion.div
                initial={{ scale: 0.9, y: 24, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 24, opacity: 0 }}
                transition={{ type: "spring", damping: 18 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-sm rounded-3xl
                           bg-white dark:bg-[#161b22]
                           p-6 flex flex-col items-center text-center space-y-4"
            >
                {children}
            </motion.div>
        </motion.div>
    );
}

export function WinOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
    if (typeof document === "undefined") return null;
    return createPortal(
        <AnimatePresence>
            {open && (
                <OverlayShell onClick={onClose}>
                    <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-400/10
                                    flex items-center justify-center">
                        <Trophy className="h-7 w-7 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider
                                      text-amber-600 dark:text-amber-400 mb-1">
                            Champion
                        </p>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                            Victory
                        </h2>
                    </div>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Clinical dominance established. You've out-performed your peer.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full h-10 rounded-xl bg-blue-600 text-white
                                   text-sm font-bold
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        Continue
                    </button>
                </OverlayShell>
            )}
        </AnimatePresence>,
        document.body
    );
}

export function LossOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
    if (typeof document === "undefined") return null;
    return createPortal(
        <AnimatePresence>
            {open && (
                <OverlayShell onClick={onClose}>
                    <div className="h-14 w-14 rounded-2xl bg-rose-50 dark:bg-rose-400/10
                                    flex items-center justify-center">
                        <Flame className="h-7 w-7 text-rose-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider
                                      text-rose-600 dark:text-rose-400 mb-1">
                            Outcome
                        </p>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                            Defeat
                        </h2>
                    </div>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Every loss is a lesson. Knowledge is power, and power grows with persistence.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full h-10 rounded-xl bg-rose-600 text-white
                                   text-sm font-bold
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        Try another battle
                    </button>
                </OverlayShell>
            )}
        </AnimatePresence>,
        document.body
    );
}