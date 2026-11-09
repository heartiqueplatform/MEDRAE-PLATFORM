"use client";
import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useDrawer } from "@/contexts/DrawerContext";
import { ChatBubbleIcon } from "@/components/icons/ChatBubbleIcon";

const FloatingChat = lazy(() => import("@/components/FloatingChat"));

const dispatchChatVisibility = (open: boolean) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
        new CustomEvent("chat-overlay-visibility", { detail: { open } })
    );
};

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
            if (e.key === "Escape") {
                setIsOpen(false);
                dispatchChatVisibility(false);
            }
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, []);

    const handleOpen = useCallback(() => {
        setIsOpen(true);
        setUnreadCount(0);
        dispatchChatVisibility(true);
    }, []);

    const handleClose = useCallback(() => {
        dispatchChatVisibility(false);
        setIsOpen(false);
    }, []);

    if (isDrawerOpen) return null;

    return (
        <>
            {/* Trigger — solid blue FAB, matches app primary color */}
            <button
                onClick={handleOpen}
                aria-label="Open chat"
                className={cn(
                    "group fixed right-4 z-30",
                    // ── Mobile: sits ABOVE the crown button ──
                    "max-md:bottom-[calc(60px+env(safe-area-inset-bottom,0px)+100px)]",
                    // ── Desktop position ──
                    "md:bottom-32 md:right-5",
                    // ── Mobile shape: perfect 56×56 circle ──
                    "max-md:w-14 max-md:h-14 max-md:p-0 max-md:rounded-full max-md:justify-center",
                    // ── Desktop shape: pill with label ──
                    "md:flex md:items-center md:gap-2 md:rounded-full md:pl-3 md:pr-4 md:py-2.5 md:min-w-[110px] md:justify-center",
                    // ---- COLORS: SOLID BLUE FAB ----
                    "bg-blue-600 hover:bg-blue-700",
                    "text-white",
                    "ring-1 ring-blue-500/40 hover:ring-blue-500/60",
                    // ---- DARK: same blue, slightly deeper ring ----
                    "dark:bg-blue-600 dark:hover:bg-blue-700",
                    "dark:ring-blue-400/30 dark:hover:ring-blue-400/50",
                    // ---- SHADOW: soft, color-tinted ----
                    "shadow-lg shadow-blue-600/25",
                    "dark:shadow-blue-900/40",
                    // ---- MOTION ----
                    "transition-all duration-300 ease-out",
                    "active:scale-[0.96]",
                    "focus:outline-none focus-visible:ring-2",
                    "focus-visible:ring-white/80 dark:focus-visible:ring-white/70",
                    isOpen && "pointer-events-none scale-0 opacity-0"
                )}
            >
                <span
                    className={cn(
                        "relative flex items-center justify-center rounded-full",
                        // ── Mobile: full-size, no chip bg ──
                        "max-md:w-full max-md:h-full max-md:bg-transparent",
                        // ── Desktop: small white/15 tint chip ──
                        "md:w-7 md:h-7 md:bg-white/15",
                        // ---- ICON: always white ----
                        "text-white"
                    )}
                >
                    <ChatBubbleIcon
                        className="w-6 h-6 md:w-4 md:h-4 text-white"
                        strokeWidth={2}
                    />

                    {unreadCount > 0 && (
                        <span
                            className={cn(
                                "absolute -top-1 -right-1 z-10",
                                "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1",
                                // Amber badge — readable on blue, matches crown style
                                "bg-amber-500 text-[10px] font-bold leading-none text-white",
                                "ring-2 ring-white dark:ring-blue-600"
                            )}
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </span>

                {/* Label — desktop only */}
                <span className="hidden md:inline text-sm font-semibold text-white">
                    Chat
                </span>
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
        </>
    );
}