// ============================================================
// Neldes Scroll — right-side vertical action rail.
// TikTok-style. Circular buttons, no borders, no shadows.
// Each icon is 44×44 tap target; visual icon is 26px.
// ============================================================

import { memo } from "react";
import { motion } from "framer-motion";
import {
    Heart,
    MessageCircle,
    Share2,
    Bookmark,
    Download,
    Eye,
    Loader2,
} from "lucide-react";
import { FeedPost } from "../types";
import { NELDES_COLORS } from "../config/constants";

interface CardActionsProps {
    post: FeedPost;
    onLike: () => void;
    onSave: () => void;
    onComment: () => void;
    onShare: () => void;
    onDownload: () => void;
    sharing?: boolean;
    downloading?: boolean;
}

function formatCount(n: number): string {
    if (n < 1000) return String(n);
    if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
    return `${(n / 1_000_000).toFixed(1)}m`;
}

export const CardActions = memo(function CardActions({
    post,
    onLike,
    onSave,
    onComment,
    onShare,
    onDownload,
    sharing,
    downloading,
}: CardActionsProps) {
    return (
        <div className="flex flex-col items-center gap-4">
            {/* ── Like ──────────────────────────────────────── */}
            <ActionButton
                label={formatCount(post.likes_count)}
                onClick={onLike}
                ariaLabel={post.is_liked ? "Unlike" : "Like"}
            >
                <motion.div
                    animate={post.is_liked ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <Heart
                        className="w-[26px] h-[26px]"
                        strokeWidth={2}
                        fill={post.is_liked ? NELDES_COLORS.heart : "transparent"}
                        color={post.is_liked ? NELDES_COLORS.heart : "#ffffff"}
                    />
                </motion.div>
            </ActionButton>

            {/* ── Comment ───────────────────────────────────── */}
            <ActionButton
                label={formatCount(post.comments_count)}
                onClick={onComment}
                ariaLabel="Comments"
            >
                <MessageCircle
                    className="w-[26px] h-[26px]"
                    strokeWidth={2}
                    color="#ffffff"
                />
            </ActionButton>

            {/* ── Share ─────────────────────────────────────── */}
            <ActionButton
                label={formatCount(post.shares_count)}
                onClick={onShare}
                ariaLabel="Share"
                disabled={sharing}
            >
                {sharing ? (
                    <Loader2 className="w-[26px] h-[26px] animate-spin" color="#ffffff" />
                ) : (
                    <Share2
                        className="w-[26px] h-[26px]"
                        strokeWidth={2}
                        color="#ffffff"
                    />
                )}
            </ActionButton>

            {/* ── Save ──────────────────────────────────────── */}
            <ActionButton
                label="Save"
                onClick={onSave}
                ariaLabel={post.is_saved ? "Unsave" : "Save"}
            >
                <Bookmark
                    className="w-[26px] h-[26px]"
                    strokeWidth={2}
                    fill={post.is_saved ? NELDES_COLORS.accent : "transparent"}
                    color={post.is_saved ? NELDES_COLORS.accent : "#ffffff"}
                />
            </ActionButton>

            {/* ── Download ──────────────────────────────────── */}
            <ActionButton
                label="Download"
                onClick={onDownload}
                ariaLabel="Download"
                disabled={downloading}
            >
                {downloading ? (
                    <Loader2 className="w-[26px] h-[26px] animate-spin" color="#ffffff" />
                ) : (
                    <Download
                        className="w-[26px] h-[26px]"
                        strokeWidth={2}
                        color="#ffffff"
                    />
                )}
            </ActionButton>

            {/* ── Views (stat, non-interactive) ─────────────── */}
            <div
                className="flex flex-col items-center gap-1 select-none"
                aria-label={`${post.views_count} views`}
            >
                <div className="w-11 h-11 flex items-center justify-center">
                    <Eye
                        className="w-[24px] h-[24px]"
                        strokeWidth={2}
                        color="#c9d1d9"
                    />
                </div>
                <span
                    className="text-[11px] font-semibold"
                    style={{ color: "#c9d1d9" }}
                >
                    {formatCount(post.views_count)}
                </span>
            </div>
        </div>
    );
});

/* ── Small reusable button ─────────────────────────────── */
function ActionButton({
    children,
    label,
    onClick,
    ariaLabel,
    disabled,
}: {
    children: React.ReactNode;
    label: string;
    onClick: () => void;
    ariaLabel: string;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            aria-label={ariaLabel}
            disabled={disabled}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform disabled:opacity-60"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
            <div className="w-11 h-11 flex items-center justify-center">
                {children}
            </div>
            <span
                className="text-[11px] font-semibold"
                style={{ color: "#ffffff" }}
            >
                {label}
            </span>
        </button>
    );
}