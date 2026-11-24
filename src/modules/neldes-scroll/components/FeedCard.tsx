// src/modules/neldes-scroll/components/FeedCard.tsx
// ============================================================
// Neldes Scroll — one post card.
// Image: full-fit (object-contain) with blurred backdrop.
// ============================================================

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FeedCardProps } from "./types";
import { CardActions } from "./CardActions";
import { useMarkSeen } from "../hooks/useMarkSeen";
import { usePostInteraction } from "../hooks/usePostInteraction";
import { cardImageUrl } from "../lib/cloudinary";
import { NELDES_COLORS } from "../config/constants";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MoreHorizontal, Plus } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
    meme: "Meme",
    news: "News",
    job: "Job",
    promo: "Medrae",
};

const TYPE_COLOR: Record<string, string> = {
    meme: "bg-rose-500/90",
    news: "bg-blue-500/90",
    job: "bg-emerald-500/90",
    promo: "bg-amber-500/90",
};

export function FeedCard({
    post,
    onUpdate,
    onOpenComments,
    onOpenShare,
    onVisible,
    onRegisterShare,
    onOpenOwnerMenu,
    currentUserId,
    onCreate,
    index,
}: FeedCardProps) {
    const seenRef = useMarkSeen(post.id);
    const lastTapRef = useRef<number>(0);
    const [heartPop, setHeartPop] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const {
        toggleLike,
        toggleSave,
        share,
        download,
        sharing,
        downloading,
    } = usePostInteraction({ post, onUpdate });

    // Expose this card's share() to the parent whenever this card becomes active.
    useEffect(() => {
        if (!onRegisterShare) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && entries[0].intersectionRatio > 0.6) {
                    onRegisterShare(share);
                }
            },
            { threshold: [0.6] }
        );
        if (cardRef.current) observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, [share, onRegisterShare]);

    const handleImageTap = useCallback(() => {
        const now = Date.now();
        const gap = now - lastTapRef.current;
        lastTapRef.current = now;
        if (gap < 300) {
            if (!post.is_liked) toggleLike();
            setHeartPop(true);
            setTimeout(() => setHeartPop(false), 700);
        }
    }, [post.is_liked, toggleLike]);

    const handleIntersect = useCallback(() => {
        onVisible(index);
    }, [onVisible, index]);

    const imageSrc = cardImageUrl(post.image_url);

    return (
        <div
            ref={(el) => {
                (seenRef as any).current = el;
                cardRef.current = el;
            }}
            data-post-id={post.id}
            className="relative w-full h-full snap-start snap-always overflow-hidden flex flex-col"
            style={{ backgroundColor: NELDES_COLORS.bg }}
            onTouchStart={handleIntersect}
        >
            <div
                className="absolute inset-0 overflow-hidden"
                onClick={handleImageTap}
                role="button"
                tabIndex={0}
                style={{ touchAction: "manipulation" }}
            >
                {imageSrc ? (
                    <>
                        {/* Blurred backdrop fills empty space around portrait/landscape images */}
                        <img
                            src={imageSrc}
                            alt=""
                            aria-hidden
                            className="absolute inset-0 w-full h-full object-cover select-none"
                            style={{
                                filter: "blur(28px) brightness(0.4)",
                                transform: "scale(1.15)",
                            }}
                            draggable={false}
                        />
                        {/* Foreground — whole image, no crop, no stretch */}
                        <img
                            src={imageSrc}
                            alt={post.title || "Medrae post"}
                            className="relative w-full h-full object-contain select-none"
                            draggable={false}
                            loading="lazy"
                        />
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#161b22]">
                        <span className="text-[#8b949e] text-sm">No image</span>
                    </div>
                )}

                <div
                    className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
                    style={{
                        background:
                            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 100%)",
                    }}
                />
            </div>

            <AnimatePresence>
                {heartPop && (
                    <motion.div
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1.15, opacity: 1 }}
                        exit={{ scale: 1.3, opacity: 0 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                    >
                        <svg width="110" height="110" viewBox="0 0 24 24" fill={NELDES_COLORS.heart}>
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute top-3 left-3 z-10">
                <Badge
                    className={`${TYPE_COLOR[post.type]} text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-0`}
                >
                    {TYPE_LABEL[post.type]}
                </Badge>
            </div>
            {/* Owner menu — only visible to the post author */}
            {currentUserId && post.author_id === currentUserId && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenOwnerMenu(post);
                    }}
                    aria-label="Post options"
                    className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    style={{
                        backgroundColor: "rgba(0,0,0,0.45)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        touchAction: "manipulation",
                    }}
                >
                    <MoreHorizontal className="w-5 h-5 text-white" strokeWidth={2.4} />
                </button>
            )}
            <div className="absolute right-2 bottom-24 z-10">
                <CardActions
                    post={post}
                    onLike={toggleLike}
                    onSave={toggleSave}
                    onComment={() => onOpenComments(post)}
                    onShare={() => onOpenShare(post)}
                    onDownload={download}
                    sharing={sharing}
                    downloading={downloading}
                />
            </div>

            <div className="relative z-10 mt-auto px-4 pb-6 pr-20">
                <div className="flex items-center gap-2 mb-2">
                    {post.author_avatar ? (
                        <img
                            src={post.author_avatar}
                            alt={post.author_name}
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                    ) : (
                        <div className="w-7 h-7 rounded-full bg-[#30363d] flex items-center justify-center text-[11px] font-bold text-[#f0f6fc] shrink-0">
                            {post.author_name?.[0]?.toUpperCase() ?? "M"}
                        </div>
                    )}
                    <span
                        className="text-[13px] font-semibold truncate flex-1"
                        style={{ color: NELDES_COLORS.textPrimary }}
                    >
                        {post.author_name}
                    </span>

                    {/* Post-mine shortcut — inline, right of author name */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCreate();
                        }}
                        aria-label="Create post"
                        className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full active:scale-95 transition-transform shrink-0"
                        style={{
                            backgroundColor: NELDES_COLORS.accent,
                            touchAction: "manipulation",
                        }}
                    >
                        <Plus className="w-3.5 h-3.5 text-white" strokeWidth={2.8} />
                        <span className="text-[11px] font-bold text-white">Post</span>
                    </button>
                </div>
                {post.title && (
                    <h3
                        className="text-[15px] font-bold leading-snug mb-1 line-clamp-2"
                        style={{ color: NELDES_COLORS.textPrimary }}
                    >
                        {post.title}
                    </h3>
                )}

                {post.caption && (
                    <p
                        className="text-[13px] leading-snug line-clamp-3"
                        style={{ color: NELDES_COLORS.textSecondary }}
                    >
                        {post.caption}
                    </p>
                )}

                {post.link_url && (
                    <a
                        href={post.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-[12px] font-semibold"
                        style={{ color: NELDES_COLORS.accent }}
                    >
                        Open link <ExternalLink className="w-3 h-3" />
                    </a>
                )}
            </div>
        </div>
    );
}