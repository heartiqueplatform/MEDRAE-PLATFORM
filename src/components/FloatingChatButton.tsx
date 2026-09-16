"use client";
import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useDrawer } from "@/contexts/DrawerContext";
import { ChatBubbleIcon } from "@/components/icons/ChatBubbleIcon";

const FloatingChat = lazy(() => import("@/components/FloatingChat"));

interface FloatingChatButtonProps {
    userId: string;
}

export function FloatingChatButton({ userId }: FloatingChatButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const { isOpen: isDrawerOpen } = useDrawer();

    useEffect(() => {
        const handleNewMessage = () => {
            if (!isOpen) setUnreadCount((prev) => prev + 1);
        };
        window.addEventListener("newChatMessage", handleNewMessage as EventListener);
        return () =>
            window.removeEventListener("newChatMessage", handleNewMessage as EventListener);
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, []);

    const handleOpen = useCallback(() => {
        setIsOpen(true);
        setUnreadCount(0);
    }, []);

    const handleClose = useCallback(() => setIsOpen(false), []);

    if (isDrawerOpen) return null;

    return (
        <div className="hidden md:block">
            {/* Trigger button */}
            <button
                onClick={handleOpen}
                aria-label="Open chat"
                className={cn(
                    "group fixed bottom-32 right-5 z-30",
                    "flex h-12 w-12 items-center justify-center rounded-full",
                    // white in light, dark in dark
                    "bg-white text-slate-900",
                    "dark:bg-slate-900 dark:text-slate-50",
                    // subtle border so it reads on white/dark backgrounds
                    "border border-slate-200 dark:border-slate-800",
                    "shadow-[0_8px_24px_-6px_rgba(15,23,42,0.18)]",
                    "dark:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.6)]",
                    "transition-all duration-300 ease-out",
                    "hover:scale-105",
                    "hover:bg-slate-50 dark:hover:bg-slate-800",
                    "active:scale-95",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-600",
                    isOpen && "pointer-events-none scale-0 opacity-0"
                )}
            >
                <ChatBubbleIcon className="h-5 w-5" strokeWidth={1.75} />

                {unreadCount > 0 && (
                    <span
                        className={cn(
                            "absolute -top-1 -right-1 z-10",
                            "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1",
                            "bg-slate-900 text-[10px] font-semibold leading-none text-white",
                            "dark:bg-white dark:text-slate-900",
                            "ring-2 ring-white dark:ring-slate-900"
                        )}
                    >
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Chat panel */}
            <div
                className={cn(
                    "fixed z-[100] transition-all duration-300 ease-in-out",
                    "md:bottom-4 md:right-4",
                    "inset-0 md:inset-auto",
                    isOpen
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none scale-95"
                )}
            >
                <Suspense
                    fallback={
                        <div className="flex h-full w-full items-center justify-center rounded-2xl bg-background">
                            <div className="animate-pulse text-sm text-muted-foreground">
                                Loading chat…
                            </div>
                        </div>
                    }
                >
                    <FloatingChat
                        currentUserId={userId}
                        isOpen={isOpen}
                        onClose={handleClose}
                    />
                </Suspense>
            </div>
        </div>
    );
}