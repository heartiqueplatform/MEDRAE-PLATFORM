"use client";
import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDrawer } from "@/contexts/DrawerContext"; // 👈 Import the drawer context

const FloatingChat = lazy(() => import("@/components/FloatingChat"));

interface FloatingChatButtonProps {
    userId: string;
}

export function FloatingChatButton({ userId }: FloatingChatButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const { isOpen: isDrawerOpen } = useDrawer(); // 👈 Get drawer state

    useEffect(() => {
        const handleNewMessage = (event: CustomEvent) => {
            if (!isOpen) {
                setUnreadCount(prev => prev + 1);
            }
        };

        window.addEventListener('newChatMessage', handleNewMessage as EventListener);
        return () => {
            window.removeEventListener('newChatMessage', handleNewMessage as EventListener);
        };
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

    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    // 👈 Don't render anything when drawer is open
    if (isDrawerOpen) return null;

    return (
        <>
            {/* Floating Button - Should be above page content but below modals/overlays */}
            <button
                onClick={handleOpen}
                className={cn(
                    "fixed bottom-32 right-5 p-2 rounded-full shadow-lg transition-all duration-300",  // 👈 Changed p-3 to p-2
                    "bg-teal-600 hover:bg-teal-700 text-white",
                    "hover:scale-105 active:scale-95",
                    "border-2 border-white/20 dark:border-slate-800/50",
                    isOpen && "scale-0 opacity-0 pointer-events-none",
                    "z-[30]"
                )}
                aria-label="Open chat"
            >
                <MessageCircle className="h-5 w-5" />
                {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white animate-pulse">  // 👈 Reduced badge size
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                )}
            </button>
            {/* Chat Panel - Should be above the button when open */}
            <div
                className={cn(
                    "fixed z-[200] transition-all duration-300 ease-in-out",
                    "md:bottom-4 md:right-4",
                    "inset-0 md:inset-auto",
                    isOpen
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none scale-95"
                )}
            >
                <Suspense fallback={
                    <div className="flex items-center justify-center h-full w-full bg-background rounded-2xl">
                        <div className="animate-pulse text-gray-400">Loading chat...</div>
                    </div>
                }>
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