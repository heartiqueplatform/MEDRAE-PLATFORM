// ============================================================
// Neldes Scroll — in-feed "Create post" CTA card.
// Full height, same snap layout as a real post.
//
// UPDATED: Simple coin-earn info line + "Get approved" button
// for users who aren't approved yet. No coin amounts/emojis.
// ============================================================

import { Plus, Sparkles, ShieldCheck } from "lucide-react";
import { NELDES_COLORS } from "../config/constants";
import CreatePostLottie from "@/components/CreatePostLottie";

interface CreatePostCardProps {
    onCreate: () => void;
    position: number; // 1-based, shown in copy ("Post #4…")
    /** Whether the current user is approved in the coin program. Defaults to true. */
    isEnrolled?: boolean;
    /** Navigate to the approval / apply page. */
    onGetApproved?: () => void;
}

export function CreatePostCard({
    onCreate,
    position,
    isEnrolled = true,
    onGetApproved,
}: CreatePostCardProps) {
    return (
        <div
            className="relative w-full h-full flex flex-col items-center justify-center px-6 text-center"
            style={{
                backgroundColor: NELDES_COLORS.bg,
                touchAction: "manipulation",
            }}
        >
            {/* Subtle radial glow behind Lottie */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        "radial-gradient(circle at 50% 30%, rgba(88,166,255,0.10), transparent 60%)",
                }}
            />

            {/* Lottie */}
            <div className="relative w-[180px] h-[180px] mb-4">
                <CreatePostLottie />
            </div>

            <p
                className="relative text-[17px] font-bold mb-1.5"
                style={{ color: NELDES_COLORS.textPrimary }}
            >
                Got something to share?
            </p>
            <p
                className="relative text-[13px] mb-3 max-w-[280px] leading-snug"
                style={{ color: NELDES_COLORS.textSecondary }}
            >
                Post a meme, share news, drop a job, or teach something new.
                Your post could be next in the feed.
            </p>

            {/* Simple coin-earn info line */}
            <p
                className="relative text-[12px] mb-5 max-w-[300px] leading-snug font-medium"
                style={{ color: NELDES_COLORS.accent }}
            >
                When you post, you can start earning coins as people interact
                with your content.
            </p>

            {/* Primary CTA */}
            <button
                type="button"
                onClick={onCreate}
                className="relative inline-flex items-center gap-2 px-5 h-11 rounded-full active:scale-[0.97] transition-transform"
                style={{
                    backgroundColor: NELDES_COLORS.accent,
                    color: "#ffffff",
                }}
            >
                <Plus className="w-4 h-4" strokeWidth={2.8} />
                <span className="text-[14px] font-bold">Create a post</span>
            </button>

            {/* Not approved → send to approval page */}
            {!isEnrolled && (
                <button
                    type="button"
                    onClick={onGetApproved}
                    className="relative mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold underline underline-offset-2"
                    style={{ color: NELDES_COLORS.accent }}
                >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Get approved to earn coins
                </button>
            )}

            {/* Tiny "why am I seeing this" hint */}
            <span
                className="relative mt-4 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: NELDES_COLORS.textSecondary }}
            >
                <Sparkles className="w-3 h-3" />
                Post #{position} in this feed
            </span>
        </div>
    );
}