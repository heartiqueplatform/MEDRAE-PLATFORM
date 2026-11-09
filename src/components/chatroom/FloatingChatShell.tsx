// src/components/FloatingChatShell.tsx
"use client";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface FloatingChatShellProps {
    children: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
    isExpanded: boolean;
}

/**
 * Visual shell for FloatingChat.
 *   • Phone (<768px)   → TRUE full-screen (single pane, current behavior)
 *   • Desktop (≥768px) → floating window, 3-pane layout inside:
 *                          left = chat list · middle = chat · right = unit info
 *     The children must render in this order:
 *       [<ChatListPanel/>, <ChatRoomPanel/>, <UnitInfoPanel/>]
 *     We lay them out with CSS grid so the same JSX works on both phone and desktop.
 */
export default function FloatingChatShell({
    children,
    isOpen,
    onClose,
    isExpanded,
}: FloatingChatShellProps) {
    // Lock body scroll on phone only while chat is open
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

    if (!isOpen) return null;

    return (
        <>
            {/* ── PHONE: full-screen takeover (stacked, single pane) ── */}
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

            {/* ── DESKTOP: floating window with 3-pane grid ── */}
            <div
                className={cn(
                    "hidden md:flex fixed z-[100] bottom-4 right-4",
                    isExpanded ? "w-[1100px] h-[90vh]" : "w-[720px] h-[calc(100vh-20px)] max-h-[720px]",
                    "max-h-[90vh]",
                    "rounded-2xl overflow-hidden",
                    "bg-white dark:bg-[#161b22]",
                    "grid grid-cols-[260px_1fr_220px]"
                )}
            >
                {children}
            </div>
        </>
    );
}