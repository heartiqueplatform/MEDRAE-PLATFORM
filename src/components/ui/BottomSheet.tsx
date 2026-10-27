"use client";

import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

interface BottomSheetProps {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    /** Max height of the sheet on screen. Defaults to 88vh. */
    maxHeight?: string;
    /** ClassName applied to the sheet panel — use for bg, radius, etc. */
    className?: string;
}

/**
 * Instagram-style bottom sheet.
 *
 * - Slides up from the bottom in ~280ms (compositor-friendly: transform only).
 * - Drag handle at the top: grab it to drag, release >120px or fling to dismiss.
 * - Backdrop is CSS-only (no framer-motion), so the open is instant.
 * - Respects iOS safe area + `overscroll-contain` so inner scroll never bleeds.
 *
 * Usage:
 *   <BottomSheet open={open} onClose={() => setOpen(false)}>
 *     <div className="p-5">...your content...</div>
 *   </BottomSheet>
 */
export function BottomSheet({
    open,
    onClose,
    children,
    maxHeight = "88vh",
    className = "",
}: BottomSheetProps) {
    const dragControls = useDragControls();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Lock body scroll while open + Esc to close
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop — plain div, no animation, so open is instant */}
                    <div
                        onClick={onClose}
                        className="fixed inset-0 z-[9998] bg-black/60"
                    />

                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                        drag="y"
                        dragControls={dragControls}
                        dragListener={false}          // ← only the handle can start a drag
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.4 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 120 || info.velocity.y > 500) onClose();
                        }}
                        className={`fixed left-0 right-0 bottom-0 z-[9999]
                        max-h-[var(--sheet-max)]
                        rounded-t-3xl
                        bg-white dark:bg-[#0d1117]
                        will-change-transform
                        ${className}`}
                        style={{ ["--sheet-max" as any]: maxHeight }}
                    >
                        {/* Drag handle — only this starts a drag */}
                        <div
                            onPointerDown={(e) => dragControls.start(e)}
                            className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing select-none"
                            style={{ touchAction: "none" }}   // ← key: browser doesn't steal the gesture
                            aria-label="Drag to dismiss"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") onClose();
                            }}
                        >
                            <div className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
                        </div>

                        {/* Scrollable content */}
                        <div
                            ref={scrollRef}
                            className="overflow-y-auto overscroll-contain"
                            style={{
                                maxHeight: `calc(${maxHeight} - 24px)`,
                                WebkitOverflowScrolling: "touch",
                                paddingBottom: "env(safe-area-inset-bottom, 0px)",
                            }}
                        >
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}