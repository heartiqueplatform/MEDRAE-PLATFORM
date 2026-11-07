// src/components/ui/BottomSheet.tsx
// Instagram-style bottom sheet.
// • Portal into <body> → ABOVE footer/header/nav (no parent stacking context can trap it)
// • z-index 2147483647 (Integer.MAX_VALUE)
// • Drag handle on mobile, X button on desktop
// • Esc closes, backdrop closes
// • Scrollbar hidden (still scrolls)

"use client";

import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface BottomSheetProps {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    /** Max height of the sheet on screen. Defaults to 88vh. */
    maxHeight?: string;
    /** ClassName applied to the sheet panel — use for bg, radius, etc. */
    className?: string;
    /**
     * Optional title shown in the sheet header.
     * When provided on desktop, the X sits next to it.
     */
    title?: string;
}

export function BottomSheet({
    open,
    onClose,
    children,
    maxHeight = "88vh",
    className = "",
    title,
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

    if (typeof document === "undefined") return null;

    const content = (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop — plain div, no animation */}
                    <div
                        onClick={onClose}
                        className="fixed inset-0 z-[2147483646] bg-black/60"
                    />

                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                        drag="y"
                        dragControls={dragControls}
                        dragListener={false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.4 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 120 || info.velocity.y > 500) onClose();
                        }}
                        className={`fixed left-0 right-0 bottom-0 z-[2147483647]
                        max-h-[var(--sheet-max)]
                        rounded-t-3xl
                        bg-white dark:bg-[#0d1117]
                        will-change-transform
                        ${className}`}
                        style={{ ["--sheet-max" as any]: maxHeight }}
                    >
                        {/* Header row: drag handle (mobile) | title (optional) | X (desktop) */}
                        <div className="relative flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
                            {/* Drag handle — mobile only, centered */}
                            <div
                                onPointerDown={(e) => dragControls.start(e)}
                                className="flex-1 flex sm:hidden justify-center cursor-grab active:cursor-grabbing select-none"
                                style={{ touchAction: "none" }}
                                aria-label="Drag to dismiss"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") onClose();
                                }}
                            >
                                <div className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
                            </div>

                            {/* Optional title — desktop only (mobile keeps drag handle) */}
                            {title && (
                                <h2 className="hidden sm:block text-sm font-bold text-gray-900 dark:text-[#e6edf3] pl-1">
                                    {title}
                                </h2>
                            )}

                            {/* X close — desktop only */}
                            <button
                                onClick={onClose}
                                aria-label="Close"
                                className="hidden sm:flex ml-auto w-8 h-8 items-center justify-center rounded-full
                                    bg-gray-100 dark:bg-[#21262d]
                                    text-gray-600 dark:text-[#8b949e]
                                    hover:bg-gray-200 hover:dark:bg-[#30363d]
                                    hover:dark:text-[#e6edf3]
                                    active:scale-95 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Scrollable content — scrollbar hidden */}
                        <div
                            ref={scrollRef}
                            className="overflow-y-auto overscroll-contain
                                [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            style={{
                                maxHeight: `calc(${maxHeight} - 44px)`,
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

    return createPortal(content, document.body);
}