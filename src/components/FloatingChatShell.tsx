// src/components/FloatingChatShell.tsx
"use client";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export type DesktopChatMode = "fullscreen" | "floating";

interface FloatingChatShellProps {
    children: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
    desktopMode: DesktopChatMode;
    rightWidth: number;
    onExpandRight: () => void;
}

/**
 * Chat shell.
 *
 *   PHONE   → full-screen single-pane (unchanged)
 *
 *   DESKTOP FULLSCREEN (default)
 *     → 3-pane grid: [list] [chat] [info]
 *     → right pane resizable + collapsible
 *
 *   DESKTOP FLOATING (after minimize)
 *     → single-pane floating window bottom-right (Facebook-bubble style)
 *     → shows only ONE pane at a time — the list OR the chat room
 *     → "no split" — like the original pre-3-pane version
 *
 * Panels are told which mode they're in via `FloatingChat.tsx` — the shell
 * itself only owns the outer container, so it works with any pane count.
 */
export default function FloatingChatShell({
    children,
    isOpen,
    onClose,
    desktopMode,
    rightWidth,
    onExpandRight,
}: FloatingChatShellProps) {
    useEffect(() => {
        if (!isOpen) return;
        const isPhone = window.matchMedia("(max-width: 767px)").matches;
        if (!isPhone) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                const isDesktop = window.matchMedia("(min-width: 768px)").matches;
                if (isDesktop) onClose();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const gridTemplate = `minmax(240px, 300px) minmax(0, 1fr) ${rightWidth > 0 ? `${rightWidth}px` : "0px"}`;

    return (
        <>
            {/* ── PHONE ────────────────────────────────────────────── */}
            <div
                className={cn(
                    "md:hidden fixed inset-0 z-[100]",
                    "bg-white dark:bg-[#0d1117]",
                    "flex flex-col",
                    "h-[100dvh]"
                )}
                style={{
                    paddingTop: "env(safe-area-inset-top, 0px)",
                    paddingBottom: "env(safe-area-inset-bottom, 0px)",
                }}
                role="dialog"
                aria-modal="true"
                aria-label="Chat"
            >
                {children}
            </div>

            {/* ── DESKTOP FULLSCREEN — 3-pane grid ─────────────────── */}
            {desktopMode === "fullscreen" && (
                <div
                    className={cn(
                        "hidden md:grid fixed inset-0 z-[100]",
                        "bg-white dark:bg-[#0d1117]",
                        "h-[100dvh] w-screen",
                        "overflow-hidden",
                        "relative"
                    )}
                    style={{
                        gridTemplateColumns: gridTemplate,
                        maxWidth: "100vw",
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Chat"
                >
                    {children}
                    {rightWidth === 0 && (
                        <button
                            onClick={onExpandRight}
                            aria-label="Show info panel"
                            className="absolute top-4 right-4 h-8 w-8 rounded-lg bg-gray-100 dark:bg-[#21262d] flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#30363d] transition-colors active:scale-90 z-30"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                    )}
                </div>
            )}

            {/* ── DESKTOP FLOATING — single-pane bubble ────────────── */}
            {desktopMode === "floating" && (
                <div
                    className={cn(
                        "hidden md:flex fixed z-[100] bottom-4 right-4",
                        "w-[min(400px,calc(100vw-32px))] h-[min(640px,calc(100vh-20px))]",
                        "rounded-2xl overflow-hidden",
                        "bg-white dark:bg-[#161b22]",
                        "flex-col"
                    )}
                    role="dialog"
                    aria-label="Chat"
                >
                    {children}
                </div>
            )}
        </>
    );
}