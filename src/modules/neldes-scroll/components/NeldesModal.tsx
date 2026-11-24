// src/modules/neldes-scroll/components/NeldesModal.tsx
// ============================================================
// Neldes Scroll — dedicated modal/sheet.
// Always dark. Never touches the shared CenteredModal.
// Mobile: bottom sheet with drag-to-dismiss.
// Desktop: centered modal.
// Inputs/textarea forced dark regardless of app-level CSS.
// ============================================================

"use client";

import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface NeldesModalProps {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: string;
    subtitle?: string;
    maxWidthClass?: string;
    maxHeight?: string;
    footer?: ReactNode;
    bodyClassName?: string;
    locked?: boolean;
}

// Scoped override: only affects inputs/textarea inside .neldes-modal-content.
// Beats any global light-mode rule (`input { background: white }`) because
// of !important, and forces color-scheme: dark so native controls render dark.
const NELDES_INPUT_STYLES = `
  .neldes-modal-content input,
  .neldes-modal-content textarea {
    background-color: #21262d !important;
    color: #f0f6fc !important;
    border: 0 !important;
    outline: none !important;
    color-scheme: dark;
  }
  .neldes-modal-content input::placeholder,
  .neldes-modal-content textarea::placeholder {
    color: #6e7681 !important;
  }
  .neldes-modal-content input:focus,
  .neldes-modal-content textarea:focus {
    outline: none !important;
    box-shadow: none !important;
  }
  .neldes-modal-content input:disabled,
  .neldes-modal-content textarea:disabled {
    opacity: 0.6;
  }
  .neldes-modal-content textarea::-webkit-scrollbar {
    width: 6px;
  }
  .neldes-modal-content textarea::-webkit-scrollbar-thumb {
    background: #30363d;
    border-radius: 3px;
  }
`;

export function NeldesModal({
    open,
    onClose,
    children,
    title,
    subtitle,
    maxWidthClass = "max-w-md",
    maxHeight = "86vh",
    footer,
    bodyClassName = "",
    locked = false,
}: NeldesModalProps) {
    const dragControls = useDragControls();

    // Body scroll lock + Escape close
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

    const showHeader = !!(title || subtitle);

    const header = showHeader && (
        <div className="neldes-modal-content flex items-start justify-between gap-3 px-4 pt-4 pb-3 shrink-0">
            <div className="min-w-0 flex-1">
                {title && (
                    <h2 className="text-[15px] font-bold text-white tracking-tight truncate">
                        {title}
                    </h2>
                )}
                {subtitle && (
                    <p className="text-[11px] text-[#8b949e] mt-0.5 truncate">{subtitle}</p>
                )}
            </div>
            <button
                onClick={onClose}
                aria-label="Close"
                disabled={locked}
                className="shrink-0 w-8 h-8 -mr-1 -mt-1 flex items-center justify-center rounded-full
                           bg-[#21262d] text-[#c9d1d9]
                           hover:bg-[#30363d]
                           active:scale-95 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );

    const divider = showHeader && <div className="h-px bg-[#21262d] shrink-0" />;

    const body = (
        <div
            className={`neldes-modal-content flex-1 min-h-0 overflow-y-auto overscroll-contain
                        [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                        ${bodyClassName}`}
            style={{ WebkitOverflowScrolling: "touch" }}
        >
            {children}
        </div>
    );

    const footerEl = footer && (
        <div className="neldes-modal-content shrink-0 border-t border-[#21262d] px-4 py-2.5 pb-4">
            {footer}
        </div>
    );
    const content = (
        <AnimatePresence>
            {open && (
                <>
                    <style>{NELDES_INPUT_STYLES}</style>

                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={locked ? undefined : onClose}
                        className="fixed inset-0 z-[2147483646] bg-black/70"
                    />

                    {/* Mobile: bottom sheet */}
                    <motion.div
                        key="neldes-mobile-sheet"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                        drag={locked ? false : "y"}
                        dragControls={dragControls}
                        dragListener={false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.4 }}
                        onDragEnd={(_, info) => {
                            if (locked) return;
                            if (info.offset.y > 120 || info.velocity.y > 500) onClose();
                        }}
                        className="sm:hidden fixed left-0 right-0 bottom-0 z-[2147483647]
                                   rounded-t-3xl bg-[#161b22]
                                   flex flex-col will-change-transform"
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
                                    if (e.key === "Enter" || e.key === " ") onClose();
                                }}
                            >
                                <div className="h-1.5 w-10 rounded-full bg-[#484f58]" />
                            </div>
                        )}

                        {header}
                        {divider}
                        {body}
                        {footerEl}
                    </motion.div>

                    {/* Desktop: centered */}
                    <div className="hidden sm:flex fixed inset-0 z-[2147483647] items-center justify-center p-6 pointer-events-none">
                        <motion.div
                            key="neldes-desktop-modal"
                            initial={{ opacity: 0, scale: 0.96, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 8 }}
                            transition={{ type: "tween", duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                            className={`relative w-full ${maxWidthClass} rounded-2xl
                                        bg-[#161b22] pointer-events-auto overflow-hidden
                                        flex flex-col`}
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