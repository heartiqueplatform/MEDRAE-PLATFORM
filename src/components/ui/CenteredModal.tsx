// src/components/ui/CenteredModal.tsx
"use client";

import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface CenteredModalProps {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: string;
    subtitle?: string;
    /** Max width on desktop. Ignored on phone. Defaults to max-w-lg. */
    maxWidthClass?: string;
    /** Max height. Defaults to 86vh. */
    maxHeight?: string;
    /** Hide the title/subtitle header row. Default false. */
    hideHeader?: boolean;
    /** Optional pinned footer rendered below the scroll body. */
    footer?: ReactNode;
    /** Opt out of the internal scroll region (caller owns scroll). Default false. */
    noScrollBody?: boolean;
    /** Optional className applied to the body wrapper. */
    bodyClassName?: string;
    /** Optional className applied to the outer card. */
    className?: string;
    /** Disable backdrop-close + drag-dismiss (useful while uploading). Default false. */
    locked?: boolean;
}

export function CenteredModal({
    open,
    onClose,
    children,
    title,
    subtitle,
    maxWidthClass = "max-w-lg",
    maxHeight = "86vh",
    hideHeader = false,
    footer,
    noScrollBody = false,
    bodyClassName = "",
    className = "",
    locked = false,
}: CenteredModalProps) {
    const dragControls = useDragControls();

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !locked) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose, locked]);

    if (typeof document === "undefined") return null;

    const showHeader = !hideHeader && (title || subtitle);

    const header = showHeader && (
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 shrink-0">
            <div className="min-w-0 flex-1">
                {title && (
                    <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                        {title}
                    </h2>
                )}
                {subtitle && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {subtitle}
                    </p>
                )}
            </div>
            <button
                onClick={onClose}
                aria-label="Close"
                disabled={locked}
                className="shrink-0 w-8 h-8 -mr-1 -mt-1 flex items-center justify-center rounded-full
                           bg-slate-100 dark:bg-white/[0.06]
                           text-slate-600 dark:text-slate-300
                           hover:bg-slate-200 dark:hover:bg-white/[0.1]
                           active:scale-95 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );

    const divider = showHeader && (
        <div className="h-px bg-slate-100 dark:bg-white/[0.04] shrink-0" />
    );

    const body = noScrollBody ? (
        <div className={`flex-1 min-h-0 flex flex-col ${bodyClassName}`}>
            {children}
        </div>
    ) : (
        <div
            className={`flex-1 min-h-0 overflow-y-auto overscroll-contain
                        [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                        ${bodyClassName}`}
            style={{ WebkitOverflowScrolling: "touch" }}
        >
            {children}
        </div>
    );

    const footerEl = footer && (
        <div className="shrink-0 border-t border-slate-200/70 dark:border-white/[0.06]">
            {footer}
        </div>
    );

    const content = (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={locked ? undefined : onClose}
                        className="fixed inset-0 z-[2147483646] bg-black/40"
                    />

                    {/* Mobile sheet */}
                    <motion.div
                        key="mobile-sheet"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{
                            type: "tween",
                            duration: 0.28,
                            ease: [0.32, 0.72, 0, 1],
                        }}
                        drag={locked ? false : "y"}
                        dragControls={dragControls}
                        dragListener={false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.4 }}
                        onDragEnd={(_, info) => {
                            if (locked) return;
                            if (info.offset.y > 120 || info.velocity.y > 500)
                                onClose();
                        }}
                        className={`sm:hidden fixed left-0 right-0 bottom-0 z-[2147483647]
                                    rounded-t-3xl bg-white dark:bg-[#161b22]
                                    flex flex-col will-change-transform
                                    ${className}`}
                        style={{
                            maxHeight,
                            paddingBottom: "env(safe-area-inset-bottom, 0px)",
                        }}
                    >
                        {!locked && (
                            <div
                                onPointerDown={(e) => dragControls.start(e)}
                                className="flex justify-center pt-2.5 pb-1 shrink-0
                                           cursor-grab active:cursor-grabbing select-none"
                                style={{ touchAction: "none" }}
                                aria-label="Drag to dismiss"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ")
                                        onClose();
                                }}
                            >
                                <div className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
                            </div>
                        )}

                        {header}
                        {divider}
                        {body}
                        {footerEl}
                    </motion.div>

                    {/* Desktop */}
                    <div className="hidden sm:flex fixed inset-0 z-[2147483647] items-center justify-center p-6 pointer-events-none">
                        <motion.div
                            key="desktop-modal"
                            initial={{ opacity: 0, scale: 0.96, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 8 }}
                            transition={{
                                type: "tween",
                                duration: 0.2,
                                ease: [0.32, 0.72, 0, 1],
                            }}
                            className={`relative w-full ${maxWidthClass} rounded-2xl
                                        bg-white dark:bg-[#161b22]
                                        pointer-events-auto overflow-hidden flex flex-col
                                        ${className}`}
                            style={{ maxHeight }}
                        >
                            {header}
                            {divider}
                            {body}
                            {footerEl}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );

    return createPortal(content, document.body);
}