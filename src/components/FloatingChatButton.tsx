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
            {/* Trigger button — restyled to match history pill */}
            <button
                onClick={handleOpen}
                aria-label="Open chat"
                className={cn(
                    "group fixed bottom-32 right-5 z-30",
                    "flex items-center gap-2 rounded-full pl-3 pr-4 py-2.5",
                    "min-w-[110px] justify-center",
                    "bg-gray-800 dark:bg-[#21262d] hover:bg-gray-900 dark:hover:bg-[#30363d] text-white",
                    "shadow-lg",
                    "transition-all duration-300 ease-out",
                    "active:scale-[0.96]",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-600",
                    isOpen && "pointer-events-none scale-0 opacity-0"
                )}
            >
                <span className="relative flex items-center justify-center w-7 h-7 rounded-full bg-white/10">
                    <ChatBubbleIcon className="w-4 h-4" strokeWidth={1.75} />

                    {unreadCount > 0 && (
                        <span
                            className={cn(
                                "absolute -top-1 -right-1 z-10",
                                "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1",
                                "bg-emerald-500 text-[10px] font-semibold leading-none text-white",
                                "ring-2 ring-gray-800 dark:ring-[#21262d]"
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