// src/components/Algorithm/AlgorithmSheet.tsx
"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

export function AlgorithmSheet({ open, onClose, children, title = "Your Algorithm" }: Props) {
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.dispatchEvent(
            new CustomEvent("sheet-overlay-visibility", { detail: { open: true } })
        );
        return () => {
            document.body.style.overflow = prev;
            window.dispatchEvent(
                new CustomEvent("sheet-overlay-visibility", { detail: { open: false } })
            );
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[999999]">
            <div
                className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
                onClick={onClose}
            />
            <div
                className="
                    absolute inset-0 sm:inset-auto
                    sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
                    sm:w-[min(640px,calc(100vw-2rem))] sm:max-h-[calc(100vh-4rem)]
                    flex flex-col
                    bg-zinc-50 dark:bg-[#0d1117]
                    sm:rounded-3xl
                    sm:shadow-2xl sm:ring-1 sm:ring-black/5 dark:sm:ring-white/10
                    overflow-hidden
                    animate-in slide-in-from-bottom duration-200
                    sm:animate-in sm:zoom-in-95 sm:fade-in
                "
                onClick={(e) => e.stopPropagation()}
            >
                <div className="shrink-0 flex items-center justify-between px-4 py-3 border-0 bg-white dark:bg-[#161b22]">
                    <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-white">{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto pt-3 overscroll-contain no-scrollbar
                                pb-24 safe-bottom">
                    {children}
                </div>
            </div>
        </div>
    );
}