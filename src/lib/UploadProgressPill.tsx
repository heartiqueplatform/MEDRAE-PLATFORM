"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import {
    uploadProgressStore,
    type UploadSnapshot,
} from "@/lib/uploadProgressStore";

/**
 * Global upload progress pill.
 * Mount once at the app root. Listens to uploadProgressStore.
 * Auto-dismisses on success / error.
 *
 * Visuals — matches your existing design language:
 *   - no borders, no shadows
 *   - single accent color (blue)
 *   - rounded-2xl card feel (same as composer prompt)
 *   - uses your existing bg-white / bg-[#161b22] card colors
 */
export default function UploadProgressPill() {
    const [snap, setSnap] = useState<UploadSnapshot>(
        uploadProgressStore.get()
    );
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const unsub = uploadProgressStore.subscribe(setSnap);
        return unsub;
    }, []);

    if (!mounted) return null;

    const visible = snap.status !== "idle";
    const percent =
        snap.total > 0 ? Math.round((snap.done / snap.total) * 100) : 0;

    return createPortal(
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="fixed left-1/2 -translate-x-1/2 z-[2147483646]
                               bottom-4 sm:bottom-6
                               w-[calc(100%-2rem)] max-w-sm
                               rounded-2xl
                               bg-white dark:bg-[#161b22]
                               px-3.5 py-3
                               pointer-events-none"
                    role="status"
                    aria-live="polite"
                >
                    <div className="flex items-center gap-2.5">
                        {/* Left icon */}
                        <span className="h-8 w-8 rounded-full shrink-0
                                         flex items-center justify-center
                                         bg-blue-50 dark:bg-blue-400/10">
                            {snap.status === "uploading" && (
                                <Loader2
                                    className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400"
                                />
                            )}
                            {snap.status === "success" && (
                                <Check
                                    className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                                    strokeWidth={3}
                                />
                            )}
                            {snap.status === "error" && (
                                <AlertCircle
                                    className="h-4 w-4 text-rose-600 dark:text-rose-400"
                                    strokeWidth={2.5}
                                />
                            )}
                        </span>

                        {/* Text + progress bar */}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[12.5px] font-bold
                                              text-slate-900 dark:text-white truncate">
                                    {snap.status === "uploading" &&
                                        `Uploading ${snap.done} of ${snap.total}`}
                                    {snap.status === "success" &&
                                        `${snap.done} uploaded`}
                                    {snap.status === "error" &&
                                        snap.message || "Upload failed"}
                                </p>
                                {snap.status === "uploading" && (
                                    <span className="text-[10px] font-bold tabular-nums
                                                     text-slate-500 dark:text-slate-400 shrink-0">
                                        {percent}%
                                    </span>
                                )}
                            </div>

                            {snap.status === "uploading" && snap.total > 0 && (
                                <div className="mt-1.5 h-1 w-full rounded-full
                                                bg-slate-100 dark:bg-white/[0.06]
                                                overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full
                                                   bg-blue-600 dark:bg-blue-400"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percent}%` }}
                                        transition={{ duration: 0.25, ease: "easeOut" }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}