// src/modules/neldes-scroll/components/ViewedPostViewer.tsx
// ============================================================
// Medspite — full-screen viewer for a Viewed-tab post.
// Mobile: full-screen.
// Desktop: centered 9:16 panel (matches For You desktop layout).
// ============================================================

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { FeedCard } from "./FeedCard";
import { useSession } from "@supabase/auth-helpers-react";
import type { FeedPost, ShareTarget } from "../types";
import type { ShareDispatcher } from "./NeldesScrollScreen";
import { NELDES_COLORS } from "../config/constants";

interface ViewedPostViewerProps {
    post: FeedPost | null;
    onClose: () => void;
    onUpdate: (id: number, patch: Partial<FeedPost>) => void;
    onOpenComments: (post: FeedPost) => void;
    onOpenShare: (post: FeedPost) => void;
    onOpenOwnerMenu: (post: FeedPost) => void;
    onCreate: () => void;
    onRegisterShare: (fn: ShareDispatcher) => void;
}

export function ViewedPostViewer({
    post,
    onClose,
    onUpdate,
    onOpenComments,
    onOpenShare,
    onOpenOwnerMenu,
    onCreate,
    onRegisterShare,
}: ViewedPostViewerProps) {
    const session = useSession();
    const currentUserId = session?.user?.id ?? null;

    // Lock body scroll while viewer is open
    useEffect(() => {
        if (!post) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [post]);

    // Escape key to close
    useEffect(() => {
        if (!post) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [post, onClose]);

    return (
        <AnimatePresence>
            {post && (
                <>
                    {/* ── Backdrop (mobile: black; desktop: dim) ─────────── */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] hidden md:block"
                        style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
                    />

                    {/* ── MOBILE: full-screen ───────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[100] md:hidden"
                        style={{ backgroundColor: NELDES_COLORS.bg }}
                    >
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="fixed top-3 left-3 z-[101] w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                            style={{ backgroundColor: "transparent", touchAction: "manipulation" }}
                        >
                            <ChevronLeft
                                className="w-6 h-6 text-white"
                                strokeWidth={2.4}
                                style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" }}
                            />
                        </button>

                        <div className="w-full h-full">
                            <FeedCard
                                post={post}
                                onUpdate={onUpdate}
                                onOpenComments={onOpenComments}
                                onOpenShare={onOpenShare}
                                onVisible={() => { }}
                                onRegisterShare={onRegisterShare}
                                onOpenOwnerMenu={onOpenOwnerMenu}
                                currentUserId={currentUserId}
                                onCreate={onCreate}
                                index={0}
                            />
                        </div>
                    </motion.div>

                    {/* ── DESKTOP: centered 9:16 panel ─────────────────── */}
                    <div className="hidden md:flex fixed inset-0 z-[100] items-center justify-center p-6 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                            className="relative h-full max-h-[calc(100vh-3rem)] rounded-2xl overflow-hidden pointer-events-auto"
                            style={{
                                aspectRatio: "9 / 16",
                                backgroundColor: "#000",
                            }}
                        >
                            {/* Back button */}
                            <button
                                onClick={onClose}
                                aria-label="Close"
                                className="absolute top-3 left-3 z-[101] w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                                style={{ backgroundColor: "transparent", touchAction: "manipulation" }}
                            >
                                <ChevronLeft
                                    className="w-6 h-6 text-white"
                                    strokeWidth={2.4}
                                    style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" }}
                                />
                            </button>

                            {/* FeedCard inside the panel */}
                            <div className="w-full h-full">
                                <FeedCard
                                    post={post}
                                    onUpdate={onUpdate}
                                    onOpenComments={onOpenComments}
                                    onOpenShare={onOpenShare}
                                    onVisible={() => { }}
                                    onRegisterShare={onRegisterShare}
                                    onOpenOwnerMenu={onOpenOwnerMenu}
                                    currentUserId={currentUserId}
                                    onCreate={onCreate}
                                    index={0}
                                />
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}