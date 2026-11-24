// ============================================================
// Neldes Scroll — in-feed "Create post" CTA card.
// Full height, same snap layout as a real post.
// ============================================================

import { Plus, Sparkles } from "lucide-react";
import HeroLottie from "@/components/HeroLottie";
import { NELDES_COLORS } from "../config/constants";
import CreatePostLottie from "@/components/CreatePostLottie";

interface CreatePostCardProps {
    onCreate: () => void;
    position: number;   // 1-based, shown in copy ("Post #4…")
}

export function CreatePostCard({ onCreate, position }: CreatePostCardProps) {
    return (
        <button
            type="button"
            onClick={onCreate}
            className="relative w-full h-full flex flex-col items-center justify-center px-8 text-center active:scale-[0.99] transition-transform"
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
                        "radial-gradient(circle at 50% 40%, rgba(88,166,255,0.10), transparent 60%)",
                }}
            />

            {/* Lottie — swap this later with your own */}
            <div className="relative w-[200px] h-[200px] mb-4">
                <CreatePostLottie />
            </div>

            <p
                className="relative text-[17px] font-bold mb-1.5"
                style={{ color: NELDES_COLORS.textPrimary }}
            >
                Got something to share?
            </p>
            <p
                className="relative text-[13px] mb-5 max-w-[280px] leading-snug"
                style={{ color: NELDES_COLORS.textSecondary }}
            >
                Post a meme, share news, drop a job, or teach something new.
                Your post could be next in the feed.
            </p>

            <span
                className="relative inline-flex items-center gap-2 px-5 h-11 rounded-full"
                style={{
                    backgroundColor: NELDES_COLORS.accent,
                    color: "#ffffff",
                }}
            >
                <Plus className="w-4 h-4" strokeWidth={2.8} />
                <span className="text-[14px] font-bold">Create a post</span>
            </span>

            {/* Tiny "why am I seeing this" hint */}
            <span
                className="relative mt-4 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: NELDES_COLORS.textSecondary }}
            >
                <Sparkles className="w-3 h-3" />
                Post #{position} in this feed
            </span>
        </button>
    );
}