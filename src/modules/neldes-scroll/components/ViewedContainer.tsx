// src/modules/neldes-scroll/components/ViewedContainer.tsx
import { useEffect, useRef } from "react";
import { Loader2, Eye, Heart, MessageCircle, Bookmark } from "lucide-react";
import type { ViewedPost } from "../lib/supabase-memes";
import type { FeedPost } from "../types";
import { NELDES_COLORS } from "../config/constants";
import { cardImageUrl } from "../lib/cloudinary";

interface ViewedContainerProps {
    posts: ViewedPost[];
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
    hasMore: boolean;
    onLoadMore: () => void;
    onRefresh: () => void;
    onOpenComments: (post: FeedPost) => void;
    onOpenShare: (post: FeedPost) => void;
    onOpenPost: (post: FeedPost) => void;   // ← NEW
}

export function ViewedContainer({
    posts,
    loading,
    loadingMore,
    error,
    hasMore,
    onLoadMore,
    onRefresh,
    onOpenComments,
    onOpenShare,
    onOpenPost,   // ← NEW
}: ViewedContainerProps) {
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!sentinelRef.current) return;
        const obs = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) onLoadMore();
            },
            { rootMargin: "400px" }
        );
        obs.observe(sentinelRef.current);
        return () => obs.disconnect();
    }, [hasMore, loadingMore, onLoadMore]);

    if (loading && posts.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: NELDES_COLORS.bg }}>
                <Loader2 className="w-6 h-6 animate-spin" color={NELDES_COLORS.accent} />
            </div>
        );
    }

    if (error && posts.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center px-8 text-center"
                style={{ backgroundColor: NELDES_COLORS.bg }}>
                <p className="text-[14px] font-semibold mb-3" style={{ color: NELDES_COLORS.heart }}>
                    Something went wrong
                </p>
                <button onClick={onRefresh}
                    className="px-4 h-9 rounded-full text-[13px] font-semibold text-white"
                    style={{ backgroundColor: NELDES_COLORS.accent }}>
                    Try again
                </button>
            </div>
        );
    }

    if (!loading && posts.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center px-8 text-center"
                style={{ backgroundColor: NELDES_COLORS.bg }}>
                <div className="w-16 h-16 rounded-full bg-[#161b22] flex items-center justify-center mb-4">
                    <Eye className="w-8 h-8" color={NELDES_COLORS.textSecondary} />
                </div>
                <p className="text-[15px] font-semibold mb-1"
                    style={{ color: NELDES_COLORS.textPrimary }}>
                    Nothing here yet
                </p>
                <p className="text-[13px]" style={{ color: NELDES_COLORS.textSecondary }}>
                    Posts you like, comment on or view will appear here.
                </p>
            </div>
        );
    }

    return (
        <div
            className="w-full h-full overflow-y-auto pt-16 pb-8 px-2"
            style={{ backgroundColor: NELDES_COLORS.bg }}
        >
            <div className="max-w-5xl mx-auto grid grid-cols-3 gap-1 sm:gap-2">
                {posts.map((p) => (
                    <div
                        key={p.id}
                        onClick={() => onOpenPost(p)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") onOpenPost(p);
                        }}
                        className="relative aspect-[9/16] rounded-lg overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                        style={{ backgroundColor: "#161b22", touchAction: "manipulation" }}
                    >
                        {p.image_url ? (
                            <img
                                src={cardImageUrl(p.image_url)}
                                alt={p.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#6e7681] text-[11px]">
                                No image
                            </div>
                        )}

                        {/* Bottom info overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-1.5"
                            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)" }}>
                            <div className="flex items-center gap-2 text-white text-[10px] font-semibold">
                                {p.is_liked && <Heart className="w-3 h-3 fill-[#f85149] text-[#f85149]" />}
                                {p.is_saved && <Bookmark className="w-3 h-3 fill-[#58a6ff] text-[#58a6ff]" />}
                                {p.comments_count > 0 && (
                                    <span className="flex items-center gap-0.5">
                                        <MessageCircle className="w-3 h-3" />
                                        {p.comments_count}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {loadingMore && (
                <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin" color={NELDES_COLORS.accent} />
                </div>
            )}

            <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
        </div>
    );
}