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
            {/* Trigger button — light-mode first */}
            <button
                onClick={handleOpen}
                aria-label="Open chat"
                className={cn(
                    "group fixed bottom-32 right-5 z-30",
                    "flex items-center gap-2 rounded-full pl-3 pr-4 py-2.5",
                    "min-w-[110px] justify-center",
                    // light mode (default)
                    "bg-white hover:bg-slate-50",
                    "text-slate-800 hover:text-slate-900",
                    "ring-1 ring-slate-200 hover:ring-slate-300",
                    // dark mode override
                    "dark:bg-[#21262d] dark:hover:bg-[#30363d]",
                    "dark:text-white dark:ring-white/10 dark:hover:ring-white/20",
                    // shadow
                    "shadow-lg shadow-slate-900/10",
                    "dark:shadow-none",
                    "transition-all duration-300 ease-out",
                    "active:scale-[0.96]",
                    "focus:outline-none focus-visible:ring-2",
                    "focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400",
                    isOpen && "pointer-events-none scale-0 opacity-0"
                )}
            >
                <span
                    className={cn(
                        "relative flex items-center justify-center w-7 h-7 rounded-full",
                        // light mode icon chip
                        "bg-slate-100 text-slate-700",
                        // dark mode icon chip
                        "dark:bg-white/10 dark:text-white"
                    )}
                >
                    <ChatBubbleIcon className="w-4 h-4" strokeWidth={1.75} />

                    {unreadCount > 0 && (
                        <span
                            className={cn(
                                "absolute -top-1 -right-1 z-10",
                                "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1",
                                "bg-emerald-500 text-[10px] font-semibold leading-none text-white",
                                // ring matches button bg in both themes
                                "ring-2 ring-white dark:ring-[#21262d]"
                            )}
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </span>

                <span className="text-sm font-semibold hidden sm:inline">Chat</span>
            </button>

            {/* Chat panel — unchanged */}
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